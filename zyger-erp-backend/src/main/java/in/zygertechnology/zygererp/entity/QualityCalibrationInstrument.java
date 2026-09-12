package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

/**
 * Measuring instrument used during inspections.
 * Used by the calibration guard: instruments that are EXPIRED / FAILED /
 * UNDER_REPAIR / RETIRED block measurement entry (policy), VALID allow it.
 */
@Entity
@Table(name = "quality_calibration_instrument", indexes = {
        @Index(name = "idx_qci_code", columnList = "instrument_code"),
        @Index(name = "idx_qci_next", columnList = "next_due_date"),
        @Index(name = "idx_qci_status", columnList = "status")
})
@Getter
@Setter
@EntityListeners(AuditEntityListener.class)
public class QualityCalibrationInstrument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "instrument_code", length = 60, unique = true)
    String instrumentCode;
    @Column(name = "instrument_name", length = 120)
    String instrumentName;
    @Column(name = "instrument_type", length = 60)
    String instrumentType;
    String make;
    String model;
    @Column(name = "serial_number", length = 60)
    String serialNumber;
    @Column(name = "measurement_range", length = 120)
    String measurementRange;
    @Column(name = "least_count", length = 60)
    String leastCount;
    @Column(length = 60)
    String accuracy;
    String location;
    @Column(name = "department_id", length = 60)
    String departmentId;
    @Column(name = "owner_user_id", length = 60)
    String ownerUserId;

    @Column(name = "calibration_frequency_days")
    Integer calibrationFrequencyDays;
    @Column(name = "calibration_type", length = 30)
    String calibrationType;

    @Column(name = "last_calibration_date")
    LocalDate lastCalibrationDate;
    @Column(name = "next_due_date")
    LocalDate nextDueDate;

    @Column(name = "calibration_agency", length = 120)
    String calibrationAgency;
    @Column(name = "certificate_number", length = 60)
    String certificateNumber;

    /** VALID | DUE_SOON | EXPIRED | FAILED | UNDER_REPAIR | RETIRED */
    @Column(length = 30)
    String status = "VALID";

    @Column(name = "calibration_policy", length = 20)
    String calibrationPolicy = "WARN";

    @Column(name = "retired_date")
    LocalDate retiredDate;
    @Column(name = "retired_reason", length = 500)
    String retiredReason;

    @Column(name = "created_by", length = 60)
    String createdBy;
    @Column(name = "created_at")
    Instant createdAt = Instant.now();
    @Column(name = "updated_at")
    Instant updatedAt = Instant.now();
}
