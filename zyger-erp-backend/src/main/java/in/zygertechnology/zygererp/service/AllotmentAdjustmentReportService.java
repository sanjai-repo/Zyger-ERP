package in.zygertechnology.zygererp.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Stock Allotment & Adjustment Modules FRS v1.0 §11 — reports.
 *
 * <ol start="7">
 *   <li>Allotment Register</li>
 *   <li>Allotment Ageing</li>
 *   <li>Release Register</li>
 *   <li>Amendment Analysis</li>
 *   <li>Pending Approval (ageing)</li>
 *   <li>Physical Variance</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class AllotmentAdjustmentReportService {

    @PersistenceContext
    private final EntityManager em;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllotmentRegister(String startDate, String endDate, String status) {
        return collect("StockAllotment", startDate, endDate, status, null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllotmentAgeing() {
        List<Map<String, Object>> out = new ArrayList<>();
        List<?> docs = em.createQuery("select d from StockAllotment d where d.deleted = false and d.status = 'APPROVED'").getResultList();
        LocalDate today = LocalDate.now();
        for (Object d : docs) {
            Map<String, Object> r = base(d, "stock-allotment");
            LocalDate created = createdDate(d);
            long age = created == null ? 0 : ChronoUnit.DAYS.between(created, today);
            r.put("ageingDays", age);
            r.put("ageingBucket", age <= 7 ? "0-7 days" : age <= 15 ? "8-15 days" : age <= 30 ? "16-30 days" : "Over 30 days");
            r.put("allottedQty", sumQty(d, "getAllottedQty"));
            out.add(r);
        }
        out.sort((a, b) -> Long.compare((Long) b.get("ageingDays"), (Long) a.get("ageingDays")));
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getReleaseRegister(String startDate, String endDate, String status) {
        return collect("StockRelease", startDate, endDate, status, "getAllotmentNo");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAmendmentAnalysis(String type, String startDate, String endDate, String reasonCode) {
        List<Map<String, Object>> out = new ArrayList<>();
        boolean stock = type == null || type.isBlank() || "ALL".equalsIgnoreCase(type) || "stock-amendment".equalsIgnoreCase(type);
        boolean physical = type == null || type.isBlank() || "ALL".equalsIgnoreCase(type) || "physical-stock-amendment".equalsIgnoreCase(type);
        if (stock) out.addAll(collect("StockAmendment", startDate, endDate, null, null));
        if (physical) out.addAll(collect("PhysicalStockAmendment", startDate, endDate, null, null));
        List<Map<String, Object>> filtered = out.stream().filter(r -> {
            if (reasonCode != null && !reasonCode.isBlank() && !String.valueOf(r.get("reasonCode")).equalsIgnoreCase(reasonCode)) return false;
            return true;
        }).collect(Collectors.toList());
        filtered.sort((a, b) -> String.valueOf(b.get("docDate")).compareTo(String.valueOf(a.get("docDate"))));
        return filtered;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPendingApproval(String module) {
        List<Map<String, Object>> out = new ArrayList<>();
        boolean all = module == null || module.isBlank() || "ALL".equalsIgnoreCase(module);
        if (all || "physical-stock-amendment".equalsIgnoreCase(module) || "adjustment".equalsIgnoreCase(module)) {
            out.addAll(pending("StockAmendment"));
            out.addAll(pending("PhysicalStockAmendment"));
        }
        if (all || "allotment".equalsIgnoreCase(module)) {
            out.addAll(pending("StockAllotment"));
        }
        LocalDate today = LocalDate.now();
        for (Map<String, Object> r : out) {
            LocalDate created = (LocalDate) r.get("__created");
            long age = created == null ? 0 : ChronoUnit.DAYS.between(created, today);
            r.put("ageingDays", age);
            r.put("ageingBucket", age <= 7 ? "0-7 days" : age <= 15 ? "8-15 days" : age <= 30 ? "16-30 days" : "Over 30 days");
            r.remove("__created");
        }
        out.sort((a, b) -> Long.compare((Long) b.get("ageingDays"), (Long) a.get("ageingDays")));
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPhysicalVariance(String location, String itemCode) {
        List<Map<String, Object>> out = new ArrayList<>();
        List<?> docs = em.createQuery("select d from PhysicalStockAmendment d where d.deleted = false and d.status = 'POSTED'").getResultList();
        for (Object d : docs) {
            String loc = value(d, "getStoreLocation") == null ? "" : String.valueOf(value(d, "getStoreLocation"));
            if (location != null && !location.isBlank() && !loc.equals(location)) continue;
            for (Object line : linesOf(d)) {
                String item = String.valueOf(value(line, "getItemCode"));
                if (itemCode != null && !itemCode.isBlank() && !item.equals(itemCode)) continue;
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("amendmentNo", String.valueOf(value(d, "getDocNo")));
                r.put("docDate", dateStr(value(d, "getDocDate")));
                r.put("location", loc);
                r.put("countTeam", value(d, "getCountTeam"));
                r.put("countSheetNo", value(d, "getCountSheetNo"));
                r.put("itemCode", item);
                Object sysQ = value(line, "getSystemQty");
                Object physQ = value(line, "getPhysicalQty");
                BigDecimal system = sysQ == null ? BigDecimal.ZERO : new BigDecimal(String.valueOf(sysQ));
                BigDecimal physical = physQ == null ? BigDecimal.ZERO : new BigDecimal(String.valueOf(physQ));
                BigDecimal variance = physical.subtract(system);
                BigDecimal pct = system.compareTo(BigDecimal.ZERO) == 0
                        ? (physical.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(100))
                        : variance.divide(system, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
                r.put("systemQty", sysQ);
                r.put("physicalQty", physQ);
                r.put("varianceQty", variance);
                r.put("variancePct", pct);
                out.add(r);
            }
        }
        return out;
    }

    // ── helpers ────────────────────────────────────────────────

    private List<Map<String, Object>> collect(String entity, String startDate, String endDate, String status, String extraCol) {
        List<Map<String, Object>> out = new ArrayList<>();
        StringBuilder hql = new StringBuilder("select d from " + entity + " d where d.deleted = false");
        if (status != null && !status.isBlank()) hql.append(" and d.status = :status");
        Map<String, Object> params = new HashMap<>();
        if (status != null && !status.isBlank()) params.put("status", status);
        var q = em.createQuery(hql.toString());
        params.forEach(q::setParameter);
        for (Object d : q.getResultList()) {
            Map<String, Object> r = base(d, entityToKey(entity));
            if (extraCol != null) {
                Object v = value(d, extraCol);
                r.put("referenceNo", v == null ? "" : v);
            }
            r.put("reasonCode", value(d, "getReasonCode"));
            r.put("totalQty", sumQty(d, entityToKey(entity)));
            out.add(r);
        }
        LocalDate start = startDate == null || startDate.isBlank() ? null : LocalDate.parse(startDate);
        LocalDate end = endDate == null || endDate.isBlank() ? null : LocalDate.parse(endDate);
        return out.stream().filter(r -> {
            LocalDate dd = r.get("docDate") == null || String.valueOf(r.get("docDate")).isBlank()
                    ? null : LocalDate.parse(String.valueOf(r.get("docDate")));
            if (start != null && (dd == null || dd.isBefore(start))) return false;
            if (end != null && (dd == null || dd.isAfter(end))) return false;
            return true;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> pending(String entity) {
        List<Map<String, Object>> out = new ArrayList<>();
        List<?> docs = em.createQuery("select d from " + entity + " d where d.deleted = false and d.status = 'SUBMITTED'").getResultList();
        for (Object d : docs) {
            Map<String, Object> r = base(d, entityToKey(entity));
            r.put("__created", createdDate(d));
            out.add(r);
        }
        return out;
    }

    private Map<String, Object> base(Object d, String typeKey) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("id", value(d, "getId"));
        r.put("docNo", value(d, "getDocNo"));
        r.put("status", value(d, "getStatus"));
        r.put("docDate", dateStr(value(d, "getDocDate")));
        r.put("typeKey", typeKey);
        r.put("itemCode", value(d, "getItemCode"));
        r.put("location", first(d, "getLocation", "getSourceLocation", "getStoreLocation"));
        r.put("party", first(d, "getCustomer", "getParty"));
        return r;
    }

    private String entityToKey(String entity) {
        return switch (entity) {
            case "StockAllotment" -> "stock-allotment";
            case "StockRelease" -> "stock-release";
            case "StockAmendment" -> "stock-amendment";
            default -> "physical-stock-amendment";
        };
    }

    private Collection<?> linesOf(Object d) {
        Object lines = value(d, "getLines");
        return lines instanceof Collection<?> c ? c : List.of();
    }

    private double sumQty(Object d, String typeKey) {
        // header-only amendment types (stock-amendment) carry quantities on the header
        if ("stock-amendment".equals(typeKey)) {
            Object diff = value(d, "getDifferenceQty");
            return diff instanceof Number n ? n.doubleValue() : 0;
        }
        return linesOf(d).stream().mapToDouble(l -> {
            Object q = value(l, "getQty");
            return q instanceof Number n ? n.doubleValue() : 0;
        }).sum();
    }

    private LocalDate createdDate(Object d) {
        Object inst = value(d, "getCreatedAt");
        if (inst instanceof java.time.Instant i) return i.atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        return null;
    }

    private Object value(Object o, String getter) {
        if (o == null) return null;
        try { return o.getClass().getMethod(getter).invoke(o); }
        catch (Exception e) { return null; }
    }

    private String first(Object o, String... getters) {
        for (String g : getters) {
            Object v = value(o, g);
            if (v != null && !String.valueOf(v).isBlank()) return String.valueOf(v);
        }
        return "";
    }

    private String dateStr(Object o) { return o == null ? "" : o.toString(); }
}
