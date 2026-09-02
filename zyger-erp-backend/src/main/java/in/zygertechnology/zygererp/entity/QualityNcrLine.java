package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

/**
 * Line item of a {@link QualityNcr}: each affected lot/batch/heat
 * with its quantity and defect.
 */
@Entity
@Table(name = "quality_ncr_line", indexes = {
        @Index(name = "idx_qnl_ncr", columnList = "ncr_id")
})
@Getter
@Setter
public class QualityNcrLine extends BaseLine implements LineEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ncr_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    QualityNcr ncr;

    @Column(length = 60)
    String batchNumber;
    @Column(length = 60)
    String lotNumber;
    @Column(name = "serial_number", length = 60)
    String serialNumber;
    @Column(name = "heat_number", length = 60)
    String heatNumber;

    @Column(name = "quantity_affected")
    BigDecimal quantityAffected;
    @Column(length = 60)
    String uom;

    @Column(name = "defect_code", length = 60)
    String defectCode;
    @Column(name = "defect_description", length = 512)
    String defectDescription;

    @Column(length = 20)
    String severity;

    @Column(length = 500)
    String remark;

    @Column(name = "qty")
    BigDecimal qty = BigDecimal.ZERO;

    @Override
    public BigDecimal getQty() {
        return quantityAffected == null ? BigDecimal.ZERO : quantityAffected;
    }
}
