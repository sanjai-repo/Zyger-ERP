package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.time.LocalDate;
import java.math.BigDecimal;
@Entity @Table(name="purchase_price_list") @Getter @Setter @DocKey("purchase-price-list")
public class PurchasePriceList extends BaseDoc implements DocEntity {
    String supplier;
    @Column(name = "item_code", length = 60) String itemCode;
    @Column(name = "material_grade", length = 60) String materialGrade;
    String size;
    @Column(length = 30) String uom;
    @Column(name = "unit_price") BigDecimal unitPrice;
    @Column(length = 30) String currency;
    @Column(name = "minimum_qty") BigDecimal minimumQty;
    @Column(name = "effective_from") LocalDate effectiveFrom;
    @Column(name = "effective_to") LocalDate effectiveTo;
    BigDecimal tax;
    @Column(name = "approval_status", length = 30) String approvalStatus;
    @Column(name = "revision_number") Integer revisionNumber;
    @Override public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}
