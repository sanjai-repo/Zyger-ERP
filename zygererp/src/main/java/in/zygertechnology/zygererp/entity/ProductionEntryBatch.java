package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "production_entry_batch")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ProductionEntryBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_entry_id")
    @JsonIgnore
    private ProductionEntry productionEntry;

    @Column(name = "batch_number", nullable = false, length = 60)
    private String batchNumber;

    @Column(name = "allocated_qty", precision = 18, scale = 4)
    private BigDecimal allocatedQty;

    @Column(name = "warehouse_code", length = 60)
    private String warehouseCode;

    @Column(name = "batch_type", length = 20)
    private String batchType;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    public void onPrePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (allocatedQty == null) allocatedQty = BigDecimal.ZERO;
        if (batchType == null) batchType = "OUTPUT";
    }
}
