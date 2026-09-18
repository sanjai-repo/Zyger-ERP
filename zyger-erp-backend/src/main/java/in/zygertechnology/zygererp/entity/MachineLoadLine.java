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

    /** FRS §8: planned job on this row — links back to the Work Order + Route operation. */
    @Column(name = "item_code", length = 60)
    String itemCode;

    @Column(name = "item_name", length = 200)
    String itemName;

    @Column(name = "process_name", length = 200)
    String processName;

    @Column(name = "process_qty", precision = 38, scale = 6)
    BigDecimal processQty;

    /** Total planned process hours = (setup + run × qty), inflated as needed; used for capacity compare. */
    @Column(name = "process_time_hrs", precision = 12, scale = 4)
    BigDecimal processTimeHrs;

    /** FRS §8 rule 2 / §19: this plan row's Start must not precede this value. */
    @Column(name = "previous_process_end")
    Instant previousProcessEnd;

    @Column(name = "start_time")
    Instant startTime;

    @Column(name = "end_time")
    Instant endTime;

    @Column(name = "total_time_sec")
    Long totalTimeSec;

    @Column(name = "operator_code", length = 60)
    String operatorCode;

    @Column(name = "tool_code", length = 60)
    String toolCode;

    @Column(length = 200)
    String remarks;

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}
