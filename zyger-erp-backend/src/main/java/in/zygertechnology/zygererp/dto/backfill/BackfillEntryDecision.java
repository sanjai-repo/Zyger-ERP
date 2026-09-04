package in.zygertechnology.zygererp.dto.backfill;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * P3.3 — Decision/outcome for a single {@code production_entry} in a backfill run.
 *
 * <p>Outcome is one of the shared vocabulary
 * {@code PROJECTED / ALREADY_PROJECTED / QUARANTINED / FAILED / SKIPPED / BLOCKED}.
 * The resolver-derived snapshot (category/authority/reason/effective input/eligibility) is
 * preserved for audit. Created by the read-only dry-run and by the real executor alike.
 */
@Getter
@Builder
public final class BackfillEntryDecision {

    private final String entryNumber;
    private final Long legacyId;
    private final String outcome;

    private final String semanticCategory;
    private final String authority;
    private final String reasonCode;
    private final BigDecimal effectiveInput;
    private final String eligibility;

    /** True when this entry's session already existed before this run (idempotent replay). */
    private final boolean alreadyProjected;
}