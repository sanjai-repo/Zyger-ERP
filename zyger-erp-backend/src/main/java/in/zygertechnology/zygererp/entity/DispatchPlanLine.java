package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "dispatch_plan_line")
@Getter
@Setter
public class DispatchPlanLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispatch_plan_id")
    DispatchPlan dispatchPlan;

    @Column(name = "so_number", length = 60)
    String soNumber;

    @Column(name = "so_line_id")
    Long soLineId;
    @Column(name = "so_id")
    Long soId;
    @Column(name = "wo_id")
    Long woId;

    @Column(name = "wo_number", length = 60)
    String woNumber;

    @Column(name = "item_code", length = 60)
    String itemCode;

    @Column(name = "item_description", length = 200)
    String itemDescription;

    @Column(name = "dispatch_qty", precision = 38, scale = 2)
    BigDecimal dispatchQty;

    @Column(length = 20)
    String uom;

    @Column(name = "batch_lot_number", length = 60)
    String batchLotNumber;

    @Column(name = "packing_type", length = 30)
    String packingType;

    @Column(name = "number_of_packages")
    Integer numberOfPackages;

    @Column(name = "weight_kg", precision = 8, scale = 2)
    BigDecimal weightKg;

    @Column(length = 30)
    String status;

    @Column(length = 200)
    String remarks;

    @Version
    Long version;

    String createdBy;

    Instant createdAt;

    Instant updatedAt;

    String updatedBy;
}
