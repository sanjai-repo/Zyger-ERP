package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="lo_inward") @Getter @Setter @DocKey("lo-inward")
public class LoInward extends BaseDoc implements DocEntity {
    String vendor;
    String labourOrderNo;
    String jobOrderNo;
    String process;
    @Column(name = "qc_required", length = 20) String qcRequired;
    @Column(name = "supplier_invoice_no", length = 60) String supplierInvoiceNo;
    @Column(name = "dc_number", length = 60) String dcNumber;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<LoInwardLine> lines = new java.util.ArrayList<>();
}
