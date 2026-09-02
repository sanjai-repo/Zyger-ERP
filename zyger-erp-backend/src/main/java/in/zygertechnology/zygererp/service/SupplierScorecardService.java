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

    @Scheduled(cron = "${zyger.scheduling.scorecard-refresh:0 0 2 * * *}")
    public void nightlyRefresh() {
        try {
            refresh();
        } catch (Exception e) {
            // Matview may not exist yet or may be locked
        }
    }
}
