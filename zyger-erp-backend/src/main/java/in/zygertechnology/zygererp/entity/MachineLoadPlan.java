package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "machine_load_plan")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class MachineLoadPlan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "plan_number", unique = true, length = 60) String planNumber;
    @Builder.Default
    @Column(name = "plant_id") Long plantId = 1L;
    @Column(name = "machine_id") Long machineId;
    @Column(name = "machine_code", length = 60) String machineCode;
    @Column(name = "work_center_id") Long workCenterId;
    @Column(name = "plan_from") LocalDate planFrom;
    @Column(name = "plan_to") LocalDate planTo;
    @Column(precision = 12, scale = 2) BigDecimal totalCapacityHours;
    @Column(precision = 12, scale = 2) BigDecimal loadedHours;
    @Column(precision = 12, scale = 2) BigDecimal availableHours;
    @Column(length = 30) @Builder.Default String status = "DRAFT";
    @Column(name = "generated_date") Instant generatedDate;
    @Column(name = "generated_by", length = 100) String generatedBy;
    @Column(length = 500) String remarks;
    @Version Long version;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;

    @OneToMany(mappedBy = "machineLoadPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<MachineLoadWOMapping> woMappings = new ArrayList<>();

    @PrePersist void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (createdBy == null || createdBy.isBlank()) createdBy = "system";
    }
}
