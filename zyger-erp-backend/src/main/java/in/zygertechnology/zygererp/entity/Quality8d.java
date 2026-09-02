package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 8D Report (plan §24) — D1..D8 discipline tracking.
 */
@Entity
@Table(name = "quality_8d", indexes = {
        @Index(name = "idx_q8d_doc", columnList = "doc_no"),
        @Index(name = "idx_q8d_status", columnList = "status"),
        @Index(name = "idx_q8d_source", columnList = "source_type")
})
@Getter
@Setter
@DocKey("quality-8d")
public class Quality8d extends BaseDoc implements DocEntity {

    @Column(name = "report_number", length = 60)
    String reportNumber;

    /** CUSTOMER_COMPLAINT | SUPPLIER_PROBLEM | INTERNAL_DEFECT | REPEATED_ISSUE | MAJOR_FAILURE */
    @Column(name = "source_type", length = 40)
    String sourceType;
    @Column(name = "source_reference", length = 60)
    String sourceReference;
    @Column(name = "complaint_id")
    Long complaintId;
    @Column(name = "ncr_id")
    Long ncrId;
    @Column(name = "capa_id")
    Long capaId;

    /** FK to quality_customer_complaint.id (FRS §10.5) */
    @Column(name = "source_complaint_id")
    Long sourceComplaintId;
    /** FK to quality_capa.id when the 8D escalates a CAPA (FRS §10.5) */
    @Column(name = "source_capa_id")
    Long sourceCapaId;
    /** FK to non_conformance_report.id when the 8D originates from an NCR (FRS §10.5) */
    @Column(name = "source_ncr_id")
    Long sourceNcrId;

    @Column(name = "customer_code", length = 60)
    String customerCode;
    @Column(name = "customer_name", length = 120)
    String customerName;
    @Column(length = 60)
    String itemCode;

    @Column(name = "problem_statement", length = 2048)
    String problemStatement;

    @Column(name = "team_lead", length = 60)
    String teamLead;

    @Column(name = "target_close_date")
    LocalDate targetCloseDate;

    /** OPEN | IN_PROGRESS | CLOSED */
    @Column(name = "report_status", length = 30)
    String reportStatus = "OPEN";

    @Column(name = "closed_at")
    Instant closedAt;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<Quality8dDiscipline> disciplines = new ArrayList<>();

    @Override
    public List<? extends LineEntity> getLines() {
        return disciplines;
    }
}
