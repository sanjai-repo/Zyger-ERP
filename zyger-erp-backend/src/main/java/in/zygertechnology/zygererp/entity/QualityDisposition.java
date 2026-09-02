package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Spec §9: records the disposition of failed/hold material
 * (Rework, Scrap, Return, Concession) with mandatory reason
 * and downstream reference.
 */
@Entity
@Table(name = "quality_disposition", indexes = {
        @Index(name = "idx_qd_inspection", columnList = "inspection_id"),
        @Index(name = "idx_qd_ncr", columnList = "ncr_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QualityDisposition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "inspection_id")
    Long inspectionId;

    @Column(name = "ncr_id")
    Long ncrId;

    @Column(name = "disposition_type", nullable = false, length = 30)
    String dispositionType;   // Rework, Scrap, Return, Concession

    @Column(name = "quantity")
    BigDecimal quantity;

    @Column(name = "reason", nullable = false, length = 500)
    String reason;

    /** Auto-created downstream doc number (Rework Job / Scrap Entry / Return DC / Concession No.) */
    @Column(name = "downstream_reference", length = 60)
    String downstreamReference;

    @Column(name = "authorized_by", length = 60)
    String authorizedBy;

    @Column(name = "authorized_at")
    Instant authorizedAt;

    @Column(name = "created_by", length = 60)
    String createdBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default Instant createdAt = Instant.now();
}
