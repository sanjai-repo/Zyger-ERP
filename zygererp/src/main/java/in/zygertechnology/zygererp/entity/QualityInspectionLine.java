package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.math.BigDecimal;

/**
 * A single inspection characteristic line within a {@link QualityInspection}.
 *
 * The result (PASS/FAIL/PENDING/NA) is computed automatically by the service
 * based on the configured limits whenever an actual value is entered.
 *
 * getQty() returns the inspected quantity for this line so that the
 * generic DocumentFacade.toRow() qty aggregation works.
 */
@Entity
@Table(name = "quality_inspection_line", indexes = {
        @Index(name = "idx_qil_doc", columnList = "doc_id"),
        @Index(name = "idx_qil_char", columnList = "characteristic_code")
})
@Getter
@Setter
public class QualityInspectionLine extends BaseLine implements LineEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doc_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    QualityInspection doc;

    @Column(name = "plan_id", length = 60)
    String planId;

    @Column(name = "balloon_no", length = 30)
    String balloonNo;

    @Column(name = "characteristic_code", length = 60)
    String characteristicCode;
    @Column(name = "characteristic_name", length = 120)
    String characteristicName;

    @Column(length = 30)
    String dataType;

    @Column(name = "specification_text", length = 200)
    String specificationText;

    BigDecimal nominalValue;
    BigDecimal targetValue;
    BigDecimal lowerLimit;
    BigDecimal upperLimit;
    BigDecimal tolerance;
    @Column(length = 30)
    String uom;

    @Column(name = "is_mandatory")
    Boolean isMandatory = false;
    @Column(name = "is_critical")
    Boolean isCritical = false;
    @Column(name = "is_special")
    Boolean isSpecial = false;

    @Column(name = "measurement_method", length = 120)
    String measurementMethod;

    @Column(name = "required_instrument_id", length = 60)
    String requiredInstrumentId;
    @Column(name = "instrument_code", length = 60)
    String instrumentCode;
    @Column(name = "calibration_status", length = 30)
    String calibrationStatus;

    @Column(name = "actual_value")
    BigDecimal actualValue;
    @Column(length = 200)
    String actualText;
    @Column(name = "actual_min")
    BigDecimal actualMin;
    @Column(name = "actual_max")
    BigDecimal actualMax;
    @Column(name = "actual_avg")
    BigDecimal actualAvg;

    /** PASS / FAIL / PENDING / NA — auto-evaluated when actualValue is set. */
    @Column(length = 20)
    String result = "PENDING";

    /** Out-of-tolerance flag — computed and stored at measure/save time (VAL-MEA-03). */
    @Column(name = "oot_flag")
    Boolean ootFlag = false;

    BigDecimal deviation;

    @Column(name = "measured_by", length = 60)
    String measuredBy;
    @Column(name = "measured_at")
    Instant measuredAt;

    @Column(length = 500)
    String remark;

    @Column(name = "sample_number")
    Integer sampleNumber;
    @Column(name = "piece_number")
    Integer pieceNumber;

    /**
     * Quantity attributable to this line for header aggregation.
     * Defaults to 1 (one inspected unit) unless overridden.
     */
    @Column(name = "qty")
    BigDecimal qty = BigDecimal.ONE;

    @Override
    public BigDecimal getQty() {
        return qty == null ? BigDecimal.ZERO : qty;
    }
}
