package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * P3 — Normalized per-output outcome event (child of {@link ProdOperationEvent}).
 *
 * <p>DERIVED PROJECTION ONLY (P3-01). One row per
 * (session, operation_event, output_type, item_code, location) — the
 * deterministic natural key enforced by UNIQUE in V4 (P3-03). {@code output_type}
 * is a CATEGORY (ACCEPTED/REJECTED/REWORK/SCRAP), not a lifecycle status.
 *
 * <p>This row NEVER invokes {@code StockService} (P3-05): inventory remains
 * posted exclusively by the authoritative Production POST -> boundary chain.
 */
@Entity
@Table(name = "prod_output_event",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_prod_output_event_key",
                columnNames = {"session_id", "operation_event_id", "output_type", "item_code", "location"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProdOutputEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private ProdExecutionSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operation_event_id", nullable = false)
    @JsonIgnore
    private ProdOperationEvent operationEvent;

    @Column(name = "output_type", nullable = false, length = 30)
    private String outputType;

    @Column(name = "item_code", length = 60)
    private String itemCode;

    @Column(name = "location", nullable = false, length = 60)
    @Builder.Default
    private String location = "STORE";

    @Column(name = "quantity", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(name = "reason_code", length = 120)
    private String reasonCode;

    @Column(name = "created_at")
    private Instant createdAt;
}