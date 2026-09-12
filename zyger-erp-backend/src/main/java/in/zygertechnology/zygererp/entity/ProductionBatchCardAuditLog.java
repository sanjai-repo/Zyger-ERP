package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * P10 — Batch Card audit trail (creation, updates, workflow actions, reversals).
 */
@Entity
@Table(name = "production_batch_card_audit_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionBatchCardAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "doc_id", nullable = false)
    private Long docId;

    @Column(name = "doc_number", length = 80)
    private String docNumber;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Column(name = "user_id", length = 80)
    private String userId;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(name = "metadata_json", columnDefinition = "text")
    private String metadataJson;
}
