package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * P9 — Audit log for first-class disposition documents
 * (rejection / scrap / rework create · submit · approve · post · reverse · cancel · close).
 */
@Entity
@Table(name = "production_disposition_audit_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionDispositionAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "doc_family", length = 20, nullable = false)
    private String docFamily;

    @Column(name = "doc_id", nullable = false)
    private Long docId;

    @Column(name = "doc_number", length = 80)
    private String docNumber;

    @Column(name = "event_type", length = 30, nullable = false)
    private String eventType;

    @Column(name = "user_id", length = 80)
    private String userId;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;
}