package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "meter_master")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class MeterMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", nullable = false)
    PlantMaster plant;

    @Column(length = 60, unique = true, nullable = false)
    String code;

    @Column(length = 120, nullable = false)
    String name;

    @Column(length = 20, nullable = false)
    String meterType; // POWER, WATER

    @Column(length = 200)
    String location;

    @Column(name = "machine_id")
    Long machineId;

    @Column(name = "budget_monthly_units")
    BigDecimal budgetMonthlyUnits;

    @Builder.Default Boolean active = Boolean.TRUE;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;

    @PrePersist void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
