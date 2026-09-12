package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "pm_work_order", indexes = {
        @Index(name = "idx_pwo_machine", columnList = "machine_code"),
        @Index(name = "idx_pwo_status", columnList = "status")})
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class PmWorkOrder {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_order_number", unique = true, length = 60)
    private String workOrderNumber;

    @Column(name = "schedule_id")
    private Long scheduleId;

    @Column(name = "schedule_number", length = 60)
    private String scheduleNumber;

    @Column(name = "plan_number", length = 60)
    private String planNumber;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(length = 300)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 20)
    @Builder.Default private String priority = "MEDIUM";

    @Column(length = 30)
    @Builder.Default private String status = "DRAFT";

    @Column(name = "assigned_to", length = 60)
    private String assignedTo;

    @Column(name = "assigned_technician_id")
    private Long assignedTechnicianId;

    @Column(name = "released_date")
    private LocalDate releasedDate;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "verified_by", length = 60)
    private String verifiedBy;

    @Column(length = 20)
    private String verdict;

    @Column(length = 500)
    private String remarks;

    @Version private Long version;
    @Column(name = "created_by", length = 60) private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_by", length = 60) private String updatedBy;
    @Column(name = "updated_at") private Instant updatedAt;
    @Column(nullable = false) @Builder.Default private Boolean deleted = false;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by", length = 60) private String deletedBy;
}
