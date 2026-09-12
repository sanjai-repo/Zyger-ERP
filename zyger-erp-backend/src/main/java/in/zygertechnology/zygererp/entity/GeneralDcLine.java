package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="general_dc_line") @Getter @Setter
public class GeneralDcLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    GeneralDc doc;
    BigDecimal qty;
    BigDecimal rate;
    BigDecimal taxPercent;
    BigDecimal amount;
    String hsnCode;
    String uom;

    @Override public BigDecimal getQty(){ return qty; }
    @Override public BigDecimal getRate(){ return rate; }
    @Override public BigDecimal getAmount(){ return amount; }
    @Override public String getUom(){ return uom; }
}
