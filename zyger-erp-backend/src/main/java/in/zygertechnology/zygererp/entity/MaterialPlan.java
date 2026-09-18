package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "material_plan")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class MaterialPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_number", unique = true, length = 60)
    private String planNumber;

    @Column(name = "plan_date")
    private Instant planDate;

    @Column(name = "planned_by", length = 60)
    private String plannedBy;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Column(name = "parameters_json", columnDefinition = "TEXT")
    private String parametersJson;

    /** FRS §3.4: planning horizon start */
    @Column(name = "planning_horizon_start")
    private LocalDate planningHorizonStart;

    /** FRS §3.4: planning horizon end */
    @Column(name = "planning_horizon_end")
    private LocalDate planningHorizonEnd;

    /** FRS §3.4: who/what triggered this run */
    @Column(name = "triggered_by", length = 100)
    private String triggeredBy;

    /**
     * FRS §5: demand-source selector for the MRP run. One of
     * SALES_WORK_ORDER, INVENTORY_WORK_ORDER, MIN_STOCK_MANUFACTURING_ITEM,
     * MIN_STOCK_PURCHASE_ITEM, MANUAL, ALL (default — all active WOs, prior behavior).
     */
    @Column(name = "planning_type", length = 40)
    @Builder.Default
    private String planningType = "ALL";

    /** FRS §5: "Run MRP" nets on-hand/on-order/safety stock; "Run MRP W/o Stock" ignores them entirely. */
    @Column(name = "run_mode", length = 20)
    @Builder.Default
    private String runMode = "RUN";

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

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
