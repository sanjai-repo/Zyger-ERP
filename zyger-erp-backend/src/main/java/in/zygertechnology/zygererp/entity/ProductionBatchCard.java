package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * P10 — First-class Batch Card document (NUM-PROD-BATCH, {@code BC-...}).
 * Execution + traceability record for batch/lot-controlled items (CLAR-PROD-011);
 * manual allocation of production output to physical batch runs.
 * RECORDING-ONLY: never modifies production_entry quantities, WIP, subjob roll-ups,
 * normalized events, or stock_ledger / stock_balance.
 */
@Entity
@Table(name = "production_batch_card")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionBatchCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "doc_number", nullable = false, unique = true, length = 80)
    private String docNumber;

    @Column(name = "physical_batch_number", length = 60)
    private String physicalBatchNumber;

    @Column(name = "lot_number", length = 60)
    private String lotNumber;

    @Column(name = "heat_number", length = 60)
    private String heatNumber;

    @Column(name = "item_code", length = 60)
    private String itemCode;

    @Column(name = "item_name", length = 200)
    private String itemName;

    @Column(length = 20)
    private String uom;

    @Column(nullable = false)
    private java.math.BigDecimal quantity;

    @Column(name = "entry_id", nullable = false)
    private Long entryId;

    @Column(name = "entry_number", nullable = false, length = 80)
    private String entryNumber;

    @Column(name = "job_card_number", length = 80)
    private String jobCardNumber;

    @Column(name = "subjob_number", length = 80)
    private String subjobNumber;

    @Column(name = "operation_code", length = 80)
    private String operationCode;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "OPEN";

    @Column(name = "reversal_reason", length = 255)
    private String reversalReason;

    @Column(name = "reversed_from_doc_id")
    private Long reversedFromDocId;

    @Column(name = "is_reversal", nullable = false)
    @Builder.Default
    private Boolean isReversal = false;

    @Column(length = 500)
    private String remarks;

    @Column(name = "created_by", length = 80)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private java.time.Instant createdAt;

    @Column(name = "updated_by", length = 80)
    private String updatedBy;

    @Column(name = "updated_at")
    private java.time.Instant updatedAt;

    @Version
    private Long version;

    @OneToMany(mappedBy = "card", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("lineNo ASC")
    @Builder.Default
    private List<ProductionBatchCardAllocation> allocations = new ArrayList<>();

    public void setAllocations(List<ProductionBatchCardAllocation> list) {
        this.allocations = new ArrayList<>();
        if (list != null) {
            int n = 1;
            for (ProductionBatchCardAllocation l : list) {
                if (l == null) continue;
                l.setCard(this);
                if (l.getLineNo() == null) l.setLineNo(n);
                if (l.getLocation() == null || l.getLocation().isBlank()) l.setLocation("STORE");
                this.allocations.add(l);
                n++;
            }
        }
    }
}
