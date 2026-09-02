package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "escalation_rule")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class EscalationRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "doc_key", length = 60, nullable = false)
    String docKey;

    @Column(length = 20, nullable = false)
    String priority; // HIGH, CRITICAL

    @Column(name = "sla_hours", nullable = false)
    Integer slaHours;

    @Column(name = "escalate_to_role", length = 60, nullable = false)
    String escalateToRole;

    @Column(name = "notify_channels", length = 200)
    @Builder.Default String notifyChannels = "IN_APP";

    @Builder.Default Boolean active = Boolean.TRUE;

    @Builder.Default Instant createdAt = Instant.now();
}
