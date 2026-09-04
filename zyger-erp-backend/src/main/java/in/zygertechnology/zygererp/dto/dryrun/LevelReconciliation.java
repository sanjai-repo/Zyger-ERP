package in.zygertechnology.zygererp.dto.dryrun;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

/**
 * P3.1 — Reconciliation aggregated at a dimension level
 * (Job Card / Work Order / Item / Date Range / Machine / Operation).
 */
@Data
@Builder
public class LevelReconciliation {

    private String level;
    private String key;
    private long entryCount;

    private BigDecimal legacyInput;
    private BigDecimal legacyGood;
    private BigDecimal legacyRejected;
    private BigDecimal legacyRework;
    private BigDecimal legacyScrap;

    private long expectedSessions;
    private long expectedOperations;
    private long expectedOutputs;

    /** Existing normalized event rows for this dimension (read-only; 0 pre-backfill). */
    private long presentSessions;
    private long presentOutputs;

    /** present - expected, clamped to 0 (existing rows with no simulated source). */
    private long duplicateCount;
    /** max(expected - present, 0); pre-backfill equals expected (informational). */
    private long missingCount;
    private long reversalCount;
    private long negativeWipCount;
}