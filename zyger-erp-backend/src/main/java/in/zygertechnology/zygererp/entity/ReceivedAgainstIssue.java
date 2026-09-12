package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="received_against_issue") @Getter @Setter @DocKey("received-against-issue")
public class ReceivedAgainstIssue extends BaseDoc implements DocEntity {
    String party;
    String originalDocumentNo;
    String reasonCode;
    String inspectionRequired;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<ReceivedAgainstIssueLine> lines = new java.util.ArrayList<>();
}
