package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.ProductionConsumption;
import in.zygertechnology.zygererp.entity.ProductionConsumptionLine;
import in.zygertechnology.zygererp.repo.ProductionConsumptionRepository;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Return Management FRS v1.0 §8 B#4 — booked-consumption reduction for Stock Returns.
 *
 * <p>When a Stock Return references an RM Issue that was consumed on a Production
 * Order, the un-consumed returned quantity must reduce the booked
 * {@code consumedQty} on the matching {@link ProductionConsumptionLine} (bounded >= 0),
 * so the "Returned to Stock" quantity is no longer counted as consumed.  This mirrors
 * the authoritative-line-facts pattern used by {@link ProductionReturnService}.
 *
 * <p>The linkage is best-effort: the RM Issue carries a Job Order / Job Card reference
 * which is matched against {@code jobCardNumber} or {@code workOrderNumber} on the
 * consumption header.  If no matching line is found the reduction is logged and
 * skipped — Stock Return itself does not fail because of an un-resolvable consume
 * reference (the physical stock-in is already posted by the caller).
 */
@Service
public class StockReturnConsumptionService {

    private static final Logger log = LoggerFactory.getLogger(StockReturnConsumptionService.class);

    private final ProductionConsumptionRepository consumptions;
    private final EntityManager em;

    public StockReturnConsumptionService(ProductionConsumptionRepository consumptions,
                                         EntityManager em) {
        this.consumptions = consumptions;
        this.em = em;
    }

    @Transactional
    public void reduceConsumedQty(String jobCardOrWorkOrderNo, String itemCode,
                                  String batchNo, BigDecimal returnQty, String user) {
        if (jobCardOrWorkOrderNo == null || jobCardOrWorkOrderNo.isBlank()
                || itemCode == null || itemCode.isBlank() || returnQty == null
                || returnQty.signum() <= 0) {
            return;
        }
        ProductionConsumptionLine target = findConsumptionLine(jobCardOrWorkOrderNo, itemCode, batchNo);
        if (target == null) {
            log.info("StockReturn consume-reduction: no consumption line for job={} item={}", jobCardOrWorkOrderNo, itemCode);
            return;
        }
        BigDecimal consumed = target.getConsumedQty() == null ? BigDecimal.ZERO : target.getConsumedQty();
        BigDecimal reduced = consumed.subtract(returnQty);
        if (reduced.compareTo(BigDecimal.ZERO) < 0) reduced = BigDecimal.ZERO;
        target.setConsumedQty(reduced);
        target.setLineRemarks("Consumption reduced by returned qty " + returnQty
                + (user != null && !user.isBlank() ? " (" + user + ")" : ""));
        em.merge(target);
    }

    private ProductionConsumptionLine findConsumptionLine(String jobCardOrWorkOrderNo, String itemCode, String batchNo) {
        // Match consumption header by jobCardNumber OR workOrderNumber.
        List<ProductionConsumption> byJob = consumptions.findByStatus("POSTED").stream()
                .filter(c -> jobCardOrWorkOrderNo.equals(c.getJobCardNumber())
                        || jobCardOrWorkOrderNo.equals(c.getWorkOrderNumber()))
                .collect(java.util.stream.Collectors.toList());
        if (byJob.isEmpty()) {
            // fallback: any POSTED consumption referencing the number anywhere
            for (ProductionConsumption c : consumptions.findByStatus("POSTED")) {
                String num = c.getConsumptionNo();
                if (num != null && num.equals(jobCardOrWorkOrderNo)) { byJob.add(c); break; }
            }
        }
        for (ProductionConsumption c : byJob) {
            for (ProductionConsumptionLine line : c.getLines()) {
                if (itemCode.equals(line.getItemCode())
                        && (batchNo == null || batchNo.isBlank() || batchNo.equals(line.getBatchNumber()))) {
                    return line;
                }
            }
        }
        return null;
    }
}
