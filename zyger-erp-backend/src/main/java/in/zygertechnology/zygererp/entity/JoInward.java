package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="jo_inward") @Getter @Setter @DocKey("jo-inward")
public class JoInward extends BaseDoc implements DocEntity {
    String jobOrderNo;
    String workCenter;
    String operationNo;
    @Column(name = "qc_required", length = 20) String qcRequired;
    @Column(name = "supplier_invoice_no", length = 60) String supplierInvoiceNo;
    @Column(name = "dc_number", length = 60) String dcNumber;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<JoInwardLine> lines = new java.util.ArrayList<>();
}
