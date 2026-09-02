package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "engineering_change")
@Getter
@Setter
@EntityListeners(AuditEntityListener.class)
public class EngineeringChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "ecr_number", unique = true, nullable = false, length = 60)
    String ecrNumber;

    @Column(name = "eco_number", length = 60)
    String ecoNumber;

    @Column(name = "change_type", length = 30)
    String changeType;

    @Column(name = "item_code", length = 60)
    String itemCode;

    @Column(name = "item_description", length = 200)
    String itemDescription;

    @Column(name = "current_revision", length = 30)
    String currentRevision;

    @Column(name = "proposed_revision", length = 30)
    String proposedRevision;

    @Column(name = "description_of_change", length = 1000)
    String descriptionOfChange;

    @Column(name = "reason_for_change", length = 500)
    String reasonForChange;

    @Column(length = 30)
    String priority;

    @Column(length = 30)
    String status;

    @Column(name = "ecr_status", length = 30)
    String ecrStatus = "DRAFT";

    @Column(name = "eco_status", length = 30)
    String ecoStatus = "DRAFT";

    @Column(name = "bom_impact")
    Boolean bomImpact;

    @Column(name = "route_impact")
    Boolean routeImpact;

    @Column(name = "quality_impact")
    Boolean qualityImpact;

    @Column(name = "inventory_impact")
    Boolean inventoryImpact;

    @Column(name = "effective_date")
    Instant effectiveDate;

    @Column(name = "bom_rev_from", length = 30)
    String bomRevFrom;

    @Column(name = "bom_rev_to", length = 30)
    String bomRevTo;

    @Column(name = "route_rev_from", length = 30)
    String routeRevFrom;

    @Column(name = "route_rev_to", length = 30)
    String routeRevTo;

    @Column(name = "drawing_rev_from", length = 30)
    String drawingRevFrom;

    @Column(name = "drawing_rev_to", length = 30)
    String drawingRevTo;

    @Column(name = "impact_analysis_json", columnDefinition = "TEXT")
    String impactAnalysisJson;
    @Column(name = "approved_by_chain", columnDefinition = "TEXT")
    String approvedByChain;
    @Column(name = "implementation_plan", columnDefinition = "TEXT")
    String implementationPlan;
    @Column(name = "cut_in_wo_no", length = 60)
    String cutInWoNo;
    @Column(name = "old_stock_disposition", length = 30)
    String oldStockDisposition;
    @Column(name = "cost_impact_estimate", precision = 18, scale = 4)
    java.math.BigDecimal costImpactEstimate;
    @Column(name = "verified_by", length = 100)
    String verifiedBy;
    @Column(name = "verified_date")
    Instant verifiedDate;
    @Column(name = "closed_date")
    Instant closedDate;

    @Column(name = "requested_by", length = 100)
    String requestedBy;

    @Column(name = "reviewed_by", length = 100)
    String reviewedBy;

    @Column(name = "approved_by", length = 100)
    String approvedBy;

    /** FRS §3.8: gate - existing open orders evaluated before ECO release */
    @Column(name = "existing_orders_evaluated")
    Boolean existingOrdersEvaluated = false;

    @Column(length = 500)
    String remarks;

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}
