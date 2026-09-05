package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "job_card_subjob")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class JobCardSubjob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_card_id")
    @JsonIgnore
    private JobCard jobCard;

    @Column(name = "subjob_number", length = 60)
    private String subjobNumber;

    @Column(name = "operation_code", length = 60)
    private String operationCode;

    @Column(name = "operation_description", length = 255)
    private String operationDescription;

    @Column(name = "sequence_no")
    private Integer sequenceNo;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "work_center_code", length = 60)
    private String workCenterCode;

    @Column(name = "operator_code", length = 60)
    private String operatorCode;

    @Column(name = "planned_quantity", precision = 18, scale = 4)
    private BigDecimal plannedQuantity;

    @Column(name = "plant_id") Long plantId;

    @Column(name = "route_detail_id") Long routeDetailId;

    @Column(name = "route_operation_id")
    private Long routeOperationId;

    @Column(name = "completed_qty_computed", precision = 18, scale = 4, insertable = false, updatable = false)
    private BigDecimal completedQtyComputed;

    @Column(name = "rework_qty_computed", precision = 18, scale = 4, insertable = false, updatable = false)
    private BigDecimal reworkQtyComputed;

    @Column(name = "reject_qty_computed", precision = 18, scale = 4, insertable = false, updatable = false)
    private BigDecimal rejectQtyComputed;

    @Column(name = "scrap_qty_computed", precision = 18, scale = 4, insertable = false, updatable = false)
    private BigDecimal scrapQtyComputed;

    @Column(name = "completed_quantity", precision = 18, scale = 4)
    private BigDecimal completedQuantity;

    @Column(name = "rework_quantity", precision = 18, scale = 4)
    private BigDecimal reworkQuantity;

    @Column(name = "rejected_quantity", precision = 18, scale = 4)
    private BigDecimal rejectedQuantity;

    @Column(name = "scrap_quantity", precision = 18, scale = 4)
    private BigDecimal scrapQuantity;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(length = 30)
    private String status;

    @Column(name = "inspection_required")
    private Boolean inspectionRequired;

    @Column(length = 500)
    private String remarks;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "updated_by", length = 60)
    private String updatedBy;
}
