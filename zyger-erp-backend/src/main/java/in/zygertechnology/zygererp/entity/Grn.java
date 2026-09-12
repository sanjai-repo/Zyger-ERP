package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="grn") @Getter @Setter @DocKey("grn")
public class Grn extends BaseDoc implements DocEntity {
    String sourceType;
    String sourceDocumentNo;
    String party;
    String inspectionRef;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<GrnLine> lines = new java.util.ArrayList<>();
}
