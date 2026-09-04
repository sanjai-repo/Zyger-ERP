package in.zygertechnology.zygererp.dto.dryrun;

import lombok.Builder;
import lombok.Data;

/**
 * P3.1 — Dry-run performance measurement (DOCUMENT_28 §12).
 */
@Data
@Builder
public class DryRunPerformance {

    private long recordsProcessed;
    private long durationMillis;
    private double recordsPerSecond;
    /** Memory / batch notes. */
    private String notes;
}