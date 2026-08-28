package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Spec §4.2 / §9: every status change writes a row here.
 * This is the core trackability table — current status shows where a record
 * is; history shows its entire journey.
 */
@Entity
@Table(name = "quality_inspection_status_history", indexes = {
        @Index(name = "idx_qish_inspection", columnList = "inspection_id"),
        @Index(name = "idx_qish_changed", columnList = "changed_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QualityInspectionStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "inspection_id", nullable = false)
    Long inspectionId;

    @Column(name = "inspection_number", length = 30)
    String inspectionNumber;

    @Column(name = "inspection_type", length = 30)
    String inspectionType;

    @Column(name = "previous_status", length = 30)
    String previousStatus;

    @Column(name = "new_status", length = 30, nullable = false)
    String newStatus;

    @Column(name = "remarks", length = 500)
    String remarks;

    @Column(name = "changed_by", length = 60, nullable = false)
    String changedBy;

    @Column(name = "changed_at", nullable = false)
    @Builder.Default Instant changedAt = Instant.now();

    // SLA capture at time of transition
    @Column(name = "assigned_at")
    Instant assignedAt;
    @Column(name = "started_at")
    Instant startedAt;
    @Column(name = "completed_at")
    Instant completedAt;
}
