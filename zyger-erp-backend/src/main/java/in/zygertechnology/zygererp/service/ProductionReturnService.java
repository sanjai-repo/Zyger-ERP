package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;

/**
 * P12 — Production Return &amp; Return Disposition (CLAR-PROD-003, D-C1, D-C2).
 *
 * <p>Ownership: Production owns the return record and its lifecycle; all physical
 * stock movement is delegated to {@link InventoryIntegrationService} which in turn
 * delegates exclusively to {@link StockService}. This service <b>never</b> writes
 * {@code stock_ledger}/{@code stock_balance} directly.</p>
 *
 * <p>D-C1: Return disposition is a strict enum {GOOD, QC_HOLD, REJECTED, SCRAP, REWORK}.
 * An unsupported / blank / unknown disposition is rejected with a validation error and
 * <b>never</b> falls back to FREE. Only FREE (GOOD) and QC_HOLD (QC_HOLD) are passed to
 * the Inventory boundary as countable stock statuses; SCRAP/REJECTED are controlled
 * dispositions and REWORK carries a rework-route reference.</p>
 *
 * <p>D-C2: when the return carries an origin (originalIssueReference = an existing
 * Production Consumption number), the return quantity is validated against the
 * authoritative consumption-line facts: {@code returnQty &lt;= issued - consumed - alreadyReturned}.
 * The cumulative {@code returnQty} on the matching consumption line is incremented so
 * additive returns are bounded and never exceed {@code issued - consumed}.</p>
 */
@Service
@RequiredArgsConstructor
public class ProductionReturnService {

    private static final Set<String> DISPOSITIONS = Set.of(
            "GOOD", "QC_HOLD", "REJECTED", "SCRAP", "REWORK");

    // Approved D-C1 disposition -> countable stock-status mapping.
    // Only GOOD and QC_HOLD are countable stock statuses written to stock_balance.
    private static final String STATUS_GOOD = "FREE";
    private static final String STATUS_QC_HOLD = "QC_HOLD";

    private final ProductionReturnRepository returns;
    private final ProductionConsumptionRepository consumptions;
    private final ProductionConsumptionLineRepository consumptionLines;
    private final DocNumberService numbers;
    private final WorkflowStateMachine stateMachine;
    private final InventoryIntegrationService inventory;

    // ─── Create / Update / Delete ─────────────────────────────────────────

    @Transactional
    public ProductionReturn create(ProductionReturn pr, String user) {
        if (user == null || user.isBlank()) user = "system";
        if (pr.getQuantity() == null || pr.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Return quantity must be > 0");
        }
        if (pr.getCondition() != null && !pr.getCondition().isBlank() && !DISPOSITIONS.contains(pr.getCondition())) {
            throw new IllegalArgumentException("Unsupported return disposition: " + pr.getCondition());
        }
        if (pr.getReturnNumber() == null || pr.getReturnNumber().isBlank()) {
            pr.setReturnNumber(numbers.next("production-return"));
        }
        pr.setId(null);
        if (pr.getReturnDate() == null) pr.setReturnDate(Instant.now());
        if (pr.getStatus() == null) pr.setStatus("DRAFT");
        pr.setVersion(null);
        pr.setCreatedBy(user);
        pr.setCreatedAt(Instant.now());
        pr.setUpdatedBy(user);
        pr.setUpdatedAt(Instant.now());
        return returns.save(pr);
    }

    @Transactional
    public ProductionReturn update(Long id, ProductionReturn pr, String user) {
        ProductionReturn existing = returns.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Production Return not found: " + id));
        if (!"DRAFT".equals(existing.getStatus())) {
            throw new IllegalStateException("Only DRAFT returns can be edited (current: " + existing.getStatus() + ")");
        }
        if (pr.getQuantity() == null || pr.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Return quantity must be > 0");
        }
        if (pr.getCondition() != null && !pr.getCondition().isBlank() && !DISPOSITIONS.contains(pr.getCondition())) {
            throw new IllegalArgumentException("Unsupported return disposition: " + pr.getCondition());
        }
        pr.setId(id);
        pr.setReturnNumber(existing.getReturnNumber());
        pr.setStatus("DRAFT");
        pr.setCreatedBy(existing.getCreatedBy());
        pr.setCreatedAt(existing.getCreatedAt());
        pr.setUpdatedBy(user);
        pr.setUpdatedAt(Instant.now());
        return returns.save(pr);
    }

    @Transactional
    public void delete(Long id) {
        ProductionReturn e = returns.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Production Return not found: " + id));
        if (!"DRAFT".equals(e.getStatus())) {
            throw new IllegalStateException("Only DRAFT returns can be deleted (current: " + e.getStatus() + ")");
        }
        returns.deleteById(id);
    }

    // ─── Workflow actions ─────────────────────────────────────────────────

    @Transactional
    public ProductionReturn action(Long id, String action, String user) {
        if (user == null || user.isBlank()) user = "system";
        ProductionReturn pr = returns.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Production Return not found: " + id));

        String act = action == null ? "" : action.trim().toUpperCase();
        stateMachine.validateTransition("production-return", pr.getStatus(), act);

        switch (act) {
            case "SUBMIT":
                pr.setStatus("SUBMITTED");
                break;
            case "VERIFY":
                pr.setStatus("VERIFIED");
                break;
            case "RECEIVE":
                receive(pr, user);
                break;
            default:
                throw new IllegalArgumentException("Unknown action: " + action);
        }
        pr.setUpdatedBy(user);
        pr.setUpdatedAt(Instant.now());
        return returns.save(pr);
    }

