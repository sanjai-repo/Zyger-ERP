package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

/**
 * QualityInspection is the common aggregate root for every inspection type
 * (IQC, LO, JOMIN, FAI, IPQC, LINE, LAST_OFF, FINAL).
 *
 * It uses the generic document engine lifecycle (status = DRAFT/SUBMITTED/...)
 * and adds quality-specific decision/ disposition fields enforced by
 * {@link in.zygertechnology.zygererp.service.QualityInspectionService}.
 */
@Entity
@Table(name = "quality_inspection", indexes = {
        @Index(name = "idx_qi_type", columnList = "inspection_type"),
        @Index(name = "idx_qi_status", columnList = "inspection_status,decision_status"),
        @Index(name = "idx_qi_source", columnList = "source_type,source_id"),
        @Index(name = "idx_qi_item", columnList = "item_code"),
        @Index(name = "idx_qi_due", columnList = "due_date"),
        @Index(name = "idx_qi_inspector", columnList = "inspector"),
        @Index(name = "idx_qi_docNo", columnList = "doc_no")
})
@Getter
@Setter
@DocKey("quality-inspection")
public class QualityInspection extends BaseDoc implements DocEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "inspection_type", length = 30)
    QualityInspectionType inspectionType;

    @Column(length = 30)
    String sourceType;

    @Column(length = 60)
    String sourceId;

    @Column(length = 60)
    String sourceNumber;

    @Column(length = 60)
    String referenceType;

    @Column(length = 60)
    String referenceId;

    @Column(length = 60)
    String referenceNumber;

    LocalDate inspectionDate;

    @Column(length = 60)
    String inspectionNumber;

    // --- traceability ---
    @Column(name = "purchase_order_number", length = 60)
    String purchaseOrderNumber;
    @Column(name = "po_inward_number", length = 60)
    String poInwardNumber;
    @Column(name = "labour_order_number", length = 60)
    String labourOrderNumber;
    @Column(name = "lo_inward_number", length = 60)
    String loInwardNumber;
    @Column(name = "job_order_number", length = 60)
    String jobOrderNumber;
    @Column(name = "jo_inward_number", length = 60)
    String joInwardNumber;
    @Column(name = "sales_order_number", length = 60)
    String salesOrderNumber;
    @Column(name = "item_code", length = 60)
    String itemCode;
    @Column(length = 120)
    String itemDescription;
    @Column(name = "drawing_number", length = 60)
    String drawingNumber;
    @Column(name = "drawing_revision", length = 30)
    String drawingRevision;
    @Column(name = "batch_number", length = 60)
    String batchNumber;
    @Column(name = "lot_number", length = 60)
    String lotNumber;
    @Column(name = "serial_number", length = 60)
    String serialNumber;
    @Column(name = "heat_number", length = 60)
    String heatNumber;
    @Column(length = 60)
    String machine;
    @Column(name = "work_center", length = 60)
    String workCenter;
    @Column
    String operation;
    @Column(name = "operation_sequence")
    Integer operationSequence;
    @Column(name = "program_number", length = 60)
    String programNumber;
    @Column(name = "setup_number", length = 60)
    String setupNumber;
    @Column(length = 60)
    String inspector;
    @Column(name = "assigned_inspector", length = 60)
    String assignedInspector;

    @Column(name = "received_quantity")
    BigDecimal receivedQuantity;
    @Column(name = "inspection_quantity")
    BigDecimal inspectionQuantity;
    @Column(name = "sample_size")
    BigDecimal sampleSize;

    // --- AQL / sampling plan (ANSI Z1.4 / ISO 2859-1) applied at creation ---
    @Column(name = "sampling_standard", length = 40)
    String samplingStandard;
    @Column(name = "aql")
    java.math.BigDecimal aql;
    @Column(name = "accept_number")
    Integer acceptNumber;
    @Column(name = "reject_number")
    Integer rejectNumber;
    @Column(name = "lot_size")
    BigDecimal lotSize;

    // quality-specific workflow status (driven by QualityInspectionService)
    @Column(name = "inspection_status", length = 30)
    String inspectionStatus = "DRAFT";
    @Column(name = "decision_status", length = 30)
    String decisionStatus = "NONE";

    @Column(name = "accepted_quantity")
    BigDecimal acceptedQuantity;
    @Column(name = "rejected_quantity")
    BigDecimal rejectedQuantity;
    @Column(name = "hold_quantity")
    BigDecimal holdQuantity;
    @Column(name = "rework_quantity")
    BigDecimal reworkQuantity;
    @Column(name = "scrap_quantity")
    BigDecimal scrapQuantity;
    @Column(name = "return_quantity")
    BigDecimal returnQuantity;
    @Column(name = "concession_quantity")
    BigDecimal concessionQuantity;

    @Column(name = "final_decision", length = 30)
    String finalDecision;
    @Column(name = "decision_remarks", length = 500)
    String decisionRemarks;
    @Column(name = "minor_acceptance_reason", length = 500)
    String minorAcceptanceReason;

    @Column(name = "approved_by", length = 60)
    String approvedBy;
    @Column(name = "approved_at")
    java.time.Instant approvedAt;
    @Column(name = "signed_at")
    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    java.time.Instant signedAt;
    @Column(name = "closed_at")
    java.time.Instant closedAt;
    @Column(name = "cancelled_at")
    java.time.Instant cancelledAt;
    @Column(name = "cancellation_reason", length = 500)
    String cancellationReason;
    @Column(name = "reopen_reason", length = 500)
    String reopenReason;

    @Column(name = "has_critical_characteristic")
    Boolean hasCriticalCharacteristic = false;
    @Column(name = "has_special_characteristic")
    Boolean hasSpecialCharacteristic = false;
    @Column(name = "requires_customer_approval")
    Boolean requiresCustomerApproval = false;
    @Column(name = "customer_approval_received")
    Boolean customerApprovalReceived = false;
    @Column(name = "customer_approval_evidence", length = 60)
    String customerApprovalEvidence;

    @Column(name = "due_date")
    LocalDate dueDate;
    @Column(name = "inspection_plan_id", length = 60)
    String inspectionPlanId;

    /** Frozen plan revision this inspection was executed against. */
    @Column(name = "inspection_plan_revision")
    Integer inspectionPlanRevision;

    // --- spec §4.1 trackability fields ---
    @Column(name = "priority", length = 20)
    String priority = "Normal";                // Critical / High / Normal / Low
    @Column(name = "priority_set_at")
    Instant prioritySetAt;
    @Column(name = "parent_inspection_id")
    Long parentInspectionId;
    @Column(name = "assigned_at")
    Instant assignedAt;
    @Column(name = "started_at")
    Instant startedAt;
    @Column(name = "completed_at")
    Instant completedAt;
    @Column(name = "hold_since")
    Instant holdSince;
    @Column(name = "is_locked")
    Boolean isLocked = false;

    /** Idempotency guard for QC stock sync. PENDING (not yet processed) / SYNCED (done) / SYNC_ERROR. */
    @Column(name = "stock_sync_status", length = 30)
    String stockSyncStatus = "PENDING";
    @Column(name = "stock_sync_key", length = 120)
    String stockSyncKey;

    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<QualityInspectionLine> lines = new ArrayList<>();

    @Override
    public List<QualityInspectionLine> getLines() {
        return lines;
    }
}
