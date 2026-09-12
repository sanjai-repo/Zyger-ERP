package in.zygertechnology.zygererp.dto.dryrun;

/**
 * P3.1 — Dry-run finding severity (DOCUMENT_28 §13).
 */
public enum DryRunFindingSeverity {
    /** Blocks actual backfill until resolved. */
    BLOCKING,
    /** Significant; requires reviewer decision before backfill. */
    HIGH,
    /** Moderate; documented, non-blocking, may be addressed later. */
    MEDIUM,
    /** Minor; recorded for completeness. */
    LOW,
    /** Contextual note; no action required. */
    INFORMATION
}