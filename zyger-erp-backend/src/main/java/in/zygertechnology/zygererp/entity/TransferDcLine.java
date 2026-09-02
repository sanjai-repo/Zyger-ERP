package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="transfer_dc_line") @Getter @Setter
public class TransferDcLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    TransferDc doc;
    BigDecimal qty;
    public BigDecimal getQty(){ return qty; }
}
