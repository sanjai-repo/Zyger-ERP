package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="stock_issue_request") @Getter @Setter @DocKey("stock-issue-request")
public class StockIssueRequest extends BaseDoc implements DocEntity {
    String department;
    String requestedBy;
    java.time.LocalDate requiredDate;
    String jobOrderNo;
    String purpose;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<StockIssueRequestLine> lines = new java.util.ArrayList<>();
}
