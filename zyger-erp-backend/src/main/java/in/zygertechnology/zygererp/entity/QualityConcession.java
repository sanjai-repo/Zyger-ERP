package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;

/**
 * Concession Entry (plan §20) — controlled acceptance of non-conforming
 * material under approved deviation conditions.
 */
@Entity
@Table(name = "quality_concession", indexes = {
        @Index(name = "idx_qc_doc", columnList = "doc_no"),
        @Index(name = "idx_qc_insp", columnList = "inspection_id"),
        @Index(name = "idx_qc_ncr", columnList = "ncr_id"),
        @Index(name = "idx_qc_status", columnList = "status")
})
@Getter
@Setter
@DocKey("quality-concession")
public class QualityConcession extends BaseDoc implements DocEntity {

    @Column(name = "concession_number", length = 60)
    String concessionNumber;

    @Column(name = "inspection_id")
    Long inspectionId;
    @Column(name = "ncr_id")
    Long ncrId;

    @Column(length = 60)
    String itemCode;
    @Column(name = "drawing_number", length = 60)
    String drawingNumber;
    @Column(name = "drawing_revision", length = 30)
    String drawingRevision;

    @Column(name = "batch_number", length = 60)
    String batchNumber;
    @Column(name = "serial_number", length = 60)
    String serialNumber;
    @Column(name = "heat_number", length = 60)
    String heatNumber;

    @Column(name = "quantity_covered")
    BigDecimal quantityCovered;
    @Column(length = 30)
    String uom;

    @Column(name = "deviation_description", length = 1024)
    String deviationDescription;
    @Column(name = "deviation_reason", length = 1024)
    String deviationReason;

    @Column(name = "customer_approval_required")
    Boolean customerApprovalRequired = false;
    @Column(name = "customer_approval_received")
    Boolean customerApprovalReceived = false;
    @Column(name = "customer_approval_evidence", length = 1024)
    String customerApprovalEvidence;

    @Column(name = "approval_authority", length = 60)
    String approvalAuthority;

    @Column(name = "valid_from")
    LocalDate validFrom;
    @Column(name = "valid_to")
    LocalDate validTo;

    @Column(name = "approved_by", length = 60)
    String approvedBy;
    @Column(name = "approval_date")
    LocalDate approvalDate;

    @Column(name = "closed_at")
    Instant closedAt;

    @Override
    public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}
