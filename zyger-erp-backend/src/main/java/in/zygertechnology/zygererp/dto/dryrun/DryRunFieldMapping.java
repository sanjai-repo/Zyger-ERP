package in.zygertechnology.zygererp.dto.dryrun;

import lombok.Builder;
import lombok.Data;

/**
 * P3.1 — One row of the executable field loss ledger. Precisely one row exists for
 * every legacy {@code production_entry*} column, so no field can be silently dropped.
 */
@Data
@Builder
public class DryRunFieldMapping {

    private String sourceTable;
    private String sourceField;
    private DryRunFieldClassification classification;
    /** Normalized target (e.g. {@code prod_execution_session.available_input}) or blank. */
    private String target;
    /** Transformation rule, or a short reason for non-mapped classifications. */
    private String transformation;
    /** Business purpose of the field (why it matters). */
    private String businessPurpose;
    /** Production process affected if the field were unavailable to normalized reads. */
    private String affectedProcess;
    /** Gap description (only for NOT_YET_REPRESENTED / PRESERVED categories). */
    private String normalizedGap;
    /** Proposed resolution for the gap. */
    private String proposedResolution;
    /** Whether this gap blocks an actual backfill. */
    private boolean blocksBackfill;
    /** Human-readable loss-risk assessment. */
    private String lossRisk;
}