package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="general_inward_line") @Getter @Setter
public class GeneralInwardLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    GeneralInward doc;
    BigDecimal receivedQty;
    BigDecimal rate;
    BigDecimal acceptedQty;
    BigDecimal rejectedQty;
    public BigDecimal getQty(){ return receivedQty; }
}
