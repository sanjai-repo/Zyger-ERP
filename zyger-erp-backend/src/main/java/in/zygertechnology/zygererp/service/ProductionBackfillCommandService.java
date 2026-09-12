package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.dto.backfill.BackfillJobRequest;
import in.zygertechnology.zygererp.dto.backfill.BackfillJobResponse;
import in.zygertechnology.zygererp.dto.backfill.BackfillRunResult;
import in.zygertechnology.zygererp.security.CurrentUserRoles;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * P3.4 — Backfill operational control (command/validation) layer.
 *
 * <p>Thin, transport-agnostic controller of the committed P3.3 backfill engine. Owns ONLY
 * the control-flow gates: operation validation, dry-run-before-write enforcement, operator
 * confirmation, and the deterministic zero-eligible no-write refusal. It holds NO
 * authoritative backfill resolution/projection logic (that belongs to the committed engine).
 *
 * <p>Hard invariants preserved:
 * <ul>
 *   <li>Actor identity is ALWAYS the authenticated server-side principal
 *       ({@link CurrentUserRoles#username()}, fallback {@code "system"}); never the request
 *       body (the request DTO carries no actor field).</li>
 *   <li>EXECUTE/RESUME are refused unless a dry-run was performed and an operator
 *       confirmation token is present (dry-run-before-write).</li>
 *   <li>EXECUTE/RESUME on a scope with zero eligible records is explicitly refused with
 *       outcome {@code ZERO_ELIGIBLE_NO_WRITE} — no writes merely to form a nominal run.</li>
 *   <li>Rollback stays additive-only via the committed engine and never touches
 *       {@code production_entry} / inventory / stock / orders.</li>
 *   <li>No scheduler; no startup trigger; no inventory/stock/order/job-card dependency.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class ProductionBackfillCommandService {

    /** Operation vocabulary (single). */
    public static final String OP_DRY_RUN = "DRY_RUN";
    public static final String OP_EXECUTE = "EXECUTE";
    public static final String OP_RESUME = "RESUME";
    public static final String OP_ROLLBACK = "ROLLBACK";
    public static final String OP_STATUS = "STATUS";

    /** Deterministic outcome token for the approved zero-eligible refusal. */
    public static final String OUTCOME_ZERO_ELIGIBLE_NO_WRITE = "ZERO_ELIGIBLE_NO_WRITE";

    /** Confirmation acknowledgement string that must accompany a write operation. */
    public static final String CONFIRMATION = "BACKFILL_AUTHORIZED";

    private final ProductionBackfillService backfill;
    private final ProductionBackfillProgressService progress;

    public BackfillJobResponse handle(BackfillJobRequest request) {
        String op = request == null ? null : request.getOperation();
        String actor = actor();
        if (op == null || op.isBlank()) {
            throw new IllegalArgumentException("Operation is required (DRY_RUN|EXECUTE|RESUME|ROLLBACK|STATUS)");
        }
        return switch (op.toUpperCase()) {
            case OP_DRY_RUN -> dryRun(request);
            case OP_EXECUTE -> execute(request, actor, OP_EXECUTE);
            case OP_RESUME -> execute(request, actor, OP_RESUME);
            case OP_ROLLBACK -> rollback(request);
            case OP_STATUS -> status(request);
            default -> throw new IllegalArgumentException("Unsupported operation: " + op);
        };
    }

    // ---------------------------------------------------------------- dry run

    private BackfillJobResponse dryRun(BackfillJobRequest request) {
        boolean dry = request.getDryRun() == null || request.getDryRun();
        BackfillRunResult result = backfill.backfill(jobId(request), dry, actor());
        long eligible = result.projectedCount() + result.alreadyProjectedCount();
        boolean zeroEligible = eligible == 0;
        return BackfillJobResponse.builder()
                .operation(OP_DRY_RUN)
                .jobId(result.getJobId())
                .dryRun(result.isDryRun())
                .executionGateOpen(result.isExecutionGateOpen())
                .status(progress.stateOf(result.getJobId()))
                .reconciliation(result.getReconciliation())
                .zeroEligibleNoWrite(zeroEligible)
                .outcome(zeroEligible ? OUTCOME_ZERO_ELIGIBLE_NO_WRITE : "DRY_RUN_REVIEW")
                .entries(result.getEntries())
                .reason(zeroEligible
                        ? "Scope has zero eligible records; execution would write nothing. Provide operator confirmation only if scope is reviewed and intentionally empty."
                        : result.getReason())
                .build();
    }

    // --------------------------------------------------------- execute/resume

    private BackfillJobResponse execute(BackfillJobRequest request, String actor, String op) {
        String jobId = jobId(request);
        requireConfirmation(request);

        // Deterministic zero-eligible refusal: if the same scope has no eligible records,
        // refuse a real write run rather than silently forming an empty nominal job.
        BackfillRunResult probe = backfill.backfill(jobId, true, actor);
        long eligible = probe.projectedCount() + probe.alreadyProjectedCount();
        if (eligible == 0) {
            return BackfillJobResponse.builder()
                    .operation(op)
                    .jobId(jobId)
                    .dryRun(false)
                    .executionGateOpen(probe.isExecutionGateOpen())
                    .status(progress.stateOf(jobId))
                    .reconciliation(probe.getReconciliation())
                    .zeroEligibleNoWrite(true)
                    .outcome(OUTCOME_ZERO_ELIGIBLE_NO_WRITE)
                    .entries(probe.getEntries())
                    .reason("Refusing write execution: scope resolved to zero eligible records (ZERO_ELIGIBLE_NO_WRITE). No normalized events, no production_entry, no inventory/stock change.")
                    .build();
        }

        boolean dry = request.getDryRun() != null && Boolean.FALSE.equals(request.getDryRun());
        BackfillRunResult result = backfill.backfill(jobId, dry, actor);
        return BackfillJobResponse.builder()
                .operation(op)
                .jobId(result.getJobId())
                .dryRun(result.isDryRun())
                .executionGateOpen(result.isExecutionGateOpen())
                .status(progress.stateOf(result.getJobId()))
                .reconciliation(result.getReconciliation())
                .zeroEligibleNoWrite(false)
                .outcome("RUN")
                .entries(result.getEntries())
                .reason(result.getReason())
                .build();
    }

    // -------------------------------------------------------------- rollback

    private BackfillJobResponse rollback(BackfillJobRequest request) {
        String jobId = jobId(request);
        requireConfirmation(request);
        backfill.rollback(jobId);
        return BackfillJobResponse.builder()
                .operation(OP_ROLLBACK)
                .jobId(jobId)
                .dryRun(false)
                .executionGateOpen(true)
                .status(progress.stateOf(jobId))
                .reconciliation(null)
                .zeroEligibleNoWrite(false)
                .outcome("ROLLED_BACK")
                .reason("Additive-only rollback: removed only backfill-created prod_* rows; production_entry/inventory/stock/orders untouched.")
                .build();
    }

    // --------------------------------------------------------------- status

    private BackfillJobResponse status(BackfillJobRequest request) {
        String jobId = jobId(request);
        return BackfillJobResponse.builder()
                .operation(OP_STATUS)
                .jobId(jobId)
                .dryRun(true)
                .executionGateOpen(false)
                .status(progress.stateOf(jobId))
                .reconciliation(null)
                .zeroEligibleNoWrite(false)
                .outcome("STATUS")
                .reason("Read-only job status.")
                .build();
    }

    // ------------------------------------------------------------- helpers

    private String jobId(BackfillJobRequest request) {
        if (request.getJobId() != null && !request.getJobId().isBlank()) {
            return request.getJobId();
        }
        return java.util.UUID.randomUUID().toString();
    }

    private void requireConfirmation(BackfillJobRequest request) {
        if (!CONFIRMATION.equals(request.getConfirmationToken())) {
            throw new IllegalArgumentException(
                    "Write operation requires an explicit operator confirmation token (dry-run-before-write).");
        }
    }

    /** Actor identity always from the authenticated server-side principal. */
    private String actor() {
        return CurrentUserRoles.username();
    }
}
