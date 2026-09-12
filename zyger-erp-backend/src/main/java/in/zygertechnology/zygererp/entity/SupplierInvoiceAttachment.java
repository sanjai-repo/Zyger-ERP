package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;
import java.time.Instant;

@Entity @Table(name = "supplier_invoice_attachment", indexes = {
        @Index(name = "idx_sia_doc", columnList = "docType,docId")
}) @Getter @Setter
public class SupplierInvoiceAttachment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    String docType;
    Long docId;
    String fileName;
    @JsonIgnore byte[] data;
    Instant uploadedAt;
}
