package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * P3 correction (RC-2) — Job-level backfill progress/resume marker.
 *
 * <p>This table is a CONTROLLED backfill mechanism, NOT an execution authority and NOT
 * a production-data writer. It records the progress of a backfill run per scope unit
 * (job card), enabling restart/resume without duplicating or skipping entries.
 *
 * <p>Job-level {@code status} uses ONE vocabulary:
 * {@code NOT_STARTED / RUNNING / PAUSED / FAILED / COMPLETED / RECONCILIATION_FAILED / ROLLED_BACK}.
 * Per-entry outcomes are a SEPARATE concept modelled in
 * {@link ProdBackfillEntryOutcome}.
 *
 * <p>This entity never calls StockService and never writes stock_ledger/stock_balance.
 */
@Entity
@Table(name = "prod_backfill_progress",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_prod_backfill_progress_job", columnNames = "job_id"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProdBackfillProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique backfill run identity (UUID string). */
    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    /** Scope unit — one row per job card. */
    @Column(name = "job_card_number", length = 60)
    private String jobCardNumber;

    /** Job-level state (single vocabulary, see class javadoc). */
    @Column(name = "status", nullable = false, length = 30)
    private String status;

    /** Watermark of the last production_entry.id ATTEMPTED within scope. */
    @Column(name = "last_processed_entry_id")
    private Long lastProcessedEntryId;

    /** Watermark of the last production_entry.id COMMITTED (safe resume point). */
    @Column(name = "last_successful_entry_id")
    private Long lastSuccessfulEntryId;

    /** Current batch/chunk ordinal. */
    @Column(name = "batch_number")
    private Long batchNumber;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "failure_count")
    private Long failureCount;

    @Column(name = "last_error", length = 2000)
    private String lastError;

    @Column(name = "quarantine_count")
    private Long quarantineCount;

    @Column(name = "processed_count")
    private Long processedCount;

    @Column(name = "success_count")
    private Long successCount;

    @Column(name = "skip_count")
    private Long skipCount;

    @Column(name = "reconciliation_status", length = 30)
    private String reconciliationStatus;

    /** Optimistic lock — prevents concurrent claim of the same scope row. */
    @Version
    private Long version;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}