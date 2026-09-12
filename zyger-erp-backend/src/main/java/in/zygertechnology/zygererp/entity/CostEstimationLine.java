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

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}
