package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Entity @Table(name = "route_sheet") @Getter @Setter @DocKey("route-sheet")
public class RouteSheet extends BaseDoc implements DocEntity {
    @Column(name = "route_number", unique = true) String routeNumber;
    @Column(name = "item_code", nullable = false, length = 60) String itemCode;
    @Column(name = "item_type", length = 30) String itemType;
    @Column(name = "item_revision", length = 30) String itemRevision;
    @Column(name = "route_version", length = 30) String routeVersion;
    @Column(length = 200) String description;
    @Column(name = "effective_from") LocalDate effectiveFrom;
    @Column(name = "effective_to") LocalDate effectiveTo;
    @Column(name = "base_quantity") BigDecimal baseQuantity;
    @Column(name = "base_uom", length = 20) String baseUom;
    @Column(name = "approved_by", length = 60) String approvedBy;
    /** FRS §3.3: integer revision number, auto-increments on Revise */
    @Column(name = "revision_no") Integer revisionNo;
    /** FRS §3.3: AUTO-FILL sum of detail setup times */
    @Column(name = "total_setup_time", precision = 14, scale = 2) BigDecimal totalSetupTime;
    /** FRS §3.3: AUTO-FILL sum of detail cycle times */
    @Column(name = "total_cycle_time", precision = 14, scale = 2) BigDecimal totalCycleTime;
    /** FRS §3.3: AUTO-FILL sum of detail run times */
    @Column(name = "total_run_time", precision = 14, scale = 2) BigDecimal totalRunTime;

    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<RouteOperation> operations = new ArrayList<>();

    /** FRS v4.0 Changelog #5: derived revision label, always system-controlled */
    @com.fasterxml.jackson.annotation.JsonProperty("revisionLabel")
    public String getRevisionLabel() {
        return "Rev " + (revisionNo != null ? revisionNo : 0);
    }

    @Override
    @com.fasterxml.jackson.annotation.JsonProperty("lines")
    public List<RouteOperation> getLines() { return operations; }

    @com.fasterxml.jackson.annotation.JsonSetter("lines")
    public void setLines(List<RouteOperation> lines) {
        this.operations.clear();
        if (lines != null) this.operations.addAll(lines);
    }
}
