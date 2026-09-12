package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="purchase_request_line") @Getter @Setter
public class PurchaseRequestLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    PurchaseRequest doc;
    @Column(name = "item_name", length = 200) String itemName;
    @Column(name = "item_type", length = 60) String itemType;
    @Column(length = 200) String specification;
    @Column(name = "drawing_number", length = 60) String drawingNumber;
    @Column(name = "drawing_revision", length = 30) String drawingRevision;
    @Column(name = "material_grade", length = 60) String materialGrade;
    String size;
    @Column(name = "required_qty") BigDecimal requiredQty;
    @Column(length = 30) String uom;
    @Column(name = "required_date") java.time.LocalDate requiredDate;
    @Column(name = "store_warehouse", length = 60) String storeWarehouse;
    @Column(name = "job_order_reference", length = 60) String jobOrderReference;
    @Column(name = "production_reference", length = 60) String productionReference;
    @Override public BigDecimal getQty() { return requiredQty == null ? BigDecimal.ZERO : requiredQty; }
}
