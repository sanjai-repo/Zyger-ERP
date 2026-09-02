package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="physical_stock_amendment_line") @Getter @Setter
public class PhysicalStockAmendmentLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    PhysicalStockAmendment doc;
    BigDecimal systemQty;
    BigDecimal physicalQty;
    BigDecimal varianceQty;
    BigDecimal varianceValue;
    String reasonCode;
    public BigDecimal getQty(){ return physicalQty; }
}
