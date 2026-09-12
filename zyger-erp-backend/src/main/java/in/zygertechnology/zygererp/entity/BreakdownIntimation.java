package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "breakdown_intimation")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class BreakdownIntimation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "breakdown_number", unique = true, length = 60)
    private String breakdownNumber;

    @Column(name = "breakdown_date")
    private LocalDate breakdownDate;

    @Column(name = "breakdown_time")
    private LocalTime breakdownTime;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "machine_status", length = 30)
    private String machineStatus;

    @Column(name = "reported_by", length = 60)
    private String reportedBy;

    @Column(name = "operator_code", length = 60)
    private String operatorCode;

    @Column(name = "shift_code", length = 60)
    private String shiftCode;

    @Column(name = "breakdown_category", length = 60)
    private String breakdownCategory;

    @Column(name = "cnc_alarm_code", length = 60)
    private String cncAlarmCode;

    @Column(name = "problem_description", columnDefinition = "TEXT")
    private String problemDescription;

    @Column(name = "production_impact", length = 30)
    private String productionImpact;

    @Column(length = 20)
    private String priority;

    @Column(length = 30)
    private String status;

    @Column(name = "breakdown_start_time")
    private Instant breakdownStartTime;

    @Column(name = "assigned_to", length = 60)
    private String assignedTo;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(length = 500)
    private String remarks;

    @Column(name = "breakdown_category_id")
    private Long breakdownCategoryId;

    @Column(name = "operator_id")
    private Long operatorId;

    @Column(name = "shift_id")
    private Long shiftId;

    @Version private Long version;
    @Column(name = "created_by", length = 60) private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_by", length = 60) private String updatedBy;
    @Column(name = "updated_at") private Instant updatedAt;
    @Builder.Default
    @Column(nullable = false) private Boolean deleted = false;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by", length = 60) private String deletedBy;
}
