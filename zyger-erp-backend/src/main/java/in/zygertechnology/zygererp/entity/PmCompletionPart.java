package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "pm_completion_part")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class PmCompletionPart {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "completion_id", nullable = false)
    Long completionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spare_part_id")
    SparePartMaster sparePart;

    @Column(name = "spare_part_code", length = 60)
    String sparePartCode;

    @Column(name = "spare_part_name", length = 200)
    String sparePartName;

    @Column(name = "qty_used", nullable = false, precision = 12, scale = 2)
    @Builder.Default BigDecimal qtyUsed = BigDecimal.ZERO;

    @Column(name = "unit_cost", precision = 14, scale = 2)
    @Builder.Default BigDecimal unitCost = BigDecimal.ZERO;

    @Column(name = "inventory_txn_id")
    Long inventoryTxnId;

    @Builder.Default
    Instant createdAt = Instant.now();
}
