package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="return_dc") @Getter @Setter @DocKey("return-dc")
public class ReturnDc extends BaseDoc implements DocEntity {
    String party;
    String sourceLocation;
    String vehicleNo;
    String transporter;
    String linkedDocumentNo;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<ReturnDcLine> lines = new java.util.ArrayList<>();
}
