package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "route_operation") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EntityListeners(AuditEntityListener.class)
public class RouteOperation implements LineEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    RouteSheet doc;

    @Column(name = "sequence_no", nullable = false) Integer sequenceNo;
    @Column(name = "operation_code", length = 60) String operationCode;
    @Column(name = "operation_description", length = 200) String operationDescription;
    @Column(name = "work_center_code", length = 60) String workCenterCode;
    @Column(name = "machine_code", length = 60) String machineCode;
    /** FRS §4.7: FK to ProcessMaster */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "process_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    ProcessMaster process;
    /** FRS §3.3: derived read-only */
    @Column(name = "process_code", length = 60) String processCode;
    /** FRS §4.7: FK to ResourceMaster */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    ResourceMaster resource;
    @Column(name = "resource_name", length = 200) String resourceName;
    @Column(name = "resource_type", length = 30) String resourceType;
    @Column(name = "process_type", length = 30) String processType;
    @Column(name = "setup_time") BigDecimal setupTime;
    @Column(name = "cycle_time") BigDecimal cycleTime;
    @Column(name = "run_basis", length = 30) String runBasis;
    @Column(name = "overlap_percentage") BigDecimal overlapPercentage;
    @Column(name = "queue_time") BigDecimal queueTime;
    @Column(name = "move_time") BigDecimal moveTime;
    @Column(name = "inspection_required") boolean inspectionRequired;
    /** FRS §8.3 quality inspection type triggered by this operation, e.g. IPQC, FAI, LAST_OFF. */
    @Column(name = "inspection_type", length = 30) String inspectionType;
    /** FRS §8.3 alternate machine that can run this operation when the primary is unavailable. */
    @Column(name = "alternate_machine_code", length = 60) String alternateMachineCode;
    @Column(name = "subcontract_flag") boolean subcontractFlag;
    @Column(name = "tool_required") boolean toolRequired;
    @Column(name = "fixture_required") boolean fixtureRequired;
    @Column(name = "skill_required", length = 100) String skillRequired;
    @Column(name = "nc_program_reference", length = 100) String ncProgramReference;
    @Column(name = "standard_cost_rate") BigDecimal standardCostRate;
    /** FRS §3.3: MACHINING/INSPECTION/ASSEMBLY/PACKING/SUBCONTRACT */
    @Column(name = "operation_type", length = 30) String operationType;
    @Column(name = "teardown_time", precision = 14, scale = 2) BigDecimal teardownTime;
    @Column(name = "subcontract_vendor_id") Long subcontractVendorId;
    @Column(name = "skill_grade_required", length = 100) String skillGradeRequired;
    @Column(name = "manpower_count") Integer manpowerCount;
    @Column(length = 300) String remarks;

    @OneToMany(mappedBy = "routeOperation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    List<RouteOperationTool> tools = new ArrayList<>();

    /** FRS §3.3: inspection parameters for this operation */
    @OneToMany(mappedBy = "routeOperation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("routeOperation")
    @Builder.Default
    List<RouteOperationInspection> inspections = new ArrayList<>();

    @Override public String getItemCode() { return operationCode; }
    @Override public String getLocation() { return workCenterCode; }
    @Override public String getBatchNo() { return null; }
    @Override public String getHeatNo() { return null; }
    @Override public BigDecimal getQty() { return BigDecimal.ZERO; }

    @com.fasterxml.jackson.annotation.JsonProperty("processId")
    public String getProcessIdJson() { return process != null && process.getId() != null ? String.valueOf(process.getId()) : null; }

    @com.fasterxml.jackson.annotation.JsonProperty("resourceId")
    public String getResourceIdJson() { return resource != null && resource.getId() != null ? String.valueOf(resource.getId()) : null; }
}
