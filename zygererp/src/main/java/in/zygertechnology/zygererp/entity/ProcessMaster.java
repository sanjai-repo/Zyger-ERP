package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "process_master")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ProcessMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60) String code;
    @Column(length = 200) String name;
    @Column(length = 500) String description;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "process_group_id") ProcessGroup processGroup;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "required_resource_id") ResourceMaster requiredResource;
    @Column(name = "resource_name", length = 200) String resourceName;
    @Column(name = "resource_type", length = 30) String resourceType;
    /** FRS §4.2: Insource or Outsource */
    @Column(name = "process_type", length = 30) String processType;
    @Column(name = "department", length = 100) String department;
    @Column(name = "cycle_time", precision = 10, scale = 2) BigDecimal cycleTime;
    @Column(name = "setup_time", precision = 10, scale = 2) BigDecimal setupTime;
    @Column(name = "unit_rate", precision = 12, scale = 2) BigDecimal unitRate;
    @Column(name = "machine_required") @Builder.Default Boolean machineRequired = Boolean.FALSE;
    @Column(name = "inspection") @Builder.Default Boolean inspection = Boolean.FALSE;
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @Version Long version;

    public boolean isActive() { return Boolean.TRUE.equals(active); }
    public boolean isMachineRequired() { return Boolean.TRUE.equals(machineRequired); }
    public boolean isInspection() { return Boolean.TRUE.equals(inspection); }
}
