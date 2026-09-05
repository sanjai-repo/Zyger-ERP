package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * P11 — Production Quality Gate override record (CLAR-PROD-012).
 *
 * <p>An audited, ONE-TIME, operation-scoped authorization that clears a blocked quality gate.
 * Approved only by the joint Quality Supervisor + Production Supervisor signature pair, or by a
 * single Plant Head signature. PPAP-blocked items are never overridable. This is a signature
 * record, not a numbered first-class document (no numbering rule was approved for it).
 */
@Entity
@Table(name = "production_gate_override")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionGateOverride {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_APPLIED = "APPLIED";

    public static final String CATEGORY_JOINT = "JOINT";
    public static final String CATEGORY_PLANT_HEAD = "PLANT_HEAD";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inspection_id", nullable = false)
    private Long inspectionId;

    @Column(name = "inspection_number", nullable = false)
    private String inspectionNumber;

    @Column(name = "job_card_number", nullable = false)
    private String jobCardNumber;

    @Column(name = "operation_code")
    private String operationCode;

    @Column(name = "operation_sequence")
    private Integer operationSequence;

    @Column(name = "item_code", nullable = false)
    private String itemCode;

    @Column(name = "quantity", nullable = false)
    private BigDecimal quantity;

    @Column(name = "batch_number")
    private String batchNumber;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = STATUS_PENDING;

    @Column(name = "quality_approver_user")
    private String qualityApproverUser;

    @Column(name = "quality_approved_at")
    private Instant qualityApprovedAt;

    @Column(name = "production_approver_user")
    private String productionApproverUser;

    @Column(name = "production_approved_at")
    private Instant productionApprovedAt;

    @Column(name = "plant_head_approver_user")
    private String plantHeadApproverUser;

    @Column(name = "plant_head_approved_at")
    private Instant plantHeadApprovedAt;

    @Column(name = "applied_by_user")
    private String appliedByUser;

    @Column(name = "applied_at")
    private Instant appliedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;
}