package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "machine_load_wo_mapping")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class MachineLoadWOMapping {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "machine_load_plan_id", nullable = false)
    MachineLoadPlan machineLoadPlan;
    @Column(name = "work_order_id", nullable = false) Long workOrderId;
    @Column(name = "wo_number", length = 60) String woNumber;
    @Column(name = "job_card_id") Long jobCardId;
    @Column(name = "operation_seq") Integer operationSeq;
    @Column(name = "planned_start") LocalDate plannedStart;
    @Column(name = "planned_end") LocalDate plannedEnd;
    @Column(precision = 12, scale = 2) BigDecimal estimatedHours;
    @Builder.Default Integer priority = 50;
    @Column(length = 30) @Builder.Default String status = "PLANNED";
    /** FRS §3.7: structured reschedule action */
    @Column(name = "reschedule_action", length = 30) String rescheduleAction;
    /** FRS §3.7: target machine for reschedule */
    @Column(name = "reschedule_machine_code", length = 60) String rescheduleMachineCode;
    /** FRS §3.7: target shift for reschedule */
    @Column(name = "reschedule_shift", length = 60) String rescheduleShift;
    /** FRS §3.7: target date for reschedule */
    @Column(name = "reschedule_date") java.time.LocalDate rescheduleDate;
}
