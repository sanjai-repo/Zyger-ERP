package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.ProdBackfillEntryOutcome;
import in.zygertechnology.zygererp.entity.ProdBackfillProgress;
import in.zygertechnology.zygererp.repo.ProdBackfillEntryOutcomeRepository;
import in.zygertechnology.zygererp.repo.ProdBackfillProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * P3 correction (RC-2) — Backfill progress and per-entry outcome persistence.
 *
 * <p>This is the CONTROLLED backfill infrastructure ONLY (foundation). It does NOT
 * execute backfill, does NOT write normalized events, does NOT write inventory, and
 * NEVER modifies legacy {@code production_entry} data.
 *
 * <p>It separates two distinct concepts:
 * <ol>
 *   <li><b>Job-level progress</b> ({@link ProdBackfillProgress}) — state of the run
 *       (single vocabulary, one row per job card).</li>
 *   <li><b>Per-entry outcome</b> ({@link ProdBackfillEntryOutcome}) — outcome for each
 *       entry ({@code PROJECTED/ALREADY_PROJECTED/QUARANTINED/FAILED/SKIPPED}), with the
 *       resolver's category/authority/effective-input/eligibility for audit.</li>
 * </ol>
 *
 * <p>Manual resolution is additive: {@link #resolveEntry(String, String, String, String)}
 * records a resolution note and stores the explicit effective input + eligibility WITHOUT
 * touching legacy production data. The actual promotion to {code ELIGIBLE} for real
 * backfill is NOT performed here.
 */
@Service
@RequiredArgsConstructor
public class ProductionBackfillProgressService {

    /** Job-level state vocabulary (single). */
    public static final String STATUS_NOT_STARTED = "NOT_STARTED";
    public static final String STATUS_RUNNING = "RUNNING";
    public static final String STATUS_PAUSED = "PAUSED";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_RECONCILIATION_FAILED = "RECONCILIATION_FAILED";
    public static final String STATUS_ROLLED_BACK = "ROLLED_BACK";

    /** Per-entry outcome vocabulary (single). */
    public static final String OUTCOME_PROJECTED = "PROJECTED";
    public static final String OUTCOME_ALREADY_PROJECTED = "ALREADY_PROJECTED";
    public static final String OUTCOME_QUARANTINED = "QUARANTINED";
    public static final String OUTCOME_FAILED = "FAILED";
    public static final String OUTCOME_SKIPPED = "SKIPPED";
    /** Stop-on-block outcome (DOCUMENT_34 §12): a BLOCK record is recorded, never projected. */
    public static final String OUTCOME_BLOCKED = "BLOCKED";

    private final ProdBackfillProgressRepository progressRepo;
    private final ProdBackfillEntryOutcomeRepository outcomeRepo;

    /** Start a new backfill job for a scope, or return the existing one (idempotent). */
    @Transactional
    public ProdBackfillProgress startJob(String jobId, String jobCardNumber) {
        ProdBackfillProgress existing = progressRepo.findByJobId(jobId).orElse(null);
        if (existing != null) {
            return existing;
        }
        Instant now = Instant.now();
        ProdBackfillProgress p = ProdBackfillProgress.builder()
                .jobId(jobId)
                .jobCardNumber(jobCardNumber)
                .status(STATUS_NOT_STARTED)
                .batchNumber(0L)
                .failureCount(0L)
                .quarantineCount(0L)
                .processedCount(0L)
                .successCount(0L)
                .skipCount(0L)
                .reconciliationStatus("PENDING")
                .startedAt(now)
                .createdAt(now)
                .updatedAt(now)
                .build();
        return progressRepo.save(p);
    }

    /**
     * Claim the job for processing (only NOT_STARTED/PAUSED/FAILED resumable runs).
     * Uses optimistic locking via @Version; a concurrent claimant loses.
     */
    @Transactional
    public ProdBackfillProgress claim(String jobId) {
        ProdBackfillProgress p = progressRepo.findByJobId(jobId).orElseThrow(
                () -> new IllegalArgumentException("No backfill job " + jobId));
        if (STATUS_COMPLETED.equals(p.getStatus()) || STATUS_ROLLED_BACK.equals(p.getStatus())) {
            throw new IllegalStateException("Job already terminal: " + p.getStatus());
        }
        p.setStatus(STATUS_RUNNING);
        p.setStartedAt(p.getStartedAt() != null ? p.getStartedAt() : Instant.now());
        p.setUpdatedAt(Instant.now());
        return progressRepo.save(p);
    }

    /**
     * Resume cursor: returns the last committed {@code production_entry.id} for this job
     * (null = start from beginning). Restart resumes from last SUCCESSFUL entry so
     * already-committed work is never re-emitted (no duplicate events) and eligible
     * records after it are never skipped.
     */
    @Transactional(readOnly = true)
    public Long resumeFrom(String jobId) {
        ProdBackfillProgress p = progressRepo.findByJobId(jobId).orElse(null);
        return p == null ? null : p.getLastSuccessfulEntryId();
    }

    /** Read-only current job-level state (or {@code null} if the job does not exist). */
    @Transactional(readOnly = true)
    public String stateOf(String jobId) {
        ProdBackfillProgress p = progressRepo.findByJobId(jobId).orElse(null);
        return p == null ? null : p.getStatus();
    }

    /** Mark a heartbeat after a batch chunk (called within the entry transaction). */
    @Transactional
    public void heartbeat(String jobId, long lastProcessed, long lastSuccessful, long batchNumber) {
        ProdBackfillProgress p = progressRepo.findByJobId(jobId).orElse(null);
        if (p == null) {
            return;
        }
        p.setLastProcessedEntryId(lastProcessed);
        p.setLastSuccessfulEntryId(lastSuccessful);
        p.setBatchNumber(batchNumber);
        p.setUpdatedAt(Instant.now());
        progressRepo.save(p);
    }

    /** Record a per-entry outcome (additive audit; idempotent by job+entry). */
    @Transactional
    public void recordOutcome(String jobId, String entryNumber, Long legacyId, String outcome,
                              String category, String authority, String reason,
                              BigDecimal effectiveInput, String eligibility) {
        ProdBackfillEntryOutcome existing = outcomeRepo.findByJobIdAndEntryNumber(jobId, entryNumber).orElse(null);
        if (existing != null) {
            return; // idempotent
        }
        ProdBackfillEntryOutcome e = ProdBackfillEntryOutcome.builder()
                .jobId(jobId)
                .entryNumber(entryNumber)
                .legacyId(legacyId)
                .outcome(outcome)
                .semanticCategory(category)
                .authority(authority)
                .reasonCode(reason)
                .effectiveInput(effectiveInput)
                .eligibility(eligibility)
                .createdAt(Instant.now())
                .build();
        outcomeRepo.save(e);

        ProdBackfillProgress p = progressRepo.findByJobId(jobId).orElse(null);
        if (p != null) {
            p.setProcessedCount(inc(p.getProcessedCount()));
            if (OUTCOME_QUARANTINED.equals(outcome)) {
                p.setQuarantineCount(inc(p.getQuarantineCount()));
            } else if (OUTCOME_SKIPPED.equals(outcome)) {
                p.setSkipCount(inc(p.getSkipCount()));
            } else if (OUTCOME_PROJECTED.equals(outcome)
                    || OUTCOME_ALREADY_PROJECTED.equals(outcome)) {
                p.setSuccessCount(inc(p.getSuccessCount()));
            } else if (OUTCOME_FAILED.equals(outcome) || OUTCOME_BLOCKED.equals(outcome)) {
                p.setFailureCount(inc(p.getFailureCount()));
            }
            p.setUpdatedAt(Instant.now());
            progressRepo.save(p);
        }
    }

    /** Additive manual resolution note + explicit input (never modifies legacy data). */
    @Transactional
    public void resolveEntry(String jobId, String entryNumber, String resolutionNote,
                             BigDecimal explicitInput, String eligibility) {
        ProdBackfillEntryOutcome e = outcomeRepo.findByJobIdAndEntryNumber(jobId, entryNumber)
                .orElse(null);
        if (e == null) {
            throw new IllegalArgumentException("No outcome for " + entryNumber);
        }
        if (!OUTCOME_QUARANTINED.equals(e.getOutcome())) {
            throw new IllegalStateException("Only quarantined entries are manually resolved: " + e.getOutcome());
        }
        e.setResolutionNote(resolutionNote);
        e.setEffectiveInput(explicitInput);
        e.setEligibility(eligibility);
        outcomeRepo.save(e);
    }

    /** Finalize the job (status + reconciliation status). */
    @Transactional
    public void complete(String jobId, String status, String reconciliationStatus) {
        ProdBackfillProgress p = progressRepo.findByJobId(jobId).orElse(null);
        if (p == null) {
            return;
        }
        p.setStatus(status);
        p.setReconciliationStatus(reconciliationStatus);
        p.setCompletedAt(Instant.now());
        p.setUpdatedAt(Instant.now());
        progressRepo.save(p);
    }

    private Long inc(Long v) {
        return v == null ? 1L : v + 1L;
    }
}