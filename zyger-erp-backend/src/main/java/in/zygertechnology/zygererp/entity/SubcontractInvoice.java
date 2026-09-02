package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="subcontract_invoice") @Getter @Setter @DocKey("subcontract-invoice")
public class SubcontractInvoice extends BaseDoc implements DocEntity {
    String vendor;
    String labourOrderNo;
    String process;
    BigDecimal totalAmount;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<SubcontractInvoiceLine> lines = new java.util.ArrayList<>();
}
