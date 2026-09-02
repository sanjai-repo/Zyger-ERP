package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="purchase_request") @Getter @Setter @DocKey("purchase-request")
public class PurchaseRequest extends BaseDoc implements DocEntity {
    @Column(name = "department", length = 100) String department;
    String requestingDepartment;
    String requestBy;
    @Column(name = "requested_by", length = 100) String requestedBy;
    LocalDate requiredDate;
    @Column(length = 30) String priority;
    @Column(name = "request_type", length = 30) String requestType;
    @Column(length = 60) String source;
    @Column(name = "reference_type", length = 60) String referenceType;
    @Column(name = "reference_number", length = 60) String referenceNumber;
    @Column(name = "attachment_file_name", length = 200) String attachmentFileName;
    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<PurchaseRequestLine> lines = new ArrayList<>();
}
