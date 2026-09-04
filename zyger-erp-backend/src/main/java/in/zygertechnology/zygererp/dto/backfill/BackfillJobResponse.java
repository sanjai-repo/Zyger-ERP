package in.zygertechnology.zygererp.dto.backfill;

import lombok.Builder;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

/**
 * P3.4 — Response for the controlled backfill operational control layer.
 *
 * <p>Mirrors the committed {@link BackfillRunResult} into a transport-safe shape and adds
 * the operation, job state, and an explicit zero-eligible refusal signal so operator and
 * tests can observe the deterministic no-write behavior.
 */
@Getter
@Builder
public final class BackfillJobResponse {

    private final String operation;

    private final String jobId;

    private final boolean dryRun;

    /** Whether the backfill execution gate was open when the underlying engine was invoked. */
    private final boolean executionGateOpen;

    /** Job-level state drawn from the committed status vocabulary. */
    private final String status;

    /** Reconciliation id (PASS or FAIL) from the committed engine. */
    private final String reconciliation;

    /** True when an EXECUTE/RESUME was explicitly refused because the scope has zero eligible records. */
    private final boolean zeroEligibleNoWrite;

    /** Deterministic outcome token for the zero-eligible refusal. */
    private final String outcome;

    /** Per-entry decisions for this scope. */
    @Builder.Default
    private final List<BackfillEntryDecision> entries = new ArrayList<>();

    /** Human-readable reason / refusal explanation. */
    private final String reason;
}
