package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;

@Entity
@Table(name = "product_conversion_loss")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProductConversionLoss {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "conversion_id", nullable = false)
    ProductConversion conversion;
    @Column(name = "process_loss_qty", nullable = false) BigDecimal processLossQty;
    @Column(name = "scrap_qty") BigDecimal scrapQty;
    @Column(length = 500) String lossReason;
}
