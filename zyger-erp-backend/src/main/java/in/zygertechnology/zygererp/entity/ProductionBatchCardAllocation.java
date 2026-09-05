package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * P10 — Batch Card allocation line (manual allocation of card quantity to a
 * physical batch run; CLAR-PROD-011). quantity is signed: positive for normal
 * cards, negative for reversal mirrors.
 */
@Entity
@Table(name = "production_batch_card_allocation")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionBatchCardAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_card_id", nullable = false)
    @JsonIgnore
    private ProductionBatchCard card;

    @Column(name = "line_no", nullable = false)
    private Integer lineNo;

    @Column(name = "batch_number", nullable = false, length = 60)
    private String batchNumber;

    @Column(name = "lot_number", length = 60)
    private String lotNumber;

    @Column(name = "heat_number", length = 60)
    private String heatNumber;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(length = 60)
    @Builder.Default
    private String location = "STORE";

    @Column(length = 500)
    private String remarks;
}
