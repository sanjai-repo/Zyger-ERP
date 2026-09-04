package in.zygertechnology.zygererp.dto.dryrun;

import lombok.Builder;
import lombok.Data;
import lombok.Singular;

import java.util.List;

/**
 * P3.1 — Dataset counts by legacy status (DOCUMENT_28 §3).
 */
@Data
@Builder
public class DryRunDatasetCounts {

    private long total;
    @Singular("byStatus")
    private List<StatusCount> byStatus;
    private long reversalRows;

    @Data
    public static class StatusCount {
        private String status;
        private long count;

        public StatusCount() {
        }

        public StatusCount(String status, long count) {
            this.status = status;
            this.count = count;
        }
    }
}