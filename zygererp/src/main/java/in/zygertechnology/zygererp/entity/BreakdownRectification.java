package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "breakdown_rectification")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class BreakdownRectification {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rectification_number", unique = true, length = 60)
    private String rectificationNumber;

    @Column(name = "breakdown_id")
    private Long breakdownId;

    @Column(name = "breakdown_number", length = 60)
    private String breakdownNumber;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "technician_code", length = 60)
    private String technicianCode;

    @Column(name = "failure_cause", columnDefinition = "TEXT")
    private String failureCause;

    @Column(name = "corrective_action", columnDefinition = "TEXT")
    private String correctiveAction;

    @Column(name = "spare_parts_used", columnDefinition = "TEXT")
    private String sparePartsUsed;

    @Column(name = "labour_hours", precision = 10, scale = 2)
    private BigDecimal labourHours;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "downtime_minutes", precision = 10, scale = 2)
    private BigDecimal downtimeMinutes;

    @Column(name = "external_vendor", length = 120)
    private String externalVendor;

    @Column(name = "service_cost", precision = 18, scale = 2)
    private BigDecimal serviceCost;

    @Column(name = "testing_result", length = 30)
    private String testingResult;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Column(name = "failure_code_id")
    private Long failureCodeId;

    @Version private Long version;
    @Column(name = "created_by", length = 60) private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_by", length = 60) private String updatedBy;
    @Column(name = "updated_at") private Instant updatedAt;
    @Column(nullable = false) private Boolean deleted = false;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by", length = 60) private String deletedBy;
}
