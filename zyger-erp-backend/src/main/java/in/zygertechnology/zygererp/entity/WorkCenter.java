package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;

@Entity @Table(name = "work_center")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkCenter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Version Long version;
    @Column(length = 60) String code;
    @Column(length = 200) String name;
    @Column(length = 60) String department;
    @Column(name = "machine_group", length = 60) String machineGroup;
    @Column(name = "default_shift", length = 30) String defaultShift;
    @Column(name = "capacity_per_day") BigDecimal capacityPerDay;
    @Column(name = "efficiency_pct") BigDecimal efficiencyPct;
    @Column(name = "utilization_pct") BigDecimal utilizationPct;
    @Column(name = "hourly_rate") BigDecimal hourlyRate;
    @Column(name = "setup_rate") BigDecimal setupRate;
    @Column(name = "labor_rate") BigDecimal laborRate;
    @Builder.Default Boolean active = Boolean.TRUE;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}
