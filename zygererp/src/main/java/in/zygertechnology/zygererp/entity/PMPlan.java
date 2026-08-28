package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "pm_plan")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class PMPlan {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_number", unique = true, length = 60)
    private String planNumber;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "maintenance_type", length = 60)
    private String maintenanceType;

    @Column(length = 30)
    private String frequency;

    @Column(name = "responsible_department", length = 60)
    private String responsibleDepartment;

    @Column(name = "responsible_technician", length = 60)
    private String responsibleTechnician;

    @Column(name = "estimated_duration_hours", precision = 10, scale = 2)
    private BigDecimal estimatedDurationHours;

    @Column(name = "checklist_items", columnDefinition = "TEXT")
    private String checklistItems;

    @Column(name = "required_spare_parts", columnDefinition = "TEXT")
    private String requiredSpareParts;

    @Column(name = "required_tools", columnDefinition = "TEXT")
    private String requiredTools;

    @Column(name = "safety_instructions", columnDefinition = "TEXT")
    private String safetyInstructions;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "last_maintenance_date")
    private LocalDate lastMaintenanceDate;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Column(name = "checklist_template_id")
    private Long checklistTemplateId;

    @Column(name = "responsible_department_id")
    private Long responsibleDepartmentId;

    @Column(name = "default_technician_id")
    private Long defaultTechnicianId;

    @Version private Long version;
    @Column(name = "created_by", length = 60) private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_by", length = 60) private String updatedBy;
    @Column(name = "updated_at") private Instant updatedAt;
    @Column(nullable = false) private Boolean deleted = false;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by", length = 60) private String deletedBy;
}
