package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;

/**
 * SCAR — Supplier Corrective Action Report.
 *
 * Auto-created when an IQC inspection is given an RTV (return to vendor)
 * disposition, and raised to the supplier to record the corrective action.
 */
@Entity
@Table(name = "quality_scar", indexes = {
        @Index(name = "idx_qscar_doc", columnList = "doc_no"),
        @Index(name = "idx_qscar_status", columnList = "status"),
        @Index(name = "idx_qscar_insp", columnList = "inspection_id"),
        @Index(name = "idx_qscar_ncr", columnList = "ncr_id"),
        @Index(name = "idx_qscar_supplier", columnList = "supplier_code")
})
@Getter
@Setter
@DocKey("quality-scar")
public class QualityScar extends BaseDoc implements DocEntity {

    @Column(name = "scar_number", length = 60)
    String scarNumber;

    @Column(name = "inspection_id")
    Long inspectionId;
    @Column(name = "ncr_id")
    Long ncrId;

    /** FAILED inspection type that triggered the RTV (always IQC for RTV). */
    @Column(name = "inspection_type", length = 30)
    String inspectionType;
    @Column(name = "inspection_number", length = 60)
    String inspectionNumber;

    @Column(name = "supplier_code", length = 60)
    String supplierCode;
    @Column(name = "supplier_name", length = 120)
    String supplierName;

    @Column(name = "item_code", length = 60)
    String itemCode;
    @Column(name = "item_description", length = 120)
    String itemDescription;
    @Column(name = "batch_number", length = 60)
    String batchNumber;
    @Column(name = "lot_number", length = 60)
    String lotNumber;
    @Column(name = "heat_number", length = 60)
    String heatNumber;

    @Column(name = "quantity_affected")
    java.math.BigDecimal quantityAffected;

    @Column(name = "defect_description", length = 1024)
    String defectDescription;
    @Column(name = "severity", length = 30)
    String severity;

    /** Native complaint to the supplier. */
    @Column(name = "issue_description", length = 2048)
    String issueDescription;

    @Column(name = "root_cause", length = 1024)
    String rootCause;
    @Column(name = "corrective_action", length = 1024)
    String correctiveAction;
    @Column(name = "preventive_action", length = 1024)
    String preventiveAction;

    @Column(name = "responsible_person", length = 60)
    String responsiblePerson;
    @Column(name = "due_date")
    LocalDate dueDate;
    @Column(name = "required_by_date")
    LocalDate requiredByDate;
    @Column(name = "response_date")
    LocalDate responseDate;
    @Column(name = "closure_date")
    LocalDate closureDate;

    /** OPEN | ISSUED | RESPONDED | VERIFICATION | CLOSED | OVERDUE */
    @Column(name = "scar_status", length = 30)
    String scarStatus = "OPEN";

    @Column(name = "closed_at")
    Instant closedAt;

    @Override
    public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}
