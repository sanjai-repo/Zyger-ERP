package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * P11 — Audit trail for production quality gate override records (CLAR-PROD-012).
 * One row per transition; no duplicate events. Not sensitive beyond usernames.
 */
@Entity
@Table(name = "production_gate_override_audit")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionGateOverrideAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "override_id", nullable = false)
    private Long overrideId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "previous_status")
    private String previousStatus;

    @Column(name = "new_status")
    private String newStatus;

    @Column(name = "changed_by_user")
    private String changedByUser;

    @Column(name = "timestamp", nullable = false)
    @Builder.Default
    private Instant timestamp = Instant.now();

    @Column(name = "details_json", columnDefinition = "TEXT")
    private String detailsJson;
}