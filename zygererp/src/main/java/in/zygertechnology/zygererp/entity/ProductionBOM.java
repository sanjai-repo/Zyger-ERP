package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Entity @Table(name = "production_bom") @Getter @Setter @DocKey("production-bom")
public class ProductionBOM extends BaseDoc implements DocEntity {
    @Column(name = "bom_number", unique = true) String bomNumber;
    @Column(name = "item_code", nullable = false, length = 60) String itemCode;
    @Column(name = "item_revision", length = 30) String itemRevision;
    @Column(name = "bom_version", length = 30) String bomVersion;
    @Column(length = 200) String description;
    @Column(name = "effective_from") LocalDate effectiveFrom;
    @Column(name = "effective_to") LocalDate effectiveTo;
    @Column(name = "base_quantity") BigDecimal baseQuantity;
    @Column(name = "base_uom", length = 20) String baseUom;
    @Column(name = "approved_by", length = 60) String approvedBy;
    @Column(name = "release_date") LocalDate releaseDate;
    @Column(name = "obsolete_date") LocalDate obsoleteDate;
    @Column(name = "parent_bom_id") Long parentBomId;
    /** FRS §4.4: FG, SEMI_FG */
    @Column(name = "item_type", length = 30) String itemType;
    /** FRS §4.4: FK to SalesOrder for SO-specific BOM */
    @Column(name = "sales_order_id") Long salesOrderId;
    /** FRS §4.4: total weight roll-up */
    @Column(precision = 14, scale = 4) BigDecimal weight;
    /** FRS §4.4: revision chain linkage */
    @Column(name = "previous_revision_id") Long previousRevisionId;
    /** FRS §5.2: Primary or Alternate */
    @Column(name = "bom_type", length = 30) String bomType;
    @Column(name = "is_active") Boolean isActive;
    /** FRS §3.2: rolled-up total material cost from components */
    @Column(name = "total_material_cost", precision = 18, scale = 4) BigDecimal totalMaterialCost;
    /** FRS §3.4: free-text specifications */
    @Column(columnDefinition = "TEXT") String specifications;
    /** FRS §3.4: integer revision number, auto-increments on Revise */
    @Column(name = "revision_no") Integer revisionNo;

    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<ProductionBOMLine> lines = new ArrayList<>();

    /** FRS v4.0 Changelog #5: derived revision label, always system-controlled */
    @com.fasterxml.jackson.annotation.JsonProperty("revisionLabel")
    public String getRevisionLabel() {
        return "Rev " + (revisionNo != null ? revisionNo : 0);
    }

    @Override public List<ProductionBOMLine> getLines() { return lines; }
}
