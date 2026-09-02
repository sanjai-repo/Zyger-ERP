package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="issue_against_receipt") @Getter @Setter @DocKey("issue-against-receipt")
public class IssueAgainstReceipt extends BaseDoc implements DocEntity {
    String originalReceiptNo;
    String issueRequestNo;
    String sourceLocation;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<IssueAgainstReceiptLine> lines = new java.util.ArrayList<>();
}
