package in.zygertechnology.zygererp.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Quality → Rejected Items: one read-only view of every rejection recorded across the app
 * (inward receipts, quality inspections, production, stock returns, customer returns),
 * plus the stock currently sitting in rejected/scrap/damaged/quarantine buckets.
 *
 * Each rejection event appears once. The same physical rejection is often recorded in
 * several places, so the sources below are de-duplicated:
 *   - an inward line is skipped when a quality inspection with a rejection already exists
 *     for the same inward doc + item (the inspection is the richer record),
 *   - a production entry is skipped when a production rejection document exists for it.
 */
@Service
public class RejectedItemsService {

    @PersistenceContext
    private EntityManager em;

    private static final String LIVE_HEADER = "h.deleted = false AND h.status NOT IN ('CANCELLED','REJECTED')";

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> events(Map<String, String> q) {
        List<Object[]> raw = new ArrayList<>();
        for (String inward : List.of("po_inward", "general_inward", "lo_inward", "jo_inward")) {
            raw.addAll(em.createNativeQuery(inwardSql(inward)).getResultList());
        }
        raw.addAll(em.createNativeQuery(INSPECTION_SQL).getResultList());
        raw.addAll(em.createNativeQuery(PROD_REJECTION_DOC_SQL).getResultList());
        raw.addAll(em.createNativeQuery(PROD_ENTRY_SQL).getResultList());
        raw.addAll(em.createNativeQuery(STOCK_RETURN_SQL).getResultList());
        raw.addAll(em.createNativeQuery(DC_RETURN_SQL).getResultList());
        raw.addAll(em.createNativeQuery(INVOICE_RETURN_SQL).getResultList());

        List<Map<String, Object>> rows = raw.stream().map(RejectedItemsService::toRow).collect(Collectors.toList());
        rows = applyFilters(rows, q);
        rows.sort(Comparator.comparing((Map<String, Object> r) -> String.valueOf(r.getOrDefault("sourceDate", "")))
                .reversed().thenComparing(r -> String.valueOf(r.get("sourceDocNo"))));
        return rows;
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> heldStock(Map<String, String> q) {
        List<Object[]> raw = em.createNativeQuery(
                "SELECT b.item_code, im.name, b.location, b.batch_no, b.heat_no, b.stock_status, b.qty, im.uom " +
                "FROM stock_balance b LEFT JOIN item_master im ON im.code = b.item_code " +
                "WHERE b.stock_status NOT IN ('FREE','QC_HOLD') AND b.qty > 0 " +
                "ORDER BY b.stock_status, b.item_code").getResultList();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] o : raw) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("itemCode", o[0]);
            r.put("itemName", o[1]);
            r.put("location", o[2]);
            r.put("batchNo", o[3]);
            r.put("heatNo", o[4]);
            r.put("stockStatus", o[5]);
            r.put("qty", num(o[6]));
            r.put("uom", o[7]);
            rows.add(r);
        }
        String item = q.get("itemCode");
        String loc = q.get("location");
        String st = q.get("stockStatus");
        return rows.stream()
                .filter(r -> blank(item) || contains(r.get("itemCode"), item) || contains(r.get("itemName"), item))
                .filter(r -> blank(loc) || contains(r.get("location"), loc))
                .filter(r -> blank(st) || st.equalsIgnoreCase(String.valueOf(r.get("stockStatus"))))
                .collect(Collectors.toList());
    }

    public Map<String, Object> summary(List<Map<String, Object>> rows) {
        BigDecimal totalQty = BigDecimal.ZERO;
        BigDecimal totalValue = BigDecimal.ZERO;
        Map<String, BigDecimal> byStage = new TreeMap<>();
        Map<String, BigDecimal> byParty = new HashMap<>();
        Map<String, BigDecimal> byReason = new HashMap<>();
        for (Map<String, Object> r : rows) {
            BigDecimal qty = (BigDecimal) r.get("rejectedQty");
            totalQty = totalQty.add(qty);
            BigDecimal value = (BigDecimal) r.get("value");
            if (value != null) totalValue = totalValue.add(value);
            byStage.merge(String.valueOf(r.get("stage")), qty, BigDecimal::add);
            String party = String.valueOf(r.getOrDefault("party", ""));
            if (!party.isBlank() && !"null".equals(party)) byParty.merge(party, qty, BigDecimal::add);
            String reason = String.valueOf(r.getOrDefault("reason", ""));
            if (!reason.isBlank() && !"null".equals(reason)) byReason.merge(reason, qty, BigDecimal::add);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalEvents", rows.size());
        out.put("totalQty", totalQty);
        out.put("totalValue", totalValue);
        out.put("byStage", byStage);
        out.put("byParty", ranked(byParty));
        out.put("byReason", ranked(byReason));
        out.put("topParty", firstKey(byParty));
        out.put("topReason", firstKey(byReason));
        return out;
    }

    // ---------- helpers ----------

    private static List<Map<String, Object>> ranked(Map<String, BigDecimal> m) {
        return m.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(e -> {
                    Map<String, Object> x = new LinkedHashMap<>();
                    x.put("name", e.getKey());
                    x.put("qty", e.getValue());
                    return x;
                }).collect(Collectors.toList());
    }

    private static String firstKey(Map<String, BigDecimal> m) {
        return m.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("—");
    }

    private static List<Map<String, Object>> applyFilters(List<Map<String, Object>> rows, Map<String, String> q) {
        String from = q.get("from"), to = q.get("to"), type = q.get("sourceType"), stage = q.get("stage"),
                item = q.get("itemCode"), party = q.get("party"), reason = q.get("reason"),
                loc = q.get("location"), disp = q.get("disposition"), search = q.get("search");
        return rows.stream()
                .filter(r -> blank(from) || String.valueOf(r.get("sourceDate")).compareTo(from) >= 0)
                .filter(r -> blank(to) || String.valueOf(r.get("sourceDate")).compareTo(to) <= 0)
                .filter(r -> blank(type) || type.equalsIgnoreCase(String.valueOf(r.get("sourceType"))))
                .filter(r -> blank(stage) || stage.equalsIgnoreCase(String.valueOf(r.get("stage"))))
                .filter(r -> blank(item) || contains(r.get("itemCode"), item) || contains(r.get("itemName"), item))
                .filter(r -> blank(party) || contains(r.get("party"), party))
                .filter(r -> blank(reason) || contains(r.get("reason"), reason))
                .filter(r -> blank(loc) || contains(r.get("location"), loc))
                .filter(r -> blank(disp) || contains(r.get("disposition"), disp))
                .filter(r -> blank(search) || contains(r.get("sourceDocNo"), search) || contains(r.get("itemCode"), search)
                        || contains(r.get("itemName"), search) || contains(r.get("party"), search)
                        || contains(r.get("reason"), search) || contains(r.get("batchNo"), search))
                .collect(Collectors.toList());
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }

    private static boolean contains(Object v, String needle) {
        return v != null && String.valueOf(v).toLowerCase().contains(needle.toLowerCase());
    }

    private static BigDecimal num(Object o) {
        if (o == null) return BigDecimal.ZERO;
        return o instanceof BigDecimal b ? b : new BigDecimal(String.valueOf(o));
    }

    private static String str(Object o) {
        if (o == null) return null;
        String v = String.valueOf(o);
        return v.matches("^\\d{4}-\\d{2}-\\d{2}.*") ? v.substring(0, 10) : v;
    }

    /** Column order shared by every SELECT below. */
    private static Map<String, Object> toRow(Object[] o) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("sourceType", o[0]);
        r.put("stage", o[1]);
        r.put("sourceDocNo", o[2]);
        r.put("sourceDate", str(o[3]));
        r.put("itemCode", o[4]);
        r.put("itemName", o[5]);
        r.put("batchNo", o[6]);
        r.put("location", o[7]);
        BigDecimal qty = num(o[8]);
        r.put("rejectedQty", qty);
        r.put("uom", o[9]);
        r.put("reason", o[10]);
        r.put("party", o[11]);
        BigDecimal rate = o[12] == null ? null : num(o[12]);
        r.put("rate", rate);
        r.put("value", rate == null ? null : rate.multiply(qty));
        r.put("disposition", o[13]);
        r.put("linkedRef", o[14]);
        return r;
    }

    // Column order: sourceType, stage, docNo, date, item, itemName, batch, location, qty, uom,
    //               reason, party, rate, disposition, linkedRef
    private static String inwardSql(String t) {
        String type = t.toUpperCase();
        String party = switch (t) {
            case "po_inward" -> "h.supplier";
            case "general_inward" -> "h.party";
            case "lo_inward" -> "h.vendor";
            default -> "NULL";
        };
        String inspectionLink = switch (t) {
            case "po_inward" -> "qi.po_inward_number";
            case "lo_inward" -> "qi.lo_inward_number";
            case "jo_inward" -> "qi.jo_inward_number";
            default -> "qi.source_number";
        };
        String dedupe =
                " AND NOT EXISTS (SELECT 1 FROM quality_inspection qi WHERE qi.deleted = false AND qi.rejected_quantity > 0 " +
                "AND (" + inspectionLink + " = h.doc_no OR qi.source_number = h.doc_no) AND qi.item_code = l.item_code)";
        return "SELECT '" + type + "', 'Inward', h.doc_no, h.doc_date, l.item_code, COALESCE(im.name, l.item_desc), " +
                "l.batch_no, l.location, l.rejected_qty, COALESCE(l.uom, im.uom), l.rejected_reason, " + party + ", l.rate, " +
                "NULL, NULL FROM " + t + "_line l JOIN " + t + " h ON h.id = l.doc_id " +
                "LEFT JOIN item_master im ON im.code = l.item_code " +
                "WHERE " + LIVE_HEADER + " AND l.rejected_qty > 0" + dedupe;
    }

    private static final String INSPECTION_SQL =
            "SELECT 'INSPECTION_' || h.inspection_type, 'Inspection', h.inspection_number, h.inspection_date, h.item_code, " +
            "COALESCE(im.name, h.item_description), h.batch_number, h.location, h.rejected_quantity, im.uom, " +
            "h.decision_remarks, COALESCE(po.supplier, lo.vendor), " +
            "(SELECT pl.rate FROM po_inward_line pl JOIN po_inward pp ON pp.id = pl.doc_id " +
            "WHERE pp.doc_no = COALESCE(NULLIF(h.po_inward_number,''), h.source_number) AND pl.item_code = h.item_code LIMIT 1), " +
            "COALESCE(h.final_decision, h.decision_status, h.inspection_status), " +
            "COALESCE(NULLIF(h.po_inward_number,''), NULLIF(h.lo_inward_number,''), NULLIF(h.jo_inward_number,''), h.source_number) " +
            "FROM quality_inspection h LEFT JOIN item_master im ON im.code = h.item_code " +
            "LEFT JOIN po_inward po ON po.doc_no = COALESCE(NULLIF(h.po_inward_number,''), h.source_number) AND po.deleted = false " +
            "LEFT JOIN lo_inward lo ON lo.doc_no = COALESCE(NULLIF(h.lo_inward_number,''), h.source_number) AND lo.deleted = false " +
            "WHERE h.deleted = false AND COALESCE(h.status,'') <> 'CANCELLED' " +
            "AND COALESCE(h.inspection_status,'') <> 'CANCELLED' AND h.rejected_quantity > 0";

    private static final String PROD_REJECTION_DOC_SQL =
            "SELECT 'PRODUCTION_REJECTION', 'Production', d.doc_number, CAST(d.created_at AS date), l.item_code, " +
            "COALESCE(l.item_name, im.name), l.batch_number, l.location, l.quantity, COALESCE(l.uom, im.uom), " +
            "COALESCE(l.reason_description, l.reason_code), NULL, NULL, l.disposition, d.entry_number " +
            "FROM production_rejection_line l JOIN production_rejection_doc d ON d.id = l.rejection_doc_id " +
            "LEFT JOIN item_master im ON im.code = l.item_code " +
            "WHERE COALESCE(d.is_reversal, false) = false AND d.status NOT IN ('CANCELLED','REVERSED') AND l.quantity > 0";

    private static final String PROD_ENTRY_SQL =
            "SELECT 'PRODUCTION_ENTRY', 'Production', e.entry_number, e.production_date, e.part_code, " +
            "COALESCE(im.name, e.part_description), NULL, NULL, e.rejected_quantity, COALESCE(e.uom, im.uom), " +
            "(SELECT string_agg(COALESCE(r.reason_description, r.reason_code), ', ') FROM production_entry_rejection r " +
            "WHERE r.production_entry_id = e.id), NULL, NULL, NULL, e.job_card_number " +
            "FROM production_entry e LEFT JOIN item_master im ON im.code = e.part_code " +
            "WHERE COALESCE(e.is_reversal, false) = false AND e.status NOT IN ('CANCELLED','REVERSED') " +
            "AND e.rejected_quantity > 0 " +
            "AND NOT EXISTS (SELECT 1 FROM production_rejection_doc d WHERE d.entry_number = e.entry_number " +
            "AND COALESCE(d.is_reversal, false) = false AND d.status NOT IN ('CANCELLED','REVERSED'))";

    private static final String STOCK_RETURN_SQL =
            "SELECT 'STOCK_RETURN', 'Return', h.doc_no, h.doc_date, l.item_code, im.name, l.batch_no, l.location, " +
            "l.rejected_qty, im.uom, h.reason_code, h.party, NULL, l.stock_status, h.original_document_no " +
            "FROM internal_return_line l JOIN internal_return h ON h.id = l.doc_id " +
            "LEFT JOIN item_master im ON im.code = l.item_code " +
            "WHERE " + LIVE_HEADER + " AND l.rejected_qty > 0";

    private static final String DC_RETURN_SQL =
            "SELECT 'DC_RETURN', 'Customer Return', h.doc_no, h.doc_date, l.item_code, COALESCE(l.item_name, im.name), " +
            "l.batch_no, l.location, l.returned_qty, COALESCE(l.uom, im.uom), COALESCE(l.return_reason, h.return_reason, h.reason), " +
            "h.customer, NULL, h.disposition, h.original_dc_number " +
            "FROM dc_return_line l JOIN dc_return h ON h.id = l.doc_id LEFT JOIN item_master im ON im.code = l.item_code " +
            "WHERE " + LIVE_HEADER + " AND l.returned_qty > 0 AND h.disposition IN ('REJECTED','DAMAGED','SCRAP')";

    private static final String INVOICE_RETURN_SQL =
            "SELECT 'INVOICE_RETURN', 'Customer Return', h.doc_no, h.doc_date, l.item_code, COALESCE(l.item_name, im.name), " +
            "l.batch_no, l.location, l.returned_qty, COALESCE(l.uom, im.uom), COALESCE(l.return_reason, h.return_reason, h.reason), " +
            "h.customer, l.rate, h.disposition, h.original_invoice_number " +
            "FROM invoice_return_line l JOIN invoice_return h ON h.id = l.doc_id LEFT JOIN item_master im ON im.code = l.item_code " +
            "WHERE " + LIVE_HEADER + " AND l.returned_qty > 0 AND h.disposition IN ('REJECTED','DAMAGED','SCRAP')";
}
