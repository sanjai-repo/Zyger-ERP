package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

/**
 * Calibration Record (plan §25) — one calibration event for an instrument.
 * On APPROVED status the linked instrument's dates/status are refreshed.
 */
@Entity
@Table(name = "quality_calibration_record", indexes = {
        @Index(name = "idx_qcr_doc", columnList = "doc_no"),
        @Index(name = "idx_qcr_instrument", columnList = "instrument_id"),
        @Index(name = "idx_qcr_status", columnList = "status")
})
@Getter
@Setter
@DocKey("quality-calibration-record")
public class QualityCalibrationRecord extends BaseDoc implements DocEntity {

    @Column(name = "calibration_number", length = 60)
    String calibrationNumber;

    @Column(name = "instrument_id")
    Long instrumentId;
    @Column(name = "instrument_code", length = 60)
    String instrumentCode;
    @Column(name = "instrument_name", length = 120)
    String instrumentName;

    @Column(name = "calibration_date")
    LocalDate calibrationDate;
    /** INTERNAL | EXTERNAL */
    @Column(name = "calibration_type", length = 30)
    String calibrationType;
    @Column(name = "performed_by", length = 60)
    String performedBy;
    @Column(name = "external_agency", length = 120)
    String externalAgency;
    @Column(name = "certificate_number", length = 60)
    String certificateNumber;

    /** PASS | FAIL */
    @Column(length = 20)
    String result;

    @Column(name = "next_due_date")
    LocalDate nextDueDate;

    @Column(name = "approved_by", length = 60)
    String approvedBy;
    @Column(name = "approval_date")
    LocalDate approvalDate;

    @Override
    public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}
