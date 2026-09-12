package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "water_consumption")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class WaterConsumption {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entry_number", unique = true, length = 60)
    private String entryNumber;

    @Column(name = "reading_date")
    private LocalDate readingDate;

    @Column(name = "meter_number", length = 60)
    private String meterNumber;

    @Column(name = "opening_reading", precision = 18, scale = 2)
    private BigDecimal openingReading;

    @Column(name = "closing_reading", precision = 18, scale = 2)
    private BigDecimal closingReading;

    @Column(precision = 18, scale = 2)
    private BigDecimal consumption;

    @Column(length = 20)
    private String unit;

    @Column(length = 60)
    private String department;

    @Column(name = "usage_type", length = 30)
    private String usageType;

    @Column(name = "shift_code", length = 60)
    private String shiftCode;

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
