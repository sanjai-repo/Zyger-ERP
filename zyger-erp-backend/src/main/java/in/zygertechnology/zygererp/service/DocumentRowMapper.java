package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.PartyRepository;
import in.zygertechnology.zygererp.repo.SupplierInvoiceAttachmentRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.*;

/**
 * Handles conversion of document entities to row representations.
 * Extracted from DocumentFacade for single responsibility.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentRowMapper {

    private final ObjectMapper mapper;
    private final ItemCacheService itemCache;
    private final PartyRepository parties;
    private final SupplierInvoiceAttachmentRepository attachments;
    private final DocumentWorkflowEngine workflowEngine;

    // Line field normalization maps
    private static final Map<String, Map<String, String>> LINE_RENAME = Map.of(
        "sales-order", Map.of(
            "qty", "orderQty",
            "taxCode", "tax",
            "revisionLevel", "drawingRevision",
            "targetDeliveryDate", "requiredDeliveryDate"
        ),
        "proforma-invoice", Map.of(
            "taxCode", "tax",
            "lineRemark", "remarks"
        ),
        "sales-dc", Map.of(
            "dispatchQty", "currentDispatchQty",
            "heatNumber", "heatNo",
            "lineRemark", "remarks"
        ),
        "sales-invoice", Map.of(
            "billedQty", "qty",
            "taxCode", "tax"
        ),
        "po-inward", Map.of("qty", "receivedQty"),
        "lo-inward", Map.of("qty", "receivedQty"),
        "jo-inward", Map.of("qty", "producedQty"),
        "general-inward", Map.of("qty", "receivedQty"),
        "dc-return", Map.of(
            "batchNumber", "batchNo",
            "heatNumber", "heatNo",
            "lineRemark", "remarks",
            "disposition", "materialCondition"
        ),
        "invoice-return", Map.of(
            "batchNumber", "batchNo",
            "heatNumber", "heatNo",
            "lineRemark", "remarks",
            "disposition", "materialCondition"
        )
    );

    /**
     * Convert entity to row representation.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> toRow(DocEntity e, String docKey) {
        Map<String, Object> converted = mapper.convertValue(e, new TypeReference<Map<String, Object>>() {});
        final Map<String, Object> r = converted != null ? converted : new LinkedHashMap<>();
        String dStr = e.getDocDate() == null ? "" : e.getDocDate().toString();
        r.put("date", dStr);
        r.put("docDate", dStr);
        r.putIfAbsent("orderDate", dStr);
        r.putIfAbsent("piDate", dStr);
        r.putIfAbsent("dcDate", dStr);
        r.putIfAbsent("invoiceDate", dStr);
        r.putIfAbsent("returnDate", dStr);
        if (r.get("notes") != null && r.get("remarks") == null) r.put("remarks", r.get("notes"));
        if (r.get("remarks") != null && r.get("notes") == null) r.put("notes", r.get("remarks"));
        r.put("id", e.getId());

        List<? extends LineEntity> L = e.getLines();
        r.put("qty", L.stream().mapToDouble(l -> l.getQty().doubleValue()).sum());
        r.put("totalAmount", L.stream()
                .mapToDouble(l -> (l.getRate() == null ? 0 : l.getRate().doubleValue()) * l.getQty().doubleValue()).sum());

        List<Map<String, Object>> lineRows = new ArrayList<>();
        for (LineEntity l : L) {
            Map<String, Object> lm = mapper.convertValue(l, new TypeReference<Map<String, Object>>() {});
            if (lm == null) lm = new LinkedHashMap<>();
            lm.remove("doc");
            lm.put("itemDesc", itemCache.findByCode(l.getItemCode())
                    .map(ItemMaster::getDescription).orElse(""));
            lineRows.add(lm);
        }
        r.put("lines", lineRows);
        if (!L.isEmpty()) {
            LineEntity first = L.get(0);
            r.putIfAbsent("firstItemCode", first.getItemCode());
            itemCache.findByCode(first.getItemCode())
                    .ifPresent(i -> r.putIfAbsent("firstItemName", i.getDescription()));
        }
        r.putIfAbsent("itemCode", r.get("firstItemCode"));
        r.putIfAbsent("itemName", r.get("firstItemName"));
        r.putIfAbsent("reference", firstOf(r,
                "purchaseOrderNo", "jobOrderNo", "labourOrderNo", "issueRequestNo",
                "allotmentNo", "originalDocumentNo", "linkedDocumentNo", "challanNo",
                "supplierInvoiceNo", "referenceNo", "originalReceiptNo"));
        r.putIfAbsent("party", firstOf(r,
                "supplier", "vendor", "customer", "party", "toParty",
                "supplierName", "vendorName", "customerName", "partyName"));

        // Enrich supplier enquiry with party data
        if (e instanceof SupplierEnquiry se) {
            enrichSupplierEnquiry(r, se);
        }
        if (e instanceof PurchaseOrder po) {
            enrichPurchaseOrder(r, po);
        }

        denormalizeLines(r, docKey);

        // Enrich with workflow allowed transitions
        if (e.getStatus() != null) {
            String upperDocKey = docKey.toUpperCase().replace("-", "_");
            workflowEngine.enrich(upperDocKey, e.getStatus(), r);
        }

        return r;
    }

    private void enrichSupplierEnquiry(Map<String, Object> r, SupplierEnquiry se) {
        String supp = se.getSupplier();
        String code = se.getSupplierCode();
        String cp = se.getContactPerson();
        String ph = se.getPhone();
        String emStr = se.getEmail();

        if (se.getSuppliers() != null && !se.getSuppliers().isEmpty()) {
            SupplierEnquirySupplier first = se.getSuppliers().get(0);
            if (supp == null || supp.isBlank()) supp = first.getSupplierName();
            if (code == null || code.isBlank()) code = first.getSupplierCode();
            if (cp == null || cp.isBlank()) cp = first.getContactPerson();
            if (ph == null || ph.isBlank()) ph = first.getPhone();
            if (emStr == null || emStr.isBlank()) emStr = first.getEmail();
        }

        if ((cp == null || cp.isBlank() || ph == null || ph.isBlank() || emStr == null || emStr.isBlank()) && supp != null && !supp.isBlank()) {
            Optional<Party> pOpt = parties.findByName(supp);
            if (pOpt.isPresent()) {
                Party p = pOpt.get();
                if (code == null || code.isBlank()) code = p.getCode();
                if (cp == null || cp.isBlank()) cp = p.getContactPerson();
                if (ph == null || ph.isBlank()) ph = p.getPhone() != null ? p.getPhone() : p.getMobile();
                if (emStr == null || emStr.isBlank()) emStr = p.getEmail();
            }
        }

        if (supp != null) r.put("supplier", supp);
        if (code != null) r.put("supplierCode", code);
        if (cp != null) r.put("contactPerson", cp);
        if (ph != null) r.put("phone", ph);
        if (emStr != null) r.put("email", emStr);
    }

    private void enrichPurchaseOrder(Map<String, Object> r, PurchaseOrder po) {
        String supp = po.getSupplier();
        String code = po.getSupplierCode();
        String cp = po.getContactPerson();
        String ph = po.getPhone();
        String emStr = po.getEmail();

        if ((cp == null || cp.isBlank() || ph == null || ph.isBlank() || emStr == null || emStr.isBlank()) && supp != null && !supp.isBlank()) {
            Optional<Party> pOpt = parties.findByName(supp);
            if (pOpt.isPresent()) {
                Party p = pOpt.get();
                if (code == null || code.isBlank()) code = p.getCode();
                if (cp == null || cp.isBlank()) cp = p.getContactPerson();
                if (ph == null || ph.isBlank()) ph = p.getPhone() != null ? p.getPhone() : p.getMobile();
                if (emStr == null || emStr.isBlank()) emStr = p.getEmail();
            }
        }

        if (supp != null) r.put("supplier", supp);
        if (code != null) r.put("supplierCode", code);
        if (cp != null) r.put("contactPerson", cp);
        if (ph != null) r.put("phone", ph);
        if (emStr != null) r.put("email", emStr);
    }

    @SuppressWarnings("unchecked")
    public void normalizeLines(Map<String, Object> body, String key) {
        Object linesObj = body.get("lines");
        if (!(linesObj instanceof List)) return;
        List<Map<String, Object>> lines = (List<Map<String, Object>>) linesObj;
        Map<String, String> renames = LINE_RENAME.getOrDefault(key, Map.of());
        for (Map<String, Object> line : lines) {
            if ("sales-invoice".equals(key) && line.containsKey("batchHeatNumber")) {
                Object bhn = line.remove("batchHeatNumber");
                if (bhn != null && !String.valueOf(bhn).isEmpty()) {
                    String[] parts = String.valueOf(bhn).split("/", 2);
                    line.put("batchNo", parts[0].trim());
                    if (parts.length > 1 && !parts[1].trim().isEmpty())
                        line.put("heatNo", parts[1].trim());
                }
            }
            for (Map.Entry<String, String> e : renames.entrySet()) {
                if (line.containsKey(e.getKey())) {
                    Object val = line.remove(e.getKey());
                    if ("tax".equals(e.getValue()) && val instanceof String s) {
                        val = parseTaxRate(s);
                    }
                    line.put(e.getValue(), val);
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    public void denormalizeLines(Map<String, Object> row, String key) {
        Object linesObj = row.get("lines");
        if (!(linesObj instanceof List)) return;
        List<Map<String, Object>> lines = (List<Map<String, Object>>) linesObj;
        Map<String, String> renames = LINE_RENAME.getOrDefault(key, Map.of());
        for (Map.Entry<String, String> e : renames.entrySet()) {
            for (Map<String, Object> line : lines) {
                if (line.containsKey(e.getValue())) {
                    Object val = line.remove(e.getValue());
                    if ("tax".equals(e.getValue()) && val != null) {
                        try {
                            double rate = Double.parseDouble(String.valueOf(val));
                            val = rate == 0 ? "Exempt" : "GST " + (int) rate + "%";
                        } catch (Exception ignored) {}
                    }
                    line.put(e.getKey(), val);
                }
            }
        }
        if ("sales-invoice".equals(key)) {
            for (Map<String, Object> line : lines) {
                String batchNo = line.containsKey("batchNo") ? String.valueOf(line.get("batchNo")) : "";
                String heatNo = line.containsKey("heatNo") ? String.valueOf(line.get("heatNo")) : "";
                line.remove("batchNo");
                line.remove("heatNo");
                String combined = "";
                if (!batchNo.isEmpty() && !"null".equals(batchNo)) combined = batchNo;
                if (!heatNo.isEmpty() && !"null".equals(heatNo)) {
                    combined = combined.isEmpty() ? heatNo : combined + "/" + heatNo;
                }
                line.put("batchHeatNumber", combined);
            }
        }
    }

    private BigDecimal parseTaxRate(String taxCode) {
        if (taxCode == null || taxCode.isEmpty() || "Exempt".equalsIgnoreCase(taxCode))
            return BigDecimal.ZERO;
        String num = taxCode.replaceAll("[^0-9.]", "");
        if (num.isEmpty()) return BigDecimal.ZERO;
        try { return new BigDecimal(num); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private String firstOf(Map<String, Object> r, String... keys) {
        for (String k : keys) {
            Object v = r.get(k);
            if (v != null && !String.valueOf(v).isEmpty()) return String.valueOf(v);
        }
        return "";
    }
}
