package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;

@Entity
@Table(name = "product_conversion_input")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProductConversionInput {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "conversion_id", nullable = false)
    ProductConversion conversion;
    @Column(name = "item_id") Long itemId;
    @Column(name = "item_code", length = 60) String itemCode;
    @Column(name = "batch_lot_no", length = 60) String batchLotNo;
    @Column(nullable = false) BigDecimal qty;
    @Column(length = 20) String uom;
    @Column(name = "warehouse_id") Long warehouseId;
    @Column(length = 60) String location;
}
