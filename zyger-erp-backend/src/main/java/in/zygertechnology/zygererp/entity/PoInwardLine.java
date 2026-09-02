package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="po_inward_line") @Getter @Setter
public class PoInwardLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    PoInward doc;
    BigDecimal receivedQty;
    BigDecimal rate;
    BigDecimal acceptedQty;
    BigDecimal rejectedQty;
    public BigDecimal getQty(){ return receivedQty; }
    public void setQty(BigDecimal q){ this.receivedQty = q; }
}
