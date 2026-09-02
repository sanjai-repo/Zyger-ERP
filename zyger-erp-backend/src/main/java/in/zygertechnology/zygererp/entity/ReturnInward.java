package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="return_inward") @Getter @Setter @DocKey("return-inward")
public class ReturnInward extends BaseDoc implements DocEntity {
    String party;
    String originalDocumentNo;
    String reasonCode;
    String inspectionRequired;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<ReturnInwardLine> lines = new java.util.ArrayList<>();
}
