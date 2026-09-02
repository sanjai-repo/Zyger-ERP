package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="issue_against_receipt_line") @Getter @Setter
public class IssueAgainstReceiptLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    IssueAgainstReceipt doc;
    BigDecimal issueQty;
    String returnable;
    public BigDecimal getQty(){ return issueQty; }
}
