package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "stock_balance", indexes = {
    @Index(name = "idx_sb_item_loc", columnList = "item_code, location"),
    @Index(name = "idx_sb_item_status", columnList = "item_code, stock_status"),
    @Index(name = "idx_sb_item_loc_batch", columnList = "item_code, location, batch_no")
}, uniqueConstraints = {
    @UniqueConstraint(columnNames = {"item_code", "location", "batch_no", "heat_no", "stock_status"})
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class StockBalance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "item_code", nullable = false, length = 60) String itemCode;
    @Column(name = "location", nullable = false, length = 60) String location;
    @Column(name = "batch_no", nullable = false, length = 60) String batchNo;
    @Column(name = "heat_no", nullable = false, length = 60) String heatNo;

    @Column(name = "stock_status", nullable = false, length = 30)
    @Builder.Default String stockStatus = "FREE";

    @Column(name = "qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default BigDecimal qty = BigDecimal.ZERO;

    public enum StockStatus {
        FREE, QC_HOLD, BLOCKED, REJECTED, QUARANTINE, SCRAP
    }
}
