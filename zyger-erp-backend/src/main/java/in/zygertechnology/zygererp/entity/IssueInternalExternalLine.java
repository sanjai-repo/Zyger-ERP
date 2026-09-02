package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
@Entity @Table(name="issue_internal_external_line") @Getter @Setter
public class IssueInternalExternalLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    IssueInternalExternal doc;
    BigDecimal issueQty;
    String returnable;
    public BigDecimal getQty(){ return issueQty; }
}
