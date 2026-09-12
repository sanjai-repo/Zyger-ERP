package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "quality_characteristic_measurement")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class QualityCharacteristicMeasurement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id")
    PlantMaster plant;

    @Column(name = "inspection_id")
    Long inspectionId;

    @Column(name = "inspection_number", length = 60)
    String inspectionNumber;

    @Column(name = "inspection_type", length = 30)
    String inspectionType;

    @Column(name = "item_code", length = 60)
    String itemCode;

    @Column(name = "characteristic_code", length = 60)
    String characteristicCode;

    @Column(name = "characteristic_name", length = 200)
    String characteristicName;

    @Column(name = "balloon_no", length = 30)
    String balloonNo;

    @Column(name = "nominal_value", precision = 18, scale = 6)
    BigDecimal nominalValue;

    @Column(name = "lower_limit", precision = 18, scale = 6)
    BigDecimal lowerLimit;

    @Column(name = "upper_limit", precision = 18, scale = 6)
    BigDecimal upperLimit;

    @Column(name = "actual_value", precision = 18, scale = 6)
    BigDecimal actualValue;

    @Column(name = "actual_min", precision = 18, scale = 6)
    BigDecimal actualMin;

    @Column(name = "actual_max", precision = 18, scale = 6)
    BigDecimal actualMax;

    @Column(name = "actual_avg", precision = 18, scale = 6)
    BigDecimal actualAvg;

    @Column(precision = 18, scale = 6)
    BigDecimal deviation;

    @Column(length = 20)
    String result;

    @Column(name = "machine_code", length = 60)
    String machineCode;

    @Column(name = "operator_code", length = 60)
    String operatorCode;

    @Column(name = "inspection_date")
    LocalDate inspectionDate;

    Instant measuredAt;

    @Builder.Default
    Instant createdAt = Instant.now();
}
