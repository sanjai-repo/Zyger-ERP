package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="jo_dc") @Getter @Setter @DocKey("jo-dc")
public class JoDc extends BaseDoc implements DocEntity {
    String party;
    String sourceLocation;
    String vehicleNo;
    String transporter;
    String linkedDocumentNo;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<JoDcLine> lines = new java.util.ArrayList<>();
}
