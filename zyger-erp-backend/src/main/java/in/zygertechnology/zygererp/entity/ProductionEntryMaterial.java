package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "production_entry_material")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ProductionEntryMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_entry_id")
    @JsonIgnore
    private ProductionEntry productionEntry;

    @Column(name = "rm_code", nullable = false, length = 60)
    private String rmCode;

    @Column(name = "req_qty", precision = 18, scale = 4)
    private BigDecimal reqQty;

    @Column(name = "total_issued_qty", precision = 18, scale = 4)
    private BigDecimal totalIssuedQty;

    @Column(name = "available_qty", precision = 18, scale = 4)
    private BigDecimal availableQty;

    @Column(name = "scrap_qty", precision = 18, scale = 4)
    private BigDecimal scrapQty;

    @Column(name = "rp_qty", precision = 18, scale = 4)
    private BigDecimal rpQty;

    @Column(name = "consumed_qty", precision = 18, scale = 4)
    private BigDecimal consumedQty;

    @Column(name = "deviation_qty", precision = 18, scale = 4)
    private BigDecimal deviationQty;

    @Column(name = "return_qty", precision = 18, scale = 4)
    private BigDecimal returnQty;

    @Column(name = "rate", precision = 14, scale = 2)
    private BigDecimal rate;

    @Column(name = "batch_number", length = 60)
    private String batchNumber;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    public void onPrePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (reqQty == null) reqQty = BigDecimal.ZERO;
        if (totalIssuedQty == null) totalIssuedQty = BigDecimal.ZERO;
        if (availableQty == null) availableQty = BigDecimal.ZERO;
        if (scrapQty == null) scrapQty = BigDecimal.ZERO;
        if (rpQty == null) rpQty = BigDecimal.ZERO;
        if (consumedQty == null) consumedQty = BigDecimal.ZERO;
        if (deviationQty == null) deviationQty = BigDecimal.ZERO;
        if (returnQty == null) returnQty = BigDecimal.ZERO;
        if (rate == null) rate = BigDecimal.ZERO;
    }
}
