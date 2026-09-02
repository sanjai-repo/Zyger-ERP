package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="return_inward_line") @Getter @Setter
public class ReturnInwardLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    ReturnInward doc;
    BigDecimal returnedQty;
    BigDecimal acceptedQty;
    BigDecimal rejectedQty;
    public BigDecimal getQty(){ return returnedQty; }
}
