package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "calibration_entry")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class CalibrationEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "calibration_number", unique = true, length = 60)
    private String calibrationNumber;

    @Column(name = "schedule_id")
    private Long scheduleId;

    @Column(name = "schedule_number", length = 60)
    private String scheduleNumber;

    @Column(name = "instrument_id", length = 60)
    private String instrumentId;

    @Column(name = "instrument_name", length = 120)
    private String instrumentName;

    @Column(name = "calibration_date")
    private LocalDate calibrationDate;

    @Column(name = "calibration_agency", length = 120)
    private String calibrationAgency;

    @Column(name = "certificate_number", length = 60)
    private String certificateNumber;

    @Column(name = "standard_used", length = 120)
    private String standardUsed;

    @Column(name = "observed_values", columnDefinition = "TEXT")
    private String observedValues;

    @Column(name = "permissible_limits", columnDefinition = "TEXT")
    private String permissibleLimits;

    @Column(length = 30)
    private String result;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "calibration_cost", precision = 18, scale = 2)
    private BigDecimal calibrationCost;

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
