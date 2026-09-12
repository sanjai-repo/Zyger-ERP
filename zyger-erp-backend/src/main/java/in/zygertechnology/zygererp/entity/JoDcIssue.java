package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="jo_dc_issue") @Getter @Setter @DocKey("jo-dc-issue")
public class JoDcIssue extends BaseDoc implements DocEntity {
    String vendor;
    String jobOrderNo;
    String issueRequestNo;
    String sourceLocation;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<JoDcIssueLine> lines = new java.util.ArrayList<>();
}
