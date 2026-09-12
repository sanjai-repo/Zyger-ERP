package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "tool_service_rectification")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ToolServiceRectification {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rectification_number", unique = true, length = 60)
    private String rectificationNumber;

    @Column(name = "service_id")
    private Long serviceId;

    @Column(name = "service_number", length = 60)
    private String serviceNumber;

    @Column(name = "tool_id", length = 60)
    private String toolId;

    @Column(name = "technician_code", length = 60)
    private String technicianCode;

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(name = "corrective_action", columnDefinition = "TEXT")
    private String correctiveAction;

    @Column(name = "service_start")
    private Instant serviceStart;

    @Column(name = "service_end")
    private Instant serviceEnd;

    @Column(name = "parts_used", columnDefinition = "TEXT")
    private String partsUsed;

    @Column(name = "plant_id")
    private Long plantId;

    @Column(name = "service_cost", precision = 18, scale = 2)
    private BigDecimal serviceCost;

    @Column(name = "tool_condition_after", length = 30)
    private String toolConditionAfter;

    @Column(length = 30)
    private String result;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

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
