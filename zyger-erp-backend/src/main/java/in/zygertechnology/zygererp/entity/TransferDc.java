package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="transfer_dc") @Getter @Setter @DocKey("transfer-dc")
public class TransferDc extends BaseDoc implements DocEntity {
    String party;
    String sourceLocation;
    String destinationLocation;
    String vehicleNo;
    String transporter;
    String linkedDocumentNo;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<TransferDcLine> lines = new java.util.ArrayList<>();
}
