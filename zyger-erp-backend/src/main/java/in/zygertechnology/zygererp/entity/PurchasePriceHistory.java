package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="purchase_price_history") @Getter @Setter
public class PurchasePriceHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    String supplier;
    @Column(name = "item_code", length = 60) String itemCode;
    @Column(name = "previous_price") BigDecimal previousPrice;
    @Column(name = "new_price") BigDecimal newPrice;
    @Column(name = "effective_date") java.time.LocalDate effectiveDate;
    @Column(name = "changed_by", length = 60) String changedBy;
    @Column(name = "approved_by", length = 60) String approvedBy;
    @Column(length = 500) String changeReason;
}
