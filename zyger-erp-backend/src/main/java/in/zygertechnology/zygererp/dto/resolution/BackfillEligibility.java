package in.zygertechnology.zygererp.dto.resolution;

/**
 * P3 correction (RC-1) — Backfill eligibility of a {@code production_entry} per its
 * semantic resolution. Determined exclusively by
 * {@link in.zygertechnology.zygererp.service.ProductionInputAuthorityResolver}.
 */
public enum BackfillEligibility {
    /** Safe to include in controlled backfill. */
    ELIGIBLE,
    /** Excluded from automated backfill pending manual review/resolution. */
    QUARANTINE,
    /** Must never be auto-backfilled; requires an explicit decision before any processing. */
    BLOCK
}