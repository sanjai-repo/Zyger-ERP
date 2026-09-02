package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "escalation_log")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class EscalationLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id")
    EscalationRule rule;

    @Column(name = "doc_key", length = 60, nullable = false)
    String docKey;

    @Column(name = "doc_id", nullable = false)
    Long docId;

    @Column(length = 30, nullable = false)
    String action; // SENT, ACKNOWLEDGED, ESCALATED

    @Column(name = "escalated_to", length = 60)
    String escalatedTo;

    String reason;

    @Builder.Default
    Instant createdAt = Instant.now();
}
