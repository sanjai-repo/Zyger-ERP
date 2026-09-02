package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="purchase_order_item") @Getter @Setter
public class PurchaseOrderItem extends BaseLine implements LineEntity {
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    PurchaseOrder doc;
    @Column(name = "item_name", length = 200) String itemName;
    @Column(length = 200) String specification;
    @Column(name = "drawing_number", length = 60) String drawingNumber;
    @Column(name = "drawing_revision", length = 30) String drawingRevision;
    @Column(name = "material_grade", length = 60) String materialGrade;
    @Column(name = "material_certificate_required") Boolean materialCertificateRequired = false;
    @Column(name = "heat_number_required") Boolean heatNumberRequired = false;
    String size;
    @Column(name = "order_qty") BigDecimal orderQty;
    @Column(length = 30) String uom;
    @Column(name = "unit_price") BigDecimal unitPrice;
    BigDecimal discount;
    BigDecimal tax;
    @Column(name = "net_amount") BigDecimal netAmount;
    @Column(name = "required_date") java.time.LocalDate requiredDate;
    @Column(length = 60) String warehouse;
    @Column(name = "schedule_reference", length = 60) String scheduleReference;
    @Column(name = "job_order_reference", length = 60) String jobOrderReference;
    @Override public BigDecimal getQty() { return orderQty == null ? BigDecimal.ZERO : orderQty; }
    @Override public BigDecimal getRate() { return unitPrice; }
}
