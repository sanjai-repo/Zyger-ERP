package in.zygertechnology.zygererp.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

/**
 * FRS §7.2/7.3: Computes WO/JobCard/Subjob quantities from Production Entry.
 * This is the system-of-record read model — never written to directly by users.
 */
@Service
public class ProductionRollupService {

    private static final Logger log = LoggerFactory.getLogger(ProductionRollupService.class);

    @PersistenceContext
    private EntityManager em;

    @Async
    @Transactional
    public void recalculateForSubjob(Long subjobId) {
        try {
            Map<String, BigDecimal> totals = computeSubjobTotals(subjobId);
            em.createNativeQuery(
                "UPDATE job_card_subjob SET " +
                "completed_qty_computed = :good, rework_qty_computed = :rework, " +
                "reject_qty_computed = :reject, scrap_qty_computed = :scrap " +
                "WHERE id = :id")
                .setParameter("good", totals.get("good_qty"))
                .setParameter("rework", totals.get("rework_qty"))
                .setParameter("reject", totals.get("reject_qty"))
                .setParameter("scrap", totals.get("scrap_qty"))
                .setParameter("id", subjobId)
                .executeUpdate();

            Long jobCardId = findJobCardId(subjobId);
            if (jobCardId != null) recalculateForJobCard(jobCardId);
        } catch (Exception e) {
            log.error("Failed to recalculate rollup for subjob {}: {}", subjobId, e.getMessage());
        }
    }

    private void recalculateForJobCard(Long jobCardId) {
        Map<String, BigDecimal> totals = computeJobCardTotals(jobCardId);
        em.createNativeQuery(
            "UPDATE job_card SET " +
            "completed_qty_computed = :good, rework_qty_computed = :rework, " +
            "reject_qty_computed = :reject, scrap_qty_computed = :scrap " +
            "WHERE id = :id")
            .setParameter("good", totals.get("good_qty"))
            .setParameter("rework", totals.get("rework_qty"))
            .setParameter("reject", totals.get("reject_qty"))
            .setParameter("scrap", totals.get("scrap_qty"))
            .setParameter("id", jobCardId)
            .executeUpdate();
    }

    private Map<String, BigDecimal> computeSubjobTotals(Long subjobId) {
        Object[] row = (Object[]) em.createNativeQuery(
            "SELECT COALESCE(SUM(good_qty),0), COALESCE(SUM(rework_qty),0), " +
            "COALESCE(SUM(reject_qty),0), COALESCE(SUM(scrap_qty),0) " +
            "FROM production_entry WHERE subjob_id = :id")
            .setParameter("id", subjobId)
            .getSingleResult();
        return Map.of(
            "good_qty", (BigDecimal) row[0],
            "rework_qty", (BigDecimal) row[1],
            "reject_qty", (BigDecimal) row[2],
            "scrap_qty", (BigDecimal) row[3]
        );
    }

    private Map<String, BigDecimal> computeJobCardTotals(Long jobCardId) {
        Object[] row = (Object[]) em.createNativeQuery(
            "SELECT COALESCE(SUM(good_qty),0), COALESCE(SUM(rework_qty),0), " +
            "COALESCE(SUM(reject_qty),0), COALESCE(SUM(scrap_qty),0) " +
            "FROM production_entry WHERE job_card_id = :id")
            .setParameter("id", jobCardId)
            .getSingleResult();
        return Map.of(
            "good_qty", (BigDecimal) row[0],
            "rework_qty", (BigDecimal) row[1],
            "reject_qty", (BigDecimal) row[2],
            "scrap_qty", (BigDecimal) row[3]
        );
    }

    private Long findJobCardId(Long subjobId) {
        try {
            return ((Number) em.createNativeQuery(
                "SELECT job_card_id FROM job_card_subjob WHERE id = :id")
                .setParameter("id", subjobId)
                .getSingleResult()).longValue();
        } catch (Exception e) {
            return null;
        }
    }
}
