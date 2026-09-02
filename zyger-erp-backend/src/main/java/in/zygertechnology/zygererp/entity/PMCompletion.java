package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "pm_completion")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class PMCompletion {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "completion_number", unique = true, length = 60)
    private String completionNumber;

    @Column(name = "schedule_id")
    private Long scheduleId;

    @Column(name = "schedule_number", length = 60)
    private String scheduleNumber;

    @Column(name = "plan_number", length = 60)
    private String planNumber;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "technician_code", length = 60)
    private String technicianCode;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "duration_hours", precision = 10, scale = 2)
    private BigDecimal durationHours;

    @Column(name = "checklist_completed", columnDefinition = "TEXT")
    private String checklistCompleted;

    @Column(name = "measurements_recorded", columnDefinition = "TEXT")
    private String measurementsRecorded;

    @Column(name = "spare_parts_used", columnDefinition = "TEXT")
    private String sparePartsUsed;

    @Column(name = "labour_hours", precision = 10, scale = 2)
    private BigDecimal labourHours;

    @Column(length = 30)
    private String result;

    @Column(length = 60)
    private String supervisor;

    @Column(nullable = false)
    @Builder.Default
    private Boolean verified = false;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Column(name = "supervisor_id")
    private Long supervisorId;

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
