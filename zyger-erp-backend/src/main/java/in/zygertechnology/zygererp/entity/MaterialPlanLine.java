package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "material_plan_line")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialPlanLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private MaterialPlan plan;

    @Column(name = "item_code", length = 60)
    private String itemCode;

    @Column(name = "item_description", length = 200)
    private String itemDescription;

    @Column(length = 20)
    private String uom;

    @Column(name = "bom_level")
    private Integer bomLevel;

    @Column(name = "source_wo_number", length = 100)
    private String sourceWoNumber;

    @Column(name = "gross_requirement", precision = 38, scale = 2)
    private BigDecimal grossRequirement;

    @Column(name = "on_hand_stock", precision = 38, scale = 2)
    private BigDecimal onHandStock;

    @Column(name = "on_order_qty", precision = 38, scale = 2)
    private BigDecimal onOrderQty;

    @Column(name = "wip_qty", precision = 38, scale = 2)
    private BigDecimal wipQty;

    @Column(name = "safety_stock", precision = 38, scale = 2)
    private BigDecimal safetyStock;

    @Column(name = "net_requirement", precision = 38, scale = 2)
    private BigDecimal netRequirement;

    @Column(name = "recommended_order_qty", precision = 38, scale = 2)
    private BigDecimal recommendedOrderQty;

    @Column(name = "order_type", length = 30)
    private String orderType;

    @Column(name = "required_date")
    private Instant requiredDate;

    @Column(name = "order_by_date")
    private Instant orderByDate;

    @Column(name = "lead_time_days")
    private Integer leadTimeDays;

    @Column(name = "estimated_cost", precision = 38, scale = 2)
    private BigDecimal estimatedCost;

    @Column(name = "action_status", length = 30)
    private String actionStatus;

    @Column(length = 20)
    private String priority;

    /** FRS §3.4: quantity reserved for a specific WO */
    @Column(name = "reserved_qty", precision = 38, scale = 2)
    private BigDecimal reservedQty;
    /** FRS §3.4: reservation status */
    @Column(name = "reservation_status", length = 30)
    private String reservationStatus;
    /** FRS §3.4: allocated stock */
    @Column(name = "allocated_stock", precision = 38, scale = 2)
    private BigDecimal allocatedStock;

    @Column(length = 200)
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
