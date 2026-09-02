package in.zygertechnology.zygererp.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * §8.6: Machine cost roll-up — materialized view refresh + query service.
 */
@Service
@RequiredArgsConstructor
public class CostRollupService {

    private final EntityManager em;

    @Transactional
    public void refresh() {
        em.createNativeQuery("REFRESH MATERIALIZED VIEW CONCURRENTLY machine_cost_summary").executeUpdate();
    }

    public List<Map<String, Object>> getCostSummary(String machineCode, int months) {
        String sql = """
            SELECT machine_code, month_bucket, breakdown_count, breakdown_cost, breakdown_spare_cost,
                   pm_cost, total_cost, plant_id
            FROM machine_cost_summary
            WHERE (:machine IS NULL OR machine_code = :machine)
              AND month_bucket >= NOW() - (:months || ' months')::interval
            ORDER BY month_bucket DESC, total_cost DESC
            """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("machine", machineCode)
                .setParameter("months", months)
                .getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("machineCode", r[0]);
            m.put("monthBucket", r[1]);
            m.put("breakdownCount", r[2]);
            m.put("breakdownCost", r[3]);
            m.put("breakdownSpareCost", r[4]);
            m.put("pmCost", r[5]);
            m.put("totalCost", r[6]);
            m.put("plantId", r[7]);
            result.add(m);
        }
        return result;
    }

    public Map<String, Object> getTcoSummary(String machineCode) {
        String sql = """
            SELECT machine_code,
                   SUM(breakdown_cost + breakdown_spare_cost) AS total_breakdown_cost,
                   SUM(pm_cost) AS total_pm_cost,
                   SUM(total_cost) AS grand_total,
                   COUNT(DISTINCT month_bucket) AS months_tracked
            FROM machine_cost_summary
            WHERE machine_code = :machine
            GROUP BY machine_code
            """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("machine", machineCode)
                .getResultList();
        if (rows.isEmpty()) return Map.of("machineCode", machineCode, "grandTotal", 0);
        Object[] r = rows.get(0);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("machineCode", r[0]);
        m.put("totalBreakdownCost", r[1]);
        m.put("totalPmCost", r[2]);
        m.put("grandTotal", r[3]);
        m.put("monthsTracked", r[4]);
        return m;
    }

    @Scheduled(cron = "${zyger.scheduling.cost-rollup-refresh:0 0 2 * * *}")
    public void nightlyRefresh() {
        try {
            refresh();
        } catch (Exception e) {
            // Matview may not exist yet
        }
    }
}
