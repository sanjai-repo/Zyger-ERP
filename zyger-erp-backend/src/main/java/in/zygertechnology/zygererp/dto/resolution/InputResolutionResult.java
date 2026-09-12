package in.zygertechnology.zygererp.dto.resolution;

import lombok.Builder;
import lombok.Data;
import lombok.With;

import java.math.BigDecimal;

/**
 * P3 correction (RC-1) — The result of resolving the input-quantity authority of a single
 * {@code production_entry}. This is the SINGLE shared contract consumed by validation,
 * normalized projection, backfill dry-run, actual backfill, reversal mapping, quantity
 * reconciliation, and quarantine classification.
 *
 * <p>All fields are deterministic given the legacy record. {@link #isResolvable()}
 * is true only when an authoritative {@link #getEffectiveInputQuantity()} can be stated
 * without silent assumption (i.e. authority is {@code PROCESS_QTY}).
 *
 * <p>Immutable value object; {@link #getEligibility()} may be narrowed (QUARANTINE/BLOCK)
 * by the over-allocation rule in the resolver.
 */
@Data
@Builder
@With
public final class InputResolutionResult {

    private final String entryNumber;
    private final Long legacyId;

    /** Semantic category (RC-1). */
    private final InputSemanticCategory category;

    /** Which field is authoritative (PROCESS_QTY or AMBIGUOUS). */
    private final InputAuthority authority;

    /** Effective input quantity — present ONLY when authority is resolvable. */
    private final BigDecimal effectiveInputQuantity;

    /** Confidence of the resolution. */
    private final ResolutionConfidence confidence;

    /** Backfill eligibility for this record. */
    private final BackfillEligibility eligibility;

    /** Stable machine reason code (e.g. INPUT-AUTHORITY-NULL, PRODUCED-DIFF, OVERALLOCATION). */
    private final String reasonCode;

    /** True only when an authoritative effective input can be stated without silence/assumption. */
    public boolean isResolvable() {
        return authority == InputAuthority.PROCESS_QTY && effectiveInputQuantity != null;
    }
}