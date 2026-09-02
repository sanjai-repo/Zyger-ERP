package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="stock_release_line") @Getter @Setter
public class StockReleaseLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    StockRelease doc;
    BigDecimal releasedQty;
    public BigDecimal getQty(){ return releasedQty; }
}
