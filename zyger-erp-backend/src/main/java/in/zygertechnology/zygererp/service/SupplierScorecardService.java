package in.zygertechnology.zygererp.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * §4.7: Supplier quality scorecard — materialized view refresh + query service.
 */
@Service
@RequiredArgsConstructor
public class SupplierScorecardService {

    private final EntityManager em;

    @Transactional
    public void refresh() {
        em.createNativeQuery("REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_quality_scorecard").executeUpdate();
        em.createNativeQuery("REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_scorecard_monthly").executeUpdate();
    }

    public List<Map<String, Object>> getMonthlyScorecard(String supplierCode, int months) {
        String sql = """
            SELECT supplier_code, month_bucket, ncr_count, critical_count, avg_ppm, blended_ppm,
                   total_rejected, plant_id
            FROM supplier_scorecard_monthly
            WHERE (:supplier IS NULL OR supplier_code = :supplier)
              AND month_bucket >= NOW() - (:months || ' months')::interval
            ORDER BY month_bucket DESC, supplier_code
            """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("supplier", supplierCode)
                .setParameter("months", months)
                .getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("supplierCode", r[0]);
            m.put("monthBucket", r[1]);
            m.put("ncrCount", r[2]);
            m.put("criticalCount", r[3]);
            m.put("avgPpm", r[4]);
            m.put("blendedPpm", r[5]);
            m.put("totalRejected", r[6]);
            m.put("plantId", r[7]);
            result.add(m);
        }
        return result;
    }

    public List<Map<String, Object>> getNcrDetails(String supplierCode) {
        String sql = """
            SELECT ncr_number, ncr_date, severity, ncr_status, affected_item,
                   rejected_quantity, total_quantity, ppm_rejected, root_cause
            FROM supplier_quality_scorecard
            WHERE (:supplier IS NULL OR supplier_code = :supplier)
            ORDER BY ncr_date DESC
            LIMIT 100
            """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("supplier", supplierCode)
                .getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ncrNumber", r[0]);
            m.put("ncrDate", r[1]);
            m.put("severity", r[2]);
            m.put("ncrStatus", r[3]);
            m.put("affectedItem", r[4]);
            m.put("rejectedQuantity", r[5]);
            m.put("totalQuantity", r[6]);
            m.put("ppmRejected", r[7]);
            m.put("rootCause", r[8]);
            result.add(m);
        }
        return result;
    }

    @Transactional
    public void updateSupplierPerformanceMatrix(String supplierCode) {
        if (supplierCode == null || supplierCode.isBlank()) return;
        try {
            // Update Party / Vendor Master quality acceptance rate & overall supplier grade
            String sql = """
                UPDATE party_master p
                SET quality_acceptance_rate = COALESCE((
                    SELECT ROUND(CAST((SUM(CASE WHEN status <> 'REJECTED' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)) AS NUMERIC), 2)
                    FROM quality_inspection qi WHERE qi.source_number IN (SELECT doc_no FROM purchase_order WHERE supplier_code = :supplier OR supplier = :supplier)
                ), 100.00),
                overall_supplier_grade = CASE
                    WHEN COALESCE((SELECT COUNT(*) FROM quality_ncr WHERE source_number IN (SELECT doc_no FROM purchase_order WHERE supplier_code = :supplier OR supplier = :supplier)), 0) > 5 THEN 'D'
                    WHEN COALESCE((SELECT COUNT(*) FROM quality_ncr WHERE source_number IN (SELECT doc_no FROM purchase_order WHERE supplier_code = :supplier OR supplier = :supplier)), 0) > 2 THEN 'C'
                    WHEN COALESCE((SELECT COUNT(*) FROM quality_ncr WHERE source_number IN (SELECT doc_no FROM purchase_order WHERE supplier_code = :supplier OR supplier = :supplier)), 0) > 0 THEN 'B'
                    ELSE 'A'
                END,
                approved_vendor_status = CASE
                    WHEN COALESCE((SELECT COUNT(*) FROM quality_ncr WHERE source_number IN (SELECT doc_no FROM purchase_order WHERE supplier_code = :supplier OR supplier = :supplier)), 0) > 5 THEN 'CONDITIONAL'
                    ELSE approved_vendor_status
                END
                WHERE p.code = :supplier OR p.legal_name = :supplier
                """;
            em.createNativeQuery(sql).setParameter("supplier", supplierCode).executeUpdate();
        } catch (Exception e) {
            // Fail safe logging
        }
    }

    @Scheduled(cron = "${zyger.scheduling.scorecard-refresh:0 0 2 * * *}")
    public void nightlyRefresh() {
        try {
            refresh();
        } catch (Exception e) {
            // Matview may not exist yet or may be locked
        }
    }
}
