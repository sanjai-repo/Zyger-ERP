package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="jo_inward_line") @Getter @Setter
public class JoInwardLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    JoInward doc;
    BigDecimal producedQty;
    BigDecimal rate;
    BigDecimal acceptedQty;
    BigDecimal rejectedQty;
    public BigDecimal getQty(){ return producedQty; }
}
