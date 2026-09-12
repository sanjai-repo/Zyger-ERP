package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.math.BigDecimal;

@Entity @Table(name="sales_order_item") @Getter @Setter
public class SalesOrderItem extends BaseLine implements LineEntity {

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    SalesOrder doc;

    @Column(name="item_name", length=200) String itemName;
    @Column(name="customer_part_number", length=60) String customerPartNumber;
    @Column(name="internal_part_number", length=60) String internalPartNumber;
    String description;
    @Column(name="drawing_number", length=60) String drawingNumber;
    @Column(name="drawing_revision", length=30) String drawingRevision;
    String specification;
    @Column(name="order_qty") BigDecimal orderQty;
    @Column(length=30) String uom;
    @Column(name="unit_price") BigDecimal unitPrice;
    BigDecimal discount;
    BigDecimal tax;
    @Column(name="net_amount") BigDecimal netAmount;
    @Column(name="required_delivery_date") LocalDate requiredDeliveryDate;
    @Column(name="customer_schedule_reference", length=60) String customerScheduleReference;
    @Column(name="quality_requirement", length=200) String qualityRequirement;
    @Column(name="inspection_requirement", length=200) String inspectionRequirement;
    @Column(name="certificate_requirement", length=200) String certificateRequirement;
    @Column(name="packing_requirement", length=200) String packingRequirement;
    @Column(name="surface_finish_requirement", length=200) String surfaceFinishRequirement;
    @Column(name="heat_treatment_required") Boolean heatTreatmentRequired = false;
    @Column(name="certificate_required", length=50) String certificateRequired;
    /** FRS §4.9: pending qty = quantity − Σ(committed to Work Orders) */
    @Column(name="pending_qty") BigDecimal pendingQty;

    @Override public BigDecimal getQty() { return orderQty == null ? BigDecimal.ZERO : orderQty; }
    @Override public BigDecimal getRate() { return unitPrice; }
}
