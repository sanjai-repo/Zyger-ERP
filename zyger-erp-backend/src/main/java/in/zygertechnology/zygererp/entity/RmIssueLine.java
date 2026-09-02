package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="rm_issue_line") @Getter @Setter
public class RmIssueLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    RmIssue doc;
    BigDecimal issueQty;
    String returnable;
    public BigDecimal getQty(){ return issueQty; }
}
