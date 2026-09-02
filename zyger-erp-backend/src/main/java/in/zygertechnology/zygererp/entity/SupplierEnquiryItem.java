package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.time.LocalDate;
import java.math.BigDecimal;
@Entity @Table(name="supplier_enquiry_item") @Getter @Setter
public class SupplierEnquiryItem extends BaseLine implements LineEntity {
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    SupplierEnquiry doc;
    @Column(name = "item_name", length = 200) String itemName;
    @Column(length = 200) String specification;
    @Column(name = "drawing_number", length = 60) String drawingNumber;
    @Column(name = "drawing_revision", length = 30) String drawingRevision;
    @Column(name = "required_qty") BigDecimal requiredQty;
    @Column(length = 30) String uom;
    @Column(name = "required_delivery_date") LocalDate requiredDeliveryDate;
    @Column(name = "attachment_file_name", length = 200) String attachmentFileName;
    @Override public BigDecimal getQty() { return requiredQty == null ? BigDecimal.ZERO : requiredQty; }
}
