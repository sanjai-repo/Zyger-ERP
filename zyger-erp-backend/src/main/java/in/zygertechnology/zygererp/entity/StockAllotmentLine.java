package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="stock_allotment_line") @Getter @Setter
public class StockAllotmentLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    StockAllotment doc;
    BigDecimal allottedQty;
    public BigDecimal getQty(){ return allottedQty; }
}
