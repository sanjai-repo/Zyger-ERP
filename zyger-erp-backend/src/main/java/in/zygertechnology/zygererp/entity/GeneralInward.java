package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="general_inward") @Getter @Setter @DocKey("general-inward")
public class GeneralInward extends BaseDoc implements DocEntity {
    String sourceType;
    String party;
    String reasonCode;
    String returnable;
    @Column(name = "qc_required", length = 20) String qcRequired;
    @Column(name = "supplier_invoice_no", length = 60) String supplierInvoiceNo;
    @Column(name = "dc_number", length = 60) String dcNumber;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<GeneralInwardLine> lines = new java.util.ArrayList<>();
}
