package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="general_issue") @Getter @Setter @DocKey("general-issue")
public class GeneralIssue extends BaseDoc implements DocEntity {
    String department;
    String purpose;
    String issueRequestNo;
    String sourceLocation;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<GeneralIssueLine> lines = new java.util.ArrayList<>();
}
