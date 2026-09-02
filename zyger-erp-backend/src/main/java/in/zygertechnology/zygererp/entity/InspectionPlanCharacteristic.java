package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "inspection_plan_characteristic")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class InspectionPlanCharacteristic {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    InspectionPlan plan;

    @Column(name = "balloon_no", length = 30)
    String balloonNo;

    @Column(name = "characteristic_code", length = 60)
    String characteristicCode;

    @Column(name = "characteristic_name", length = 200, nullable = false)
    String characteristicName;

    @Column(name = "data_type", length = 30)
    @Builder.Default String dataType = "NUMERIC";

    @Column(name = "specification_text", length = 300)
    String specificationText;

    @Column(name = "nominal_value", precision = 18, scale = 6)
    BigDecimal nominalValue;

    @Column(name = "lower_limit", precision = 18, scale = 6)
    BigDecimal lowerLimit;

    @Column(name = "upper_limit", precision = 18, scale = 6)
    BigDecimal upperLimit;

    @Column(precision = 18, scale = 6)
    BigDecimal tolerance;

    @Column(length = 30)
    String uom;

    @Column(name = "is_mandatory")
    @Builder.Default Boolean isMandatory = false;

    @Column(name = "is_critical")
    @Builder.Default Boolean isCritical = false;

    @Column(name = "is_special")
    @Builder.Default Boolean isSpecial = false;

    @Column(name = "measurement_method", length = 200)
    String measurementMethod;

    @Column(name = "required_instrument_type", length = 60)
    String requiredInstrumentType;

    @Column(name = "line_no")
    Integer lineNo;

    @Builder.Default Boolean active = Boolean.TRUE;

    @Builder.Default Instant createdAt = Instant.now();
}
