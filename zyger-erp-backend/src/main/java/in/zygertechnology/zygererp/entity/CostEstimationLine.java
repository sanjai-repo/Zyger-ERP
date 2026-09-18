package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "cost_estimation_line")
@Getter
@Setter
public class CostEstimationLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estimation_id", nullable = false)
    CostEstimation estimation;

    @Column(name = "line_type", nullable = false, length = 20)
    String lineType;

    @Column(name = "component_item_code", length = 60)
    String componentItemCode;

    @Column(name = "component_name", length = 200)
    String componentName;

    @Column(name = "op_sequence")
    Integer opSequence;

    @Column(name = "operation_name", length = 200)
    String operationName;

    @Column(name = "machine_code", length = 60)
    String machineCode;

    @Column(name = "qty_required", precision = 38, scale = 2)
    BigDecimal qtyRequired;

    @Column(name = "rate_per_unit", precision = 38, scale = 2)
    BigDecimal ratePerUnit;

    @Column(precision = 38, scale = 2)
    BigDecimal amount;

    @Column(name = "machine_hour_rate", precision = 38, scale = 2)
    BigDecimal machineHourRate;

    @Column(name = "setup_time_hrs", precision = 8, scale = 2)
    BigDecimal setupTimeHrs;

    @Column(name = "cycle_time_hrs", precision = 8, scale = 2)
    BigDecimal cycleTimeHrs;

    @Column(name = "total_time_hrs", precision = 8, scale = 2)
    BigDecimal totalTimeHrs;

    @Column(name = "machine_cost", precision = 38, scale = 2)
    BigDecimal machineCost;

    @Column(name = "labour_hours", precision = 8, scale = 2)
    BigDecimal labourHours;

    @Column(name = "labour_rate", precision = 38, scale = 2)
    BigDecimal labourRate;

    @Column(name = "labour_cost", precision = 38, scale = 2)
    BigDecimal labourCost;

    @Column(name = "tooling_cost", precision = 38, scale = 2)
    BigDecimal toolingCost;

    @Column(name = "is_subcontract")
    Boolean isSubcontract;

    @Column(name = "subcontract_rate", precision = 38, scale = 2)
    BigDecimal subcontractRate;

    @Column(name = "subcontract_cost", precision = 38, scale = 2)
    BigDecimal subcontractCost;

    @Column(name = "source_rate", length = 20)
    String sourceRate;

    @Column(length = 200)
    String remarks;

    // ── FRS §10 / §22 (Phase 3, additive) — material detail ────────────
    /** Display item name (mirrors componentName) for the Item Detail grid. */
    @Column(name = "item_name", length = 200)
    String itemName;

    @Column(name = "stock_uom", length = 20)
    String stockUom;

    /** Stock↔alternate UOM conversion ratio (alt Qty = stock Qty × ratio). */
    @Column(name = "conversion_ratio", precision = 18, scale = 6)
    BigDecimal conversionRatio;

    @Column(name = "alternate_uom", length = 20)
    String alternateUom;

    @Column(name = "bom_qty_alt_uom", precision = 38, scale = 6)
    BigDecimal bomQtyAltUom;

    @Column(name = "bom_qty_stock_uom", precision = 38, scale = 6)
    BigDecimal bomQtyStockUom;

    @Column(name = "rate_stock_uom", precision = 38, scale = 6)
    BigDecimal rateStockUom;

    @Column(name = "rate_alt_uom", precision = 38, scale = 6)
    BigDecimal rateAltUom;

    /** Gross qty × rate before scrap recovery. */
    @Column(name = "product_amount", precision = 38, scale = 2)
    BigDecimal productAmount;

    @Column(name = "scrap_qty", precision = 38, scale = 6)
    BigDecimal scrapQty;

    @Column(name = "scrap_rate", precision = 38, scale = 6)
    BigDecimal scrapRate;

    /** Scrap recovery credit, deducted from net material cost. */
    @Column(name = "scrap_amount", precision = 38, scale = 2)
    BigDecimal scrapAmount;

    // Dimension-based (sheet/bar) quantity derivation
    @Column(precision = 18, scale = 6) BigDecimal thickness;
    @Column(precision = 18, scale = 6) BigDecimal width;
    @Column(precision = 18, scale = 6) BigDecimal length;

    @Column(name = "dimension_uom", length = 20)
    String dimensionUom;

    /** Density or conversion factor turning Thickness×Width×Length into a stock-UOM qty. */
    @Column(name = "density_factor", precision = 18, scale = 8)
    BigDecimal densityFactor;

    // ── Process detail ─────────────────────────────────────────────────
    /** Expected efficiency % — actual time = standard time ÷ (efficiency/100). */
    @Column(name = "efficiency_pct", precision = 6, scale = 2)
    BigDecimal efficiencyPct;

    @Column(name = "batch_qty", precision = 38, scale = 6)
    BigDecimal batchQty;

    @Column(precision = 38, scale = 6)
    BigDecimal qty;

    @Column(name = "process_cost", precision = 38, scale = 2)
    BigDecimal processCost;

    @Column(name = "setup_rate_hr", precision = 38, scale = 6)
    BigDecimal setupRateHr;

    @Column(name = "ins_rate_hr", precision = 38, scale = 6)
    BigDecimal insRateHr;

    @Column(name = "process_time_min", precision = 18, scale = 4)
    BigDecimal processTimeMin;

    @Column(name = "setup_time_min", precision = 18, scale = 4)
    BigDecimal setupTimeMin;

    @Column(name = "ins_time_min", precision = 18, scale = 4)
    BigDecimal insTimeMin;

    // ── Other Cost lines ───────────────────────────────────────────────
    /** Basis the overhead % applies to: RAW_MATERIAL, PROCESS or TOTAL. */
    @Column(name = "other_basis", length = 20)
    String otherBasis;

    @Column(name = "other_percent", precision = 6, scale = 2)
    BigDecimal otherPercent;

    /** ADD or DEDUCT. */
    @Column(name = "other_type", length = 10)
    String otherType;

    @Column(name = "other_description", length = 200)
    String otherDescription;

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}
