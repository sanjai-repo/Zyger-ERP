package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * P3 — Aggregate root of the normalized operation-event projection.
 *
 * <p>DERIVED PROJECTION ONLY (P3-01). One row per authoritative
 * {@code production_entry.entry_number}. It is NEVER an independent
 * transaction authority, and it NEVER postings inventory (P3-05).
 * The row is insert-once: the UNIQUE(entry_number) natural key makes replay
 * idempotent (P3-03). Reversal of a POSTED entry creates a compensating
 * negated session mirror, never an in-place edit (P3-06).
 */
@Entity
@Table(name = "prod_execution_session",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_prod_execution_session_entry", columnNames = "entry_number"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProdExecutionSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entry_number", nullable = false, length = 60)
    private String entryNumber;

    @Column(name = "job_card_number", length = 60)
    private String jobCardNumber;

    @Column(name = "work_order_number", length = 60)
    private String workOrderNumber;

    @Column(name = "subjob_number", length = 60)
    private String subjobNumber;

    @Column(name = "part_code", length = 60)
    private String partCode;

    @Column(name = "part_description", length = 255)
    private String partDescription;

    @Column(name = "session_status", nullable = false, length = 30)
    @Builder.Default
    private String sessionStatus = "OPEN";

    @Column(name = "available_input", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal availableInput = BigDecimal.ZERO;

    @Column(name = "accepted_output", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal acceptedOutput = BigDecimal.ZERO;

    @Column(name = "rejected", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal rejected = BigDecimal.ZERO;

    @Column(name = "rework", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal rework = BigDecimal.ZERO;

    @Column(name = "scrap", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal scrap = BigDecimal.ZERO;

    @Column(name = "wip", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal wip = BigDecimal.ZERO;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_by", length = 60)
    private String createdBy;

    @Column(name = "created_at")
    private Instant createdAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProdOperationEvent> operationEvents = new ArrayList<>();

    public void setOperationEvents(List<ProdOperationEvent> list) {
        this.operationEvents.clear();
        if (list != null) {
            for (ProdOperationEvent op : list) {
                op.setSession(this);
                this.operationEvents.add(op);
            }
        }
    }
}