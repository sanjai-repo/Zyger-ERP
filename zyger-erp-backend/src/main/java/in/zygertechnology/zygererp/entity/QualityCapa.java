package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;

/**
 * CAPA — Corrective and Preventive Action (plan §23).
 */
@Entity
@Table(name = "quality_capa", indexes = {
        @Index(name = "idx_qcapa_doc", columnList = "doc_no"),
        @Index(name = "idx_qcapa_status", columnList = "status"),
        @Index(name = "idx_qcapa_source", columnList = "source_type")
})
@Getter
@Setter
@DocKey("quality-capa")
public class QualityCapa extends BaseDoc implements DocEntity {

    @Column(name = "capa_number", length = 60)
    String capaNumber;

    /** CUSTOMER_COMPLAINT | INTERNAL_REJECTION | INSPECTION_FAILURE | SUPPLIER_REJECTION | AUDIT | REPEATED_DEFECT */
    @Column(name = "source_type", length = 40)
    String sourceType;
    @Column(name = "source_reference", length = 60)
    String sourceReference;
    @Column(name = "complaint_id")
    Long complaintId;
    @Column(name = "inspection_id")
    Long inspectionId;
    @Column(name = "ncr_id")
    Long ncrId;

    /** FK to quality_customer_complaint.id when sourceType = CUSTOMER_COMPLAINT (FRS §10.5) */
    @Column(name = "source_complaint_id")
    Long sourceComplaintId;
    /** FK to non_conformance_report.id when CAPA originates from an NCR (FRS §10.5) */
    @Column(name = "source_ncr_id")
    Long sourceNcrId;

    @Column(name = "problem_description", length = 2048)
    String problemDescription;

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
    @Column(name = "completion_date")
    LocalDate completionDate;

    @Column(name = "evidence", length = 1024)
    String evidence;
    @Column(name = "effectiveness_result", length = 1024)
    String effectivenessResult;
    @Column(name = "effectiveness_date")
    LocalDate effectivenessDate;

    @Column(name = "approved_by", length = 60)
    String approvedBy;

    /** OPEN | IN_PROGRESS | ACTION_COMPLETED | VERIFICATION | CLOSED | OVERDUE */
    @Column(name = "capa_status", length = 30)
    String capaStatus = "OPEN";

    @Column(name = "closed_at")
    Instant closedAt;

    @Override
    public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}
