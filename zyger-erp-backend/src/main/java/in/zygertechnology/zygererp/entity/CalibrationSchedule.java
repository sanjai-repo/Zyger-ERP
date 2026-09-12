package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "calibration_schedule")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class CalibrationSchedule {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "schedule_number", unique = true, length = 60)
    private String scheduleNumber;

    @Column(name = "instrument_id", length = 60)
    private String instrumentId;

    @Column(name = "instrument_name", length = 120)
    private String instrumentName;

    @Column(name = "serial_number", length = 60)
    private String serialNumber;

    @Column(name = "range_value", length = 60)
    private String rangeValue;

    @Column(length = 60)
    private String accuracy;

    @Column(length = 60)
    private String location;

    @Column(length = 60)
    private String department;

    @Column(name = "calibration_frequency", length = 30)
    private String calibrationFrequency;

    @Column(name = "last_calibration_date")
    private LocalDate lastCalibrationDate;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "calibration_agency", length = 120)
    private String calibrationAgency;

    @Column(name = "calibration_status", length = 30)
    private String calibrationStatus;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Version private Long version;
    @Column(name = "created_by", length = 60) private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_by", length = 60) private String updatedBy;
    @Column(name = "updated_at") private Instant updatedAt;
    @Builder.Default
    @Column(nullable = false) private Boolean deleted = false;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by", length = 60) private String deletedBy;
}
