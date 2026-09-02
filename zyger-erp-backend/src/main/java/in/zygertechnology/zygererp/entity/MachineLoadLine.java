package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "machine_load_line")
@Getter
@Setter
public class MachineLoadLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "load_plan_id", nullable = false)
    MachineLoadPlan loadPlan;

    @Column(name = "machine_code", length = 60)
    String machineCode;

    @Column(name = "work_center_code", length = 60)
    String workCenterCode;

    @Column(name = "load_date")
    Instant loadDate;

    @Column(name = "shift_name", length = 30)
    String shiftName;

    @Column(name = "available_hours", precision = 6, scale = 2)
    BigDecimal availableHours;

    @Column(name = "planned_load_hours", precision = 6, scale = 2)
    BigDecimal plannedLoadHours;

    @Column(name = "utilization_percent", precision = 5, scale = 2)
    BigDecimal utilizationPercent;

    @Column(name = "is_overloaded")
    Boolean isOverloaded;

    @Column(name = "overload_hours", precision = 6, scale = 2)
    BigDecimal overloadHours;

    @Column(name = "wo_number", length = 60)
    String woNumber;

    @Column(name = "operation_sequence")
    Integer operationSequence;

    @Column(name = "wo_operation_code", length = 60)
    String woOperationCode;

    @Column(name = "setup_hours", precision = 6, scale = 2)
    BigDecimal setupHours;

    @Column(name = "run_hours", precision = 6, scale = 2)
    BigDecimal runHours;

    @Column(name = "sequence_on_machine")
    Integer sequenceOnMachine;

    @Column(length = 200)
    String remarks;

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}
