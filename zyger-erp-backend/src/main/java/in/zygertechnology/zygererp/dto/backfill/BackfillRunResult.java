package in.zygertechnology.zygererp.dto.backfill;

import lombok.Builder;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

/**
 * P3.3 — Result of a (dry or real) controlled backfill run.
 *
 * <p>Carries a per-entry decision/outcome list plus the reconciliation summary used to
 * report PASS/FAIL. Both dry-runs and real executions produce this shape so an operator
 * can review scope before any write is committed.
 */
@Getter
@Builder
public final class BackfillRunResult {

    private final String jobId;
    private final boolean dryRun;

    /** Whether the backfill execution gate was satisfied and the engine proceeded. */
    private final boolean executionGateOpen;

    /** Per-entry decisions for this scope. */
    @Builder.Default
    private final List<BackfillEntryDecision> entries = new ArrayList<>();

    /** Stop-on-block triggered (true = run halted on a BLOCK record). */
    private final boolean stoppedOnBlock;

    /** Reconciliation id: PASS or FAIL. */
    private final String reconciliation;

    /** Legacy "production_entry" is never touched by the engine (invariant proof). */
    private final boolean legacyUntouched;

    /** Inventory counts are unchanged by the run (invariant proof). */
    private final boolean inventoryIsolationProven;

    /** Free-form reason when reconciliation is FAIL or a gate blocked the run. */
    private final String reason;

    /** Per-entry navigation helpers for reporting. */
    public long projectedCount() {
        return count("PROJECTED");
    }

    public long alreadyProjectedCount() {
        return count("ALREADY_PROJECTED");
    }

    public long quarantinedCount() {
        return count("QUARANTINED");
    }

    public long blockedCount() {
        return count("BLOCKED");
    }

    public long failedCount() {
        return count("FAILED");
    }

    private long count(String outcome) {
        return entries.stream().filter(d -> outcome.equals(d.getOutcome())).count();
    }
}