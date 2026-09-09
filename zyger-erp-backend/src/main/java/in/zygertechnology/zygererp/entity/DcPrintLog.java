package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** Audit of every Delivery Challan print event (DOCUMENT 02 v2.0 FR-INV-DC-PRINT-1). */
@Entity
@Table(name = "dc_print_log")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class DcPrintLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "doc_no", nullable = false, length = 60) String docNo;
    @Column(name = "doc_type", length = 60) String docType;
    @Column(name = "printed_by", nullable = false, length = 255) String printedBy;
    @Builder.Default Instant printedAt = Instant.now();
    @Builder.Default Integer copyNumber = 1;
}
