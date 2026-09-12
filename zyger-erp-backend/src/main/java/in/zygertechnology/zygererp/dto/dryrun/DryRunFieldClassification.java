package in.zygertechnology.zygererp.dto.dryrun;

/**
 * P3.1 — Dry-run field-loss classification (DOCUMENT_27 Rule 3).
 *
 * <p>Every legacy {@code production_entry*} field must be classified exactly once
 * as one of these values so that no data-bearing business field silently
 * disappears from the normalized reporting surface.
 */
public enum DryRunFieldClassification {
    /** Directly copied into a normalized event column. */
    MAPPED,
    /** Computed from one or more source fields (e.g. WIP = input - outputs). */
    DERIVED,
    /** Remains authoritative in the legacy table; not (yet) in the normalized event surface. */
    PRESERVED_IN_LEGACY,
    /** Absent from the normalized model in a way that blocks a faithful backfill / read. */
    NOT_YET_REPRESENTED_BLOCKER,
    /** Deliberately excluded from the normalized execution model (informational/audit/planning). */
    INTENTIONALLY_OUT_OF_SCOPE
}