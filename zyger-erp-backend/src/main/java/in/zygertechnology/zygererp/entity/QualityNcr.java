package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

/**
 * Quality Non-Conformance Report.
 *
 * Linked to a failed {@link QualityInspection} and carries the disposition
 * decision (rework / scrap / return / concession / ...).
 */
@Entity
@Table(name = "quality_ncr", indexes = {
        @Index(name = "idx_qn_doc", columnList = "doc_no"),
        @Index(name = "idx_qn_insp", columnList = "inspection_id"),
        @Index(name = "idx_qn_status", columnList = "status"),
        @Index(name = "idx_qn_item", columnList = "item_code")
})
@Getter
@Setter
@DocKey("quality-ncr")
public class QualityNcr extends BaseDoc implements DocEntity {

    @Column(name = "inspection_id")
    Long inspectionId;

    @Column(length = 30)
    String sourceType;
    @Column(length = 60)
    String sourceId;
    @Column(length = 60)
    String sourceNumber;

    @Column(length = 60)
    String itemCode;
    @Column(length = 120)
    String itemDescription;
    @Column(length = 60)
    String batchNumber;
    @Column(length = 60)
    String lotNumber;
    @Column(length = 60)
    String serialNumber;
    @Column(name = "heat_number", length = 60)
    String heatNumber;

    @Column(name = "quantity_affected")
    BigDecimal quantityAffected;
    @Column(length = 60)
    String uom;

    @Column(name = "defect_code", length = 60)
    String defectCode;
    @Column(name = "defect_description", length = 1024)
    String defectDescription;

    @Column(length = 30)
    String severity;

    @Column(name = "identified_by", length = 60)
    String identifiedBy;
    @Column(name = "identified_at")
    Instant identifiedAt;

    @Column(name = "contained")
    Boolean contained = false;
    @Column(name = "containment_action", length = 1024)
    String containmentAction;

    @Column(name = "root_cause_required")
    Boolean rootCauseRequired = true;

    @Column(name = "disposition", length = 60)
    String disposition;

    /** Disposition outcome applied from the failed inspection. */
    @Column(name = "disposition_type", length = 30)
    String dispositionType;

    @Column(name = "status", length = 30)
    String status = "DRAFT";

    @Column(name = "closed_at")
    Instant closedAt;

    @Column(name = "ncr_number", length = 60)
    String ncrNumber;

    @OneToMany(mappedBy = "ncr", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<QualityNcrLine> lines = new ArrayList<>();

    @Override
    public List<? extends LineEntity> getLines() {
        return lines;
    }
}
