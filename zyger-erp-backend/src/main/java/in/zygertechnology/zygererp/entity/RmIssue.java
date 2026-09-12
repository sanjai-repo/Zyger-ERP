package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="rm_issue") @Getter @Setter @DocKey("rm-issue")
public class RmIssue extends BaseDoc implements DocEntity {
    String jobOrderNo;
    String issueRequestNo;
    String sourceLocation;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<RmIssueLine> lines = new java.util.ArrayList<>();
}
