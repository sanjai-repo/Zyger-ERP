package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "tool_service_intimation")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ToolServiceIntimation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "service_number", unique = true, length = 60)
    private String serviceNumber;

    @Column(name = "tool_id", length = 60)
    private String toolId;

    @Column(name = "tool_type", length = 60)
    private String toolType;

    @Column(name = "tool_description", length = 255)
    private String toolDescription;

    @Column(name = "tool_serial_number", length = 60)
    private String toolSerialNumber;

    @Column(name = "current_location", length = 60)
    private String currentLocation;

    @Column(name = "reported_by", length = 60)
    private String reportedBy;

    @Column(name = "service_date")
    private LocalDate serviceDate;

    @Column(name = "problem_description", columnDefinition = "TEXT")
    private String problemDescription;

    @Column(name = "service_reason", length = 120)
    private String serviceReason;

    @Column(name = "tool_condition", length = 30)
    private String toolCondition;

    @Column(length = 20)
    private String priority;

    @Column(name = "plant_id")
    private Long plantId;

    @Column(length = 120)
    private String vendor;

    @Column(name = "vendor_id")
    private Long vendorId;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Version private Long version;
    @Column(name = "created_by", length = 60) private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_by", length = 60) private String updatedBy;
    @Column(name = "updated_at") private Instant updatedAt;
    @Column(nullable = false) private Boolean deleted = false;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by", length = 60) private String deletedBy;
}