    private void receive(ProductionReturn pr, String user) {
        resolveDisposition(pr);
        String countableStatus = countableStockStatus(pr.getCondition());
        validateReturnBalance(pr);
        pr.setStatus("RECEIVED");
        String loc = pr.getLocation() != null ? pr.getLocation()
                : (pr.getWarehouse() != null ? pr.getWarehouse() : "STORE");
        inventory.receiveProductionReturn(
                pr.getReturnNumber(), pr.getItemCode(), loc, pr.getBatchNumber(),
                pr.getQuantity(), LocalDate.now(), user, countableStatus);
        incrementConsumptionReturnQty(pr);
    }

    /**
     * D-C1: disposition -> countable stock status. Only GOOD and QC_HOLD are countable
     * stock statuses. SCRAP/REJECTED/REWORK are orchestration dispositions and are never
     * written to a counted balance by this path. SCRAP/REJECTED require a controlled
     * posting and an NCR (Quality-owned); REWORK references a rework route.
     */
    private String countableStockStatus(String disposition) {
        switch (disposition) {
            case "GOOD":      return STATUS_GOOD;
            case "QC_HOLD":   return STATUS_QC_HOLD;
            case "SCRAP":
            case "REJECTED":
            case "REWORK":
                throw new IllegalStateException(
                        "Disposition " + disposition + " is not a countable stock-in; "
                        + "handle via controlled posting / NCR / rework route before receive");
            default:
                throw new IllegalArgumentException("Unsupported return disposition (never FREE): " + disposition);
        }
    }

    /**
     * D-C1: strict disposition resolution at the posting boundary. A blank / unsupported
     * disposition is a validation error, <b>never</b> a FREE fallback. Starts the default
     * (QC_HOLD for batch-controlled, else GOOD) when the header has no disposition,
     * per CLAR-PROD-003.
     */
    private void resolveDisposition(ProductionReturn pr) {
        String disposition = pr.getCondition();
        if (disposition == null || disposition.isBlank()) {
            disposition = isBatchControlled(pr) ? "QC_HOLD" : "GOOD";
            pr.setCondition(disposition);
        }
        if (!DISPOSITIONS.contains(disposition)) {
            throw new IllegalArgumentException("Unsupported return disposition (never FREE): " + disposition);
        }
    }

    /**
     * D-C2: authoritative per-return bound against the origin consumption-line facts:
     * {@code returnQty <= issued - consumed - alreadyReturned}.
     * When originalIssueReference is blank, the return is standalone (no D-C2 origin facts).
     */
    private void validateReturnBalance(ProductionReturn pr) {
        String ref = pr.getOriginalIssueReference();
        if (ref == null || ref.isBlank()) return;

        ProductionConsumption consumption = consumptions.findByConsumptionNo(ref.trim())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Origin consumption not found for originalIssueReference: " + ref));

        BigDecimal issued = BigDecimal.ZERO;
        BigDecimal consumedSoFar = BigDecimal.ZERO;
        BigDecimal returnedSoFar = BigDecimal.ZERO;
        boolean matched = false;

        for (ProductionConsumptionLine line : consumption.getLines()) {
            if (!itemEquals(line.getItemCode(), pr.getItemCode())) continue;
            if (!batchEquals(line.getBatchNumber(), pr.getBatchNumber())) continue;
            issued = nz(line.getIssuedQty());
            consumedSoFar = nz(line.getConsumedQty());
            returnedSoFar = nz(line.getReturnQty());
            matched = true;
            break;
        }
        if (!matched) {
            throw new IllegalArgumentException(
                    "No matching consumption line (item + batch) for origin: " + ref);
        }

        BigDecimal returnable = issued.subtract(consumedSoFar).subtract(returnedSoFar);
        if (pr.getQuantity().compareTo(returnable) > 0) {
            throw new IllegalArgumentException(
                    "Return quantity " + pr.getQuantity() + " exceeds returnable balance " + returnable
                            + " (issued - consumed - alreadyReturned) for item " + pr.getItemCode());
        }
    }

    /** Accumulate the returned quantity on the origin consumption line (D-C2 quantity ledger). */
    private void incrementConsumptionReturnQty(ProductionReturn pr) {
        String ref = pr.getOriginalIssueReference();
        if (ref == null || ref.isBlank()) return;
        ProductionConsumption consumption = consumptions.findByConsumptionNo(ref.trim()).orElse(null);
        if (consumption == null) return;
        for (ProductionConsumptionLine line : consumption.getLines()) {
            if (!itemEquals(line.getItemCode(), pr.getItemCode())) continue;
            if (!batchEquals(line.getBatchNumber(), pr.getBatchNumber())) continue;
            line.setReturnQty(nz(line.getReturnQty()).add(pr.getQuantity()));
            consumptionLines.save(line);
            return;
        }
    }

    // ─── Small helpers ────────────────────────────────────────────────────

    private static boolean isBatchControlled(ProductionReturn pr) {
        return pr.getBatchNumber() != null && !pr.getBatchNumber().isBlank();
    }

    private static boolean itemEquals(String a, String b) {
        return a != null && a.equals(b);
    }

    private static boolean batchEquals(String a, String b) {
        if (b == null || b.isBlank()) return true;
        return a != null && a.equals(b);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    // Expose approved dispositions for the frontend
    public static Set<String> dispositions() {
        return DISPOSITIONS;
    }
}
