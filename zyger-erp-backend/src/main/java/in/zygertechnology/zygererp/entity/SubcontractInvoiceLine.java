package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="subcontract_invoice_line") @Getter @Setter
public class SubcontractInvoiceLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    SubcontractInvoice doc;
    BigDecimal processedQty;
    BigDecimal rate;
    public BigDecimal getQty(){ return processedQty; }
}
