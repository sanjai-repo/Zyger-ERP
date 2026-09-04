package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * P3 correction (RC-2) — Per-entry backfill outcome / audit trail.
 *
 * <p>Records the outcome of each {@code production_entry} processed by a controlled
 * backfill run. Outcome is a SEPARATE concept from job-level progress
 * ({@link ProdBackfillProgress}); a single job may have many entry outcomes.
 *
 * <p>Per-entry outcomes (single vocabulary):
 * {@code PROJECTED / ALREADY_PROJECTED / QUARANTINED / FAILED / SKIPPED}.
 *
 * <p>Manual resolution is ADDITIVE: a {@code QUARANTINED} entry may later receive a
 * {@code MANUAL_RESOLUTION_NOTE} and be re-marked ELIGIBLE by the resolver, but the
 * legacy {@code production_entry} historical data is never updated by backfill.
 */
@Entity
@Table(name = "prod_backfill_entry_outcome",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_prod_backfill_entry_outcome_job_entry",
                columnNames = {"job_id", "entry_number"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProdBackfillEntryOutcome {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    @Column(name = "entry_number", nullable = false, length = 60)
    private String entryNumber;

    @Column(name = "legacy_id")
    private Long legacyId;

    /** Per-entry outcome: PROJECTED / ALREADY_PROJECTED / QUARANTINED / FAILED / SKIPPED. */
    @Column(name = "outcome", nullable = false, length = 30)
    private String outcome;

    /** Semantic category from the resolver. */
    @Column(name = "semantic_category", length = 30)
    private String semanticCategory;

    /** Authority from the resolver (PROCESS_QTY / AMBIGUOUS). */
    @Column(name = "authority", length = 30)
    private String authority;

    /** Resolver reason code, e.g. INPUT-AUTHORITY-NULL. */
    @Column(name = "reason_code", length = 60)
    private String reasonCode;

    /** Effective input used (may be null for QUARANTINE/BLOCK). */
    @Column(name = "effective_input", precision = 18, scale = 4)
    private BigDecimal effectiveInput;

    /** Eligibility at processing time. */
    @Column(name = "eligibility", length = 30)
    private String eligibility;

    /** Human note for manual resolution; never modifies legacy data. */
    @Column(name = "resolution_note", length = 2000)
    private String resolutionNote;

    @Column(name = "created_at")
    private Instant createdAt;
}