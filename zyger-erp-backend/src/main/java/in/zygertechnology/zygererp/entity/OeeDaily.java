package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "oee_daily", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"plant_id", "machine_id", "oee_date"})
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class OeeDaily {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", insertable = false, updatable = false)
    PlantMaster plant;

    @Column(name = "plant_id")
    @Builder.Default
    Long plantId = 1L;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id", insertable = false, updatable = false)
    MachineMaster machine;

    @Column(name = "machine_id")
    Long machineId;

    @Column(name = "machine_code", length = 60)
    String machineCode;

    @Column(name = "oee_date", nullable = false)
    LocalDate oeeDate;

    @Column(name = "planned_time_min", precision = 10, scale = 2)
    BigDecimal plannedTimeMin;

    @Column(name = "run_time_min", precision = 10, scale = 2)
    BigDecimal runTimeMin;

    @Column(name = "downtime_min", precision = 10, scale = 2)
    BigDecimal downtimeMin;

    @Column(name = "ideal_cycle_time_sec", precision = 10, scale = 4)
    BigDecimal idealCycleTimeSec;

    @Column(name = "good_qty", precision = 12, scale = 2)
    @Builder.Default BigDecimal goodQty = BigDecimal.ZERO;

    @Column(name = "total_qty", precision = 12, scale = 2)
    @Builder.Default BigDecimal totalQty = BigDecimal.ZERO;

    @Column(precision = 6, scale = 4)
    BigDecimal availability;

    @Column(precision = 6, scale = 4)
    BigDecimal performance;

    @Column(name = "quality_rate", precision = 6, scale = 4)
    BigDecimal qualityRate;

    @Column(precision = 6, scale = 4)
    BigDecimal oee;

    @Builder.Default
    Instant createdAt = Instant.now();
}
