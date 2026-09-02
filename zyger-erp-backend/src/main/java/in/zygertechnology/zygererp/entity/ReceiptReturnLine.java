package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="receipt_return_line") @Getter @Setter
public class ReceiptReturnLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    ReceiptReturn doc;
    BigDecimal returnedQty;
    BigDecimal acceptedQty;
    BigDecimal rejectedQty;
    public BigDecimal getQty(){ return returnedQty; }
}
