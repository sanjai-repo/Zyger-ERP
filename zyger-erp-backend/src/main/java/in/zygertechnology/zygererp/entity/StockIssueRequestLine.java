package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="stock_issue_request_line") @Getter @Setter
public class StockIssueRequestLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    StockIssueRequest doc;
    BigDecimal requestedQty;
    BigDecimal approvedQty;
    String returnable;
    public BigDecimal getQty(){ return requestedQty; }
}
