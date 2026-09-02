package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="received_against_issue_line") @Getter @Setter
public class ReceivedAgainstIssueLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    ReceivedAgainstIssue doc;
    BigDecimal returnedQty;
    BigDecimal acceptedQty;
    BigDecimal rejectedQty;
    public BigDecimal getQty(){ return returnedQty; }
}
