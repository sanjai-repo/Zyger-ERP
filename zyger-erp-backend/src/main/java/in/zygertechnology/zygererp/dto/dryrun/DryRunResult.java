package in.zygertechnology.zygererp.dto.dryrun;

import lombok.Builder;
import lombok.Data;
import lombok.Singular;

import java.util.List;

/**
 * P3.1 — The complete read-only dry-run report document data model.
 *
 * <p>Instantiated by {@link in.zygertechnology.zygererp.service.ProductionBackfillDryRunService}
 * and rendered into {@code DOCUMENT_28}. The dry-run NEVER writes to any table.
 */
@Data
@Builder
public class DryRunResult {

    private DryRunDatasetCounts datasetCounts;

    @Singular("entry")
    private List<EntryReconciliation> entries;

    @Singular("level")
    private List<LevelReconciliation> levels;

    @Singular("reversal")
    private List<ReversalValidation> reversals;

    @Singular("field")
    private List<DryRunFieldMapping> lossLedger;

    @Singular("finding")
    private List<DryRunFinding> findings;

    private DryRunPerformance performance;

    /** Proven by the service: event tables, legacy tables and stock tables unchanged. */
    private boolean readOnlyProven;
    /** Static bytecode + dependency scan found no StockService / stock_balance path. */
    private boolean inventoryIsolationProven;

    /** Long-form report body assembled for DOCUMENT_28. */
    @Builder.Default
    private String markdownReport = "";

    public void setMarkdownReport(String markdownReport) {
        this.markdownReport = markdownReport;
    }
}