package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "instrument_master")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class InstrumentMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60) String code;
    @Column(length = 200) String name;
    @Column(name = "instrument_type", length = 60) String instrumentType;
    @Column(length = 200) String manufacturer;
    @Column(length = 200) String model;
    @Column(name = "serial_number", length = 100) String serialNumber;
    @Column(name = "range_min", precision = 12, scale = 4) BigDecimal rangeMin;
    @Column(name = "range_max", precision = 12, scale = 4) BigDecimal rangeMax;
    @Column(length = 60) String accuracy;
    @Column(name = "least_count", precision = 12, scale = 4) BigDecimal leastCount;
    @Column(name = "last_calibration_date") LocalDate lastCalibrationDate;
    @Column(name = "calibration_due") LocalDate calibrationDue;
    @Column(name = "calibration_cycle", length = 60) String calibrationCycle;
    @Column(name = "calibration_cycle_days") Integer calibrationCycleDays;
    @Column(name = "calibration_status", length = 30) @Builder.Default String calibrationStatus = "VALID";
    @Column(name = "current_status", length = 30) @Builder.Default String currentStatus = "AVAILABLE";

    @Column(name = "store_code", length = 60) String storeCode;
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @Version Long version;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}
