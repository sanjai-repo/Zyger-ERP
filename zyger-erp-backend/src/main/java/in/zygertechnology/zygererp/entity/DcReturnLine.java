package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name="dc_return_line") @Getter @Setter
public class DcReturnLine extends BaseLine implements LineEntity {

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    DcReturn doc;

    @Column(name="item_name", length=200) String itemName;
    @Column(name="customer_part_number", length=60) String customerPartNumber;
    @Column(name="original_dc_qty") BigDecimal originalDcQty;
    @Column(name="previously_returned_qty") BigDecimal previouslyReturnedQty;
    @Column(name="returned_qty") BigDecimal returnedQty;
    @Column(name="current_return_qty") BigDecimal currentReturnQty;
    @Column(length=30) String uom;
    @Column(name="serial_number", length=60) String serialNumber;
    @Column(name="drawing_number", length=60) String drawingNumber;
    @Column(name="drawing_revision", length=30) String drawingRevision;
    @Column(name="return_reason", length=200) String returnReason;
    @Column(name="material_condition", length=100) String materialCondition;

    @Override public BigDecimal getQty() { return currentReturnQty == null ? BigDecimal.ZERO : currentReturnQty; }
}
