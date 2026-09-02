package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;

@Entity @Table(name = "operation_master")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class OperationMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Version Long version;
    @Column(length = 60) String code;
    @Column(length = 200) String name;
    @Column(length = 500) String description;
    @Column(name = "standard_setup_time") BigDecimal standardSetupTime;
    @Column(name = "standard_cycle_time") BigDecimal standardCycleTime;
    @Column(name = "operation_type", length = 30) String operationType;
    @Column(name = "inspection_required") @Builder.Default Boolean inspectionRequired = Boolean.FALSE;
    @Column(name = "skill_required", length = 100) String skillRequired;
    @Column(name = "default_work_center", length = 60) String defaultWorkCenter;
    @Column(name = "machine_requirement", length = 200) String machineRequirement;
    @Column(name = "tool_requirement", length = 200) String toolRequirement;
    @Builder.Default Boolean active = Boolean.TRUE;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}
