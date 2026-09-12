package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.dto.resolution.*;
import in.zygertechnology.zygererp.entity.ProductionEntry;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * P3 correction (RC-1) — SINGLE input-quantity authority resolver.
 *
 * <p>This is the ONLY component allowed to interpret {@code process_qty},
 * {@code produced_quantity}, effective input, semantic category, backfill eligibility,
 * and reason code for a {@code ProductionEntry}. After migration no consumer may
 * implement its own fallback/alias logic.
 *
 * <p>Categories (deterministic, per record):
 * <ul>
 *   <li><b>CATEGORY_A</b> — process present, produced null &rarr; PROCESS_QTY / ELIGIBLE</li>
 *   <li><b>CATEGORY_B</b> — process null, produced present &rarr; AMBIGUOUS / QUARANTINE
 *       (produced is total-output evidence, never silently treated as input; the live
 *       record {@code PE/2026-27/00001} is Category B and is never auto-backfilled).</li>
 *   <li><b>CATEGORY_C</b> — both present and equal &rarr; PROCESS_QTY / ELIGIBLE</li>
 *   <li><b>CATEGORY_D</b> — both present and different &rarr; AMBIGUOUS / QUARANTINE
 *       (over-allocation escalates to BLOCK)</li>
 *   <li><b>CATEGORY_UNKNOWN</b> — both null, negative quantities, over-allocation, or
 *       other invalid state &rarr; QUARANTINE or BLOCK</li>
 * </ul>
 *
 * <p>Rule: never return an {@code effectiveInputQuantity} for an ambiguous record; never
 * silently use zero or produced; never globally assert produced == process.
 */
@Service
public class ProductionInputAuthorityResolver {

    public InputResolutionResult resolve(ProductionEntry entry) {
        if (entry == null) {
            return InputResolutionResult.builder()
                    .entryNumber(null)
                    .legacyId(null)
                    .category(InputSemanticCategory.CATEGORY_UNKNOWN)
                    .authority(InputAuthority.AMBIGUOUS)
                    .confidence(ResolutionConfidence.LOW)
                    .eligibility(BackfillEligibility.QUARANTINE)
                    .reasonCode("NULL-ENTRY")
                    .build();
        }

        BigDecimal process = entry.getProcessQty();
        BigDecimal produced = entry.getProducedQuantity();

        // Reversal rows are negated compensation mirrors (RC-1 §§5,8): the negatives are
        // the intended sign, NOT invalid data. Authority still depends on whether the
        // reversal references a resolvable input. A reversal of a Category-B record
        // (process_qty NULL on the mirror) is QUARANTINE and never auto-resolved.
        if (Boolean.TRUE.equals(entry.getIsReversal())) {
            return resolveReversal(entry, process);
        }

        // Invalid negatives (non-reversal): treat as unknown/investigate.
        if (isNegative(process) || isNegative(produced) || isNegativeOutput(entry)) {
            return unknown(entry, "NEGATIVE-QUANTITY", BackfillEligibility.QUARANTINE);
        }

        if (process != null && produced == null) {
            // CATEGORY_A
            BigDecimal effective = process;
            return base(entry, InputSemanticCategory.CATEGORY_A, InputAuthority.PROCESS_QTY,
                    effective, ResolutionConfidence.HIGH, resolveEligibility(entry, effective));
        }

        if (process == null && produced != null) {
            // CATEGORY_B — amboiguous; produced is total-output evidence, NOT certified input.
            return base(entry, InputSemanticCategory.CATEGORY_B, InputAuthority.AMBIGUOUS,
                    null, ResolutionConfidence.MEDIUM, BackfillEligibility.QUARANTINE);
        }

        if (process != null && produced != null) {
            if (process.compareTo(produced) == 0) {
                // CATEGORY_C — code-created alias holds.
                return base(entry, InputSemanticCategory.CATEGORY_C, InputAuthority.PROCESS_QTY,
                        process, ResolutionConfidence.HIGH, resolveEligibility(entry, process));
            }
            // CATEGORY_D — both present and different.
            InputResolutionResult d = base(entry, InputSemanticCategory.CATEGORY_D, InputAuthority.AMBIGUOUS,
                    null, ResolutionConfidence.MEDIUM, BackfillEligibility.QUARANTINE);
            return overAllocationBlockIfNeeded(entry, process, d);
        }

        // Both null.
        boolean outputsPresent = entry.getGoodQuantity() != null || entry.getRejectedQuantity() != null
                || entry.getReworkQuantity() != null || entry.getScrapQuantity() != null;
        if (outputsPresent) {
            return unknown(entry, "BOTH-NULL-WITH-OUTPUTS", BackfillEligibility.QUARANTINE);
        }
        return base(entry, InputSemanticCategory.CATEGORY_UNKNOWN, InputAuthority.AMBIGUOUS,
                null, ResolutionConfidence.LOW, BackfillEligibility.QUARANTINE);
    }

