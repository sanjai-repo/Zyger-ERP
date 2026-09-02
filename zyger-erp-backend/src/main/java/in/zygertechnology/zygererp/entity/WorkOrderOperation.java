package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.math.BigDecimal;

@Entity @Table(name = "work_order_operation") @Getter @Setter
public class WorkOrderOperation implements LineEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    WorkOrder doc;

    @Column(name = "operation_sequence", nullable = false) Integer operationSequence;
    @Column(name = "operation_code", length = 60) String operationCode;
    @Column(name = "operation_description", length = 200) String operationDescription;
    @Column(name = "work_center_code", length = 60) String workCenterCode;
    @Column(name = "machine_code", length = 60) String machineCode;
    @Column(name = "planned_quantity") BigDecimal plannedQuantity;
    @Column(name = "completed_quantity") BigDecimal completedQuantity;
    @Column(name = "good_quantity") BigDecimal goodQuantity;
    @Column(name = "scrap_quantity") BigDecimal scrapQuantity;
    @Column(name = "rework_quantity") BigDecimal reworkQuantity;
    @Column(name = "setup_time_planned") BigDecimal setupTimePlanned;
    @Column(name = "setup_time_actual") BigDecimal setupTimeActual;
    @Column(name = "cycle_time_planned") BigDecimal cycleTimePlanned;
    @Column(name = "cycle_time_actual") BigDecimal cycleTimeActual;
    String operator;
    @Column(name = "start_time") Instant startTime;
    @Column(name = "end_time") Instant endTime;
    @Column(name = "inspection_required") boolean inspectionRequired;
    @Column(name = "subcontract_flag") boolean subcontractFlag;
    @Column(name = "tool_required") boolean toolRequired;
    @Column(name = "fixture_required") boolean fixtureRequired;
    @Column(name = "nc_program_reference", length = 100) String ncProgramReference;
    @Column(length = 30) String status;
    @Column(length = 300) String remarks;

    /** FRS v4.0 §6.3.3 Changelog #7: traceability link to source Route Sheet operation */
    @Column(name = "route_operation_id")
    Long routeOperationId;

    @Override public String getItemCode() { return operationCode; }
    @Override public String getLocation() { return workCenterCode; }
    @Override public String getBatchNo() { return null; }
    @Override public String getHeatNo() { return null; }
    @Override public BigDecimal getQty() { return plannedQuantity == null ? BigDecimal.ZERO : plannedQuantity; }
}
