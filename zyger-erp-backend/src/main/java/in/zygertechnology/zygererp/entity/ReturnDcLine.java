package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="return_dc_line") @Getter @Setter
public class ReturnDcLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    ReturnDc doc;
    BigDecimal qty;
    public BigDecimal getQty(){ return qty; }
}
