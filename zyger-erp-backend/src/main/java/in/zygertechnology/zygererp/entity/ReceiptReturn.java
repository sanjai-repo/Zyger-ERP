package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="receipt_return") @Getter @Setter @DocKey("receipt-return")
public class ReceiptReturn extends BaseDoc implements DocEntity {
    String party;
    String originalDocumentNo;
    String reasonCode;
    String inspectionRequired;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<ReceiptReturnLine> lines = new java.util.ArrayList<>();
}
