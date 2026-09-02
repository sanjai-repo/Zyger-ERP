package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "cost_estimation")
@Getter
@Setter
@EntityListeners(AuditEntityListener.class)
public class CostEstimation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "estimation_number", unique = true, nullable = false, length = 60)
    String estimationNumber;

    @Column(name = "item_code", length = 60)
    String itemCode;

    @Column(name = "item_description", length = 200)
    String itemDescription;

    @Column(name = "customer_name", length = 200)
    String customerName;

    @Column(name = "so_number", length = 60)
    String soNumber;
    @Column(name = "customer_id")
    Long customerId;
    @Column(name = "so_id")
    Long soId;

    @Column(name = "batch_qty", precision = 38, scale = 2)
    BigDecimal batchQty;

    @Column(name = "bom_id")
    Long bomId;

    @Column(name = "route_id")
    Long routeId;

    @Column(name = "estimation_version")
    Integer estimationVersion;

    @Column(nullable = false, length = 20)
    String status;

    @Column(name = "is_active_quote")
    Boolean isActiveQuote = false;

    @Column(name = "currency_code", length = 10)
    String currencyCode;

    @Column(name = "exchange_rate", precision = 10, scale = 4)
    BigDecimal exchangeRate;

    @Column(name = "total_material_cost", precision = 38, scale = 2)
    BigDecimal totalMaterialCost;

    @Column(name = "total_machine_cost", precision = 38, scale = 2)
    BigDecimal totalMachineCost;

    @Column(name = "total_labour_cost", precision = 38, scale = 2)
    BigDecimal totalLabourCost;

    @Column(name = "total_tooling_cost", precision = 38, scale = 2)
    BigDecimal totalToolingCost;

    @Column(name = "total_subcontract_cost", precision = 38, scale = 2)
    BigDecimal totalSubcontractCost;

    @Column(name = "total_overhead_cost", precision = 38, scale = 2)
    BigDecimal totalOverheadCost;

    @Column(name = "scrap_allowance_cost", precision = 38, scale = 2)
    BigDecimal scrapAllowanceCost;

    @Column(name = "total_manufacturing_cost", precision = 38, scale = 2)
    BigDecimal totalManufacturingCost;

    @Column(name = "profit_margin_percent", precision = 5, scale = 2)
    BigDecimal profitMarginPercent;

    @Column(name = "profit_amount", precision = 38, scale = 2)
    BigDecimal profitAmount;

    @Column(name = "estimated_selling_price", precision = 38, scale = 2)
    BigDecimal estimatedSellingPrice;

    @Column(name = "actual_material_cost", precision = 38, scale = 2)
    BigDecimal actualMaterialCost;

    @Column(name = "actual_machine_cost", precision = 38, scale = 2)
    BigDecimal actualMachineCost;

    @Column(name = "actual_labour_cost", precision = 38, scale = 2)
    BigDecimal actualLabourCost;

    @Column(name = "actual_total_cost", precision = 38, scale = 2)
    BigDecimal actualTotalCost;

    @Column(name = "variance_material", precision = 38, scale = 2)
    BigDecimal varianceMaterial;

    @Column(name = "variance_machine", precision = 38, scale = 2)
    BigDecimal varianceMachine;

    @Column(name = "variance_total", precision = 38, scale = 2)
    BigDecimal varianceTotal;

    @Column(name = "valid_upto")
    Instant validUpto;

    @Column(name = "prepared_by", length = 100)
    String preparedBy;
    @Column(name = "prepared_date")
    Instant preparedDate;
    @Column(name = "approved_by", length = 100)
    String approvedBy;
    @Column(name = "approved_date")
    Instant approvedDate;

    @Column(length = 500)
    String remarks;

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}
