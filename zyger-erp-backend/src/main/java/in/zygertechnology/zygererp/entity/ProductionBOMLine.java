package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "production_bom_line") @Getter @Setter
public class ProductionBOMLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    ProductionBOM doc;

    @Column(name = "line_no") Integer lineNo;
    /** FRS §3.4: soft-delete flag; deleted rows excluded from weight calc */
    @Column(name = "is_deleted") Boolean isDeleted = Boolean.FALSE;
    @Column(name = "component_item_code", nullable = false, length = 60) String componentItemCode;
    @Column(name = "component_revision", length = 30) String componentRevision;
    String description;
    @Column(name = "quantity_per", nullable = false) BigDecimal quantityPer;
    @Column(length = 20) String uom;
    @Column(name = "scrap_percentage") BigDecimal scrapPercentage;
    @Column(name = "yield_percentage") BigDecimal yieldPercentage;
    @Column(name = "operation_sequence_link") Integer operationSequenceLink;
    @Column(name = "issue_method", length = 30) String issueMethod;
    @Column(name = "supply_type", length = 30) String supplyType;
    @Column(name = "alternate_group", length = 60) String alternateGroup;
    @Column(name = "substitute_item", length = 60) String substituteItem;
    Integer priority;
    @Column(name = "substitute_priority") Integer substitutePriority;
    String warehouse;
    @Column(name = "child_bom_id") Long childBomId;
    /** FRS §4.5: hierarchical level, e.g. "1", "1.1", "1.1.1" */
    @Column(name = "bom_level", length = 20) String bomLevel;
    /** FRS §4.5: weight per unit from Item Master */
    @Column(name = "weight_per_qty", precision = 14, scale = 4) BigDecimal weightPerQty;
    /** FRS §4.5: total weight = quantity × weight_per_qty */
    @Column(name = "total_weight", precision = 14, scale = 4) BigDecimal totalWeight;

    @Column(name = "scrap_percent", precision = 5, scale = 2)
    BigDecimal scrapPercent = BigDecimal.ZERO;
    @Column(name = "component_type", length = 30)
    String componentType = "RAW_MATERIAL";
    @Column(name = "is_phantom")
    Boolean isPhantom = false;
    @Column(name = "is_active") Boolean isActive = true;

    /** FRS §3.2: CNC material grade (e.g., SS304, Inconel 718) */
    @Column(name = "material_grade", length = 100) String materialGrade;
    /** FRS §3.2: form factor (e.g., Round Bar, Plate, Casting) */
    @Column(name = "material_form", length = 60) String materialForm;
    @Column(name = "diameter", precision = 14, scale = 4) BigDecimal diameter;
    @Column(name = "required_length", precision = 14, scale = 4) BigDecimal requiredLength;
    @Column(name = "required_qty", precision = 14, scale = 4) BigDecimal requiredQty;
    @Column(name = "scrap_allowance", precision = 5, scale = 2) BigDecimal scrapAllowance;
    @Column(name = "heat_lot_number", length = 60) String heatLotNumber;

    @Override public BigDecimal getQty() { return quantityPer == null ? BigDecimal.ZERO : quantityPer; }
}
