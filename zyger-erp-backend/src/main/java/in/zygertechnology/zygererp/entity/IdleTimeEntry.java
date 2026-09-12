package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "idle_time_entry")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class IdleTimeEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entry_number", unique = true, length = 60)
    private String entryNumber;

    @Column(name = "entry_date")
    private Instant entryDate;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "work_center_code", length = 60)
    private String workCenterCode;

    @Column(name = "operator_code", length = 60)
    private String operatorCode;

    @Column(name = "shift_code", length = 60)
    private String shiftCode;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(precision = 18, scale = 2)
    private BigDecimal duration;

    @Column(name = "idle_reason", length = 100)
    private String idleReason;

    @Column(name = "idle_reason_id") Long idleReasonId;

    @Column(name = "plant_id") Long plantId;

    @Column(name = "subjob_number", length = 60) String subjobNumber;

    @Column(name = "work_order_number", length = 60)
    private String workOrderNumber;

    @Column(name = "job_card_number", length = 60)
    private String jobCardNumber;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Version
    private Long version;

    @Column(name = "created_by", length = 60)
    private String createdBy;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_by", length = 60)
    private String updatedBy;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
