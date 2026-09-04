package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * P3 — Normalized per-operation event (child of {@link ProdExecutionSession}).
 *
 * <p>DERIVED PROJECTION ONLY (P3-01). One row per
 * (session, subjob_number, operation_code, seq) — that quartet is the
 * deterministic natural key enforced by UNIQUE in V4, making replay
 * idempotent (P3-03). The lifecycle is namespaced here
 * (PENDING -> IN_PROGRESS -> COMPLETED -> REVERSED) and is never surfaced as a
 * {@code production_entry}/{@code job_card} status (P3 no-conflict rule).
 */
@Entity
@Table(name = "prod_operation_event",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_prod_operation_event_session_key",
                columnNames = {"session_id", "subjob_number", "operation_code", "seq"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProdOperationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private ProdExecutionSession session;

    @Column(name = "subjob_number", length = 60)
    private String subjobNumber;

    @Column(name = "operation_code", length = 60)
    private String operationCode;

    @Column(name = "seq", nullable = false)
    @Builder.Default
    private Integer seq = 0;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "operator_code", length = 60)
    private String operatorCode;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "operation_status", nullable = false, length = 30)
    @Builder.Default
    private String operationStatus = "PENDING";

    @Column(name = "hold_reason", length = 255)
    private String holdReason;

    @Column(name = "created_at")
    private Instant createdAt;

    @OneToMany(mappedBy = "operationEvent", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProdOutputEvent> outputEvents = new ArrayList<>();

    public void setOutputEvents(List<ProdOutputEvent> list) {
        this.outputEvents.clear();
        if (list != null) {
            for (ProdOutputEvent o : list) {
                o.setOperationEvent(this);
                this.outputEvents.add(o);
            }
        }
    }
}