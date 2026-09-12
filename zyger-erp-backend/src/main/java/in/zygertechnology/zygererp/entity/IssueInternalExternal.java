package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="issue_internal_external") @Getter @Setter @DocKey("issue-internal-external")
public class IssueInternalExternal extends BaseDoc implements DocEntity {
    String issueType;
    String toDepartment;
    String issuedTo;
    String returnable;
    String issueRequestNo;
    String sourceLocation;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<IssueInternalExternalLine> lines = new java.util.ArrayList<>();
}
