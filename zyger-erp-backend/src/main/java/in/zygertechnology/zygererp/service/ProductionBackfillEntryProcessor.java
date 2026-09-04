package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.dto.backfill.BackfillEntryDecision;
import in.zygertechnology.zygererp.dto.resolution.InputResolutionResult;
import in.zygertechnology.zygererp.entity.ProductionEntry;
import in.zygertechnology.zygererp.repo.ProdExecutionSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * P3.3 — Per-entry worker for controlled backfill.
 *
 * <p>Processes ONE {@code production_entry} inside a single {@code REQUIRES_NEW}
 * transaction so the normalized session + operation + outputs + per-entry outcome +
 * progress update succeed or fail atomically (DOCUMENT_34 §7). A failure rolls back only
 * this entry — prior committed entries and the job cursor are untouched.
 *
 * <p>Only ever called by the orchestrator for a record that the {@link
 * ProductionInputAuthorityResolver} classified ELIGIBLE and resolvable — never for
 * QUARANTINE/BLOCK. Idempotency: if the session natural key already exists, nothing is
 * re-projected and the outcome is {@code ALREADY_PROJECTED}.
 */
@Component
@RequiredArgsConstructor
public class ProductionBackfillEntryProcessor {

    private final ProductionBackfillEventWriter writer;
    private final ProductionBackfillProgressService progress;
    private final ProdExecutionSessionRepository sessionRepo;

    /**
     * Project an ELIGIBLE entry and record its outcome + cursor advancement atomically.
     *
     * @return the per-entry decision (PROJECTED or ALREADY_PROJECTED).
     * @throws IllegalStateException if the resolver result is not resolvable (must never happen
     *         because the orchestrator gates on it; failure surfaces loudly, never silently).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public BackfillEntryDecision projectEligible(String jobId, ProductionEntry entry,
                                                 InputResolutionResult resolution, long batch) {
        if (entry == null || !resolution.isResolvable()) {
            throw new IllegalStateException(
                    "BackfillEligibility=ELIGIBLE but isResolvable()=false — refusing to fabricate an input for " + entryNumber(entry));
        }
        boolean alreadyProjected = sessionRepo.existsByEntryNumber(entry.getEntryNumber());
        if (!alreadyProjected) {
            writer.projectEntry(entry, resolution);
        }

        String outcome = alreadyProjected
                ? ProductionBackfillProgressService.OUTCOME_ALREADY_PROJECTED
                : ProductionBackfillProgressService.OUTCOME_PROJECTED;
        progress.recordOutcome(jobId, entry.getEntryNumber(), entry.getId(), outcome,
                resolution.getCategory().name(), resolution.getAuthority().name(),
                resolution.getReasonCode(), resolution.getEffectiveInputQuantity(),
                resolution.getEligibility().name());
        progress.heartbeat(jobId, entry.getId(), entry.getId(), batch);

        return BackfillEntryDecision.builder()
                .entryNumber(entry.getEntryNumber())
                .legacyId(entry.getId())
                .outcome(outcome)
                .semanticCategory(resolution.getCategory().name())
                .authority(resolution.getAuthority().name())
                .reasonCode(resolution.getReasonCode())
                .effectiveInput(resolution.getEffectiveInputQuantity())
                .eligibility(resolution.getEligibility().name())
                .alreadyProjected(alreadyProjected)
                .build();
    }

    private String entryNumber(ProductionEntry e) {
        return e == null ? "(null)" : e.getEntryNumber();
    }
}