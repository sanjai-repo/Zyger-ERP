package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="inward_return") @Getter @Setter @DocKey("inward-return")
public class InwardReturn extends BaseDoc implements DocEntity {
    String party;
    String originalDocumentNo;
    String reasonCode;
    String inspectionRequired;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<InwardReturnLine> lines = new java.util.ArrayList<>();
}
