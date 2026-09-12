package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="grn_line") @Getter @Setter
public class GrnLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    Grn doc;
    BigDecimal acceptedQty;
    BigDecimal inspectedQty;
    BigDecimal rate;
    BigDecimal rejectedQty;
    public BigDecimal getQty(){ return acceptedQty; }
}
