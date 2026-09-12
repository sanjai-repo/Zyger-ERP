package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

/**
 * Test parameter line of a {@link QualityTestCertificate}.
 */
@Entity
@Table(name = "quality_test_certificate_line", indexes = {
        @Index(name = "idx_qtcl_cert", columnList = "certificate_id")
})
@Getter
@Setter
public class QualityTestCertificateLine extends BaseLine implements LineEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "certificate_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    QualityTestCertificate certificate;

    @Column(name = "parameter_name", length = 120)
    String parameterName;
    @Column(name = "specification", length = 240)
    String specification;
    @Column(name = "nominal_value", length = 60)
    String nominalValue;
    @Column(name = "result_value", length = 120)
    String resultValue;
    @Column(length = 30)
    String uom;
    @Column(name = "instrument_code", length = 60)
    String instrumentCode;
    /** PASS | FAIL | NA */
    @Column(length = 20)
    String result;
    @Column(length = 500)
    String remark;

    @Column(name = "qty")
    BigDecimal qty = BigDecimal.ONE;

    @Override
    public BigDecimal getQty() {
        return qty == null ? BigDecimal.ZERO : qty;
    }
}
