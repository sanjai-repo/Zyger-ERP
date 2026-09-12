package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "inspection_plan", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"plant_id", "item_code", "drawing_number", "drawing_revision", "operation", "inspection_type"})
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class InspectionPlan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", nullable = false)
    PlantMaster plant;

    @Column(name = "item_code", length = 60, nullable = false)
    String itemCode;

    @Column(name = "drawing_number", length = 60)
    String drawingNumber;

    @Column(name = "drawing_revision", length = 30)
    String drawingRevision;

    String operation;

    @Column(name = "inspection_type", length = 30, nullable = false)
    String inspectionType;

    @Column(precision = 6, scale = 2)
    @Builder.Default BigDecimal aql = new BigDecimal("1.0");

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sampling_plan_id")
    SamplingPlanMaster samplingPlan;

    @Builder.Default Boolean active = Boolean.TRUE;

    /** Business revision number. Increments each time the plan is published. */
    @Column(name = "revision_no")
    @Builder.Default Integer revisionNo = 1;

    /** DRAFT / PUBLISHED / RETIRED */
    @Column(name = "plan_status", length = 20)
    @Builder.Default String planStatus = "DRAFT";

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @Version Long version;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    List<InspectionPlanCharacteristic> characteristics = new ArrayList<>();

    @PrePersist void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
