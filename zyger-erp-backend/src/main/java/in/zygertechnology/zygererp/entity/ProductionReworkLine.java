package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * P9 — Line of a {@link ProductionReworkDoc}. Source/target operation linkage per
 * CLAR-PROD-005 (rework as rework-route subjobs) and FR-PROD-ENTRY-002 (original entry +
 * NCR + authorization reference). Batch identity for batch/lot-controlled items only.
 */
@Entity
@Table(name = "production_rework_line")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionReworkLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rework_doc_id", nullable = false)
    @JsonIgnore
    private ProductionReworkDoc doc;

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

    @Column(name = "source_operation_code", length = 80)
    private String sourceOperationCode;

    @Column(name = "target_operation_code", length = 80)
    private String targetOperationCode;

    @Column(name = "ncr_number", length = 80)
    private String ncrNumber;

    @Column(name = "authorization_number", length = 80)
    private String authorizationNumber;

    @Column(name = "batch_number", length = 60)
    private String batchNumber;

    @Column(length = 500)
    private String remarks;
}