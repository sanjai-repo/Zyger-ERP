package in.zygertechnology.zygererp.dto.resolution;

/**
 * P3 correction (RC-1) — Confidence level of a quantity-authority resolution, used to
 * relay how strongly the effective input may be trusted for reconciliation/backfill.
 */
public enum ResolutionConfidence {
    /** Both input fields are present and consistent (Category A/C). */
    HIGH,
    /** A single source is present but its input semantics require review (Category B/D). */
    MEDIUM,
    /** State is ambiguous, invalid, or over-allocated; requires investigation (Category UNKNOWN). */
    LOW
}