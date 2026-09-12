package in.zygertechnology.zygererp.dto.dryrun;

import lombok.Builder;
import lombok.Data;

/**
 * P3.1 — A single dry-run finding.
 */
@Data
@Builder
public class DryRunFinding {

    private DryRunFindingSeverity severity;
    private String code;
    private String message;
    /** Optional affected business key, e.g. an entry_number. */
    private String affectedKey;
}