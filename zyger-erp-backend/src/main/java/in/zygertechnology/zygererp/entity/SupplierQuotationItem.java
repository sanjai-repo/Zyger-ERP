package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="supplier_quotation_item") @Getter @Setter
public class SupplierQuotationItem extends BaseLine implements LineEntity {
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    SupplierQuotation doc;
    @Column(name = "item_name", length = 200) String itemName;
    @Column(length = 200) String description;
    @Column(name = "required_qty") BigDecimal requiredQty;
    @Column(length = 30) String uom;
    @Column(name = "unit_price") BigDecimal unitPrice;
    BigDecimal discount;
    BigDecimal tax;
    @Column(name = "net_price") BigDecimal netPrice;
    @Column(name = "delivery_lead_time") Integer deliveryLeadTime;
    @Column(name = "minimum_order_qty") BigDecimal minimumOrderQty;
    @Column(name = "manufacturer_brand", length = 200) String manufacturerBrand;
    @Column(length = 200) String specification;
    @Override public BigDecimal getQty() { return requiredQty == null ? BigDecimal.ZERO : requiredQty; }
    @Override public BigDecimal getRate() { return unitPrice; }
}
