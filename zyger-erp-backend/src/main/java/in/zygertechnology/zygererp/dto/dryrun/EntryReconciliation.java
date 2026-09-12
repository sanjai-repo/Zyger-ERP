package in.zygertechnology.zygererp.dto.dryrun;

import in.zygertechnology.zygererp.dto.resolution.*;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

/**
 * P3.1 — Per-production-entry reconciliation projection simulation.
 */
@Data
@Builder
public class EntryReconciliation {

    private String entryNumber;
    private String status;
    private boolean reversal;
    private Long legacyId;

    // Legacy authoritative quantities (reported separately; produced ≠ good by rule).
    private BigDecimal processQty;
    private BigDecimal producedQty;
    private BigDecimal goodQuantity;
    private BigDecimal rejectedQuantity;
    private BigDecimal reworkQuantity;
    private BigDecimal scrapQuantity;
    /** produced_quantity vs process_qty: true when equal (legacy alias semantic). */
    private boolean producedEqualsProcess;

    // P3 correction (RC-1) — semantic resolution sourced from the single resolver.
    private InputSemanticCategory semanticCategory;
    private InputAuthority authority;
    private BackfillEligibility backfillEligibility;
    private ResolutionConfidence confidence;
    private String reasonCode;

    // Simulated normalized projection.
    private String simulatedSessionStatus;
    private String simulatedOperationStatus;
    private BigDecimal simulatedAvailableInput;
    private BigDecimal simulatedAcceptedOutput;
    private BigDecimal simulatedWip;

    // Reconciliation checks.
    private boolean quantityBalanceHolds;
    private boolean wipValid;

    // Expected normalized event counts produced by the simulation for THIS entry.
    private long expectedSessions;
    private long expectedOperations;
    private long expectedOutputs;
}