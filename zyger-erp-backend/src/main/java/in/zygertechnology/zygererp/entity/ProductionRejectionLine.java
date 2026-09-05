package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * P9 — Line of a {@link ProductionRejectionDoc}. Disposition per BR-PROD-REJ-001:
 * REWORKABLE / SCRAP / HOLD_MRB. Batch identity required for batch/lot-controlled
 * items only (CLAR-PROD-011).
 */
@Entity
@Table(name = "production_rejection_line")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionRejectionLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rejection_doc_id", nullable = false)
    @JsonIgnore
    private ProductionRejectionDoc doc;

    @Column(name = "line_no", nullable = false)
    private Integer lineNo;

    @Column(name = "item_code", length = 60, nullable = false)
    private String itemCode;

    @Column(name = "item_name", length = 200)
    private String itemName;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(length = 20)
    private String uom;

    @Column(name = "reason_code", length = 60, nullable = false)
    private String reasonCode;

    @Column(name = "reason_description", length = 255)
    private String reasonDescription;

    @Column(nullable = false, length = 30)
    private String disposition;

    @Column(name = "batch_number", length = 60)
    private String batchNumber;

    @Column(length = 60)
    @Builder.Default
    private String location = "STORE";

    @Column(length = 500)
    private String remarks;
}