    /**
     * Resolve the input authority of a REVERSAL (compensating mirror) row.
     *
     * <p>A reversal negates the source's resolved input and outputs. It is ELIGIBLE for
     * projection with sign-aware semantics (WIP = 0, no over-allocation block) when its own
     * input mirrors a resolvable source. A reversal whose {@code process_qty} is NULL (i.e. a
     * reversal of a Category-B record) is QUARANTINE — produced remains total-output evidence,
     * never silently promoted to a certified input (RC-1 §8). Reversal rows are NEVER backfill
     * candidates themselves.
     */
    private InputResolutionResult resolveReversal(ProductionEntry e, BigDecimal process) {
        if (process != null) {
            // Resolvable mirror: projection creates the negated CANCELLED mirror.
            return InputResolutionResult.builder()
                    .entryNumber(e.getEntryNumber())
                    .legacyId(e.getId())
                    .category(InputSemanticCategory.CATEGORY_A)
                    .authority(InputAuthority.PROCESS_QTY)
                    .effectiveInputQuantity(process)
                    .confidence(ResolutionConfidence.HIGH)
                    .eligibility(BackfillEligibility.ELIGIBLE)
                    .reasonCode("REVERSAL-MIRROR")
                    .build();
        }
        // process_qty NULL on the reversal -> reversal of a Category-B source: QUARANTINE.
        return base(e, InputSemanticCategory.CATEGORY_B, InputAuthority.AMBIGUOUS,
                null, ResolutionConfidence.MEDIUM, BackfillEligibility.QUARANTINE);
    }

    private InputResolutionResult base(ProductionEntry e, InputSemanticCategory cat, InputAuthority auth,
                                       BigDecimal effective, ResolutionConfidence conf, BackfillEligibility elig) {
        return InputResolutionResult.builder()
                .entryNumber(e.getEntryNumber())
                .legacyId(e.getId())
                .category(cat)
                .authority(auth)
                .effectiveInputQuantity(effective)
                .confidence(conf)
                .eligibility(elig)
                .reasonCode(reasonFor(cat))
                .build();
    }

    private String reasonFor(InputSemanticCategory cat) {
        switch (cat) {
            case CATEGORY_A: return "PROCESS-ONLY";
            case CATEGORY_B: return "INPUT-AUTHORITY-NULL";
            case CATEGORY_C: return "PROCESS_EQ_PRODUCED";
            case CATEGORY_D: return "PRODUCED-DIFF";
            default: return "AMBIGUOUS";
        }
    }

    private BackfillEligibility resolveEligibility(ProductionEntry e, BigDecimal effectiveInput) {
        if (effectiveInput == null) {
            return BackfillEligibility.QUARANTINE;
        }
        if (allocationExceeds(e, effectiveInput)) {
            return BackfillEligibility.BLOCK; // over-allocation -> would create incorrect quantity history
        }
        return BackfillEligibility.ELIGIBLE;
    }

    private InputResolutionResult overAllocationBlockIfNeeded(ProductionEntry e, BigDecimal process,
                                                              InputResolutionResult d) {
        if (allocationExceeds(e, process)) {
            return d.withEligibility(BackfillEligibility.BLOCK)
                    .withReasonCode("OVERALLOCATION")
                    .withConfidence(ResolutionConfidence.LOW);
        }
        return d;
    }

    private InputResolutionResult unknown(ProductionEntry e, String reason, BackfillEligibility elig) {
        return InputResolutionResult.builder()
                .entryNumber(e.getEntryNumber())
                .legacyId(e.getId())
                .category(InputSemanticCategory.CATEGORY_UNKNOWN)
                .authority(InputAuthority.AMBIGUOUS)
                .confidence(ResolutionConfidence.LOW)
                .eligibility(elig)
                .reasonCode(reason)
                .build();
    }

    private BigDecimal allocatedOutputs(ProductionEntry e) {
        BigDecimal sum = BigDecimal.ZERO;
        sum = sum.add(nz(e.getGoodQuantity()));
        sum = sum.add(nz(e.getRejectedQuantity()));
        sum = sum.add(nz(e.getReworkQuantity()));
        sum = sum.add(nz(e.getScrapQuantity()));
        return sum;
    }

    private boolean allocationExceeds(ProductionEntry e, BigDecimal input) {
        return input != null && allocatedOutputs(e).compareTo(input) > 0;
    }

    private boolean isNegative(BigDecimal v) {
        return v != null && v.signum() < 0;
    }

    private boolean isNegativeOutput(ProductionEntry e) {
        return isNegative(e.getGoodQuantity()) || isNegative(e.getRejectedQuantity())
                || isNegative(e.getReworkQuantity()) || isNegative(e.getScrapQuantity());
    }

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}