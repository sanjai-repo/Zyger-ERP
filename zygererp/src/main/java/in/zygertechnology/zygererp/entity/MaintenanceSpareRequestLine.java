package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "maintenance_spare_request_line")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class MaintenanceSpareRequestLine {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false)
    private Long requestId;

    @Column(name = "spare_part_id")
    private Long sparePartId;

    @Column(name = "item_code", length = 60)
    private String itemCode;

    @Column(name = "item_name", length = 200)
    private String itemName;

    @Column(length = 30)
    @Builder.Default private String uom = "NOS";

    @Column(name = "requested_qty", precision = 14, scale = 4)
    @Builder.Default private BigDecimal requestedQty = BigDecimal.ZERO;

    @Column(name = "issued_qty", precision = 14, scale = 4)
    @Builder.Default private BigDecimal issuedQty = BigDecimal.ZERO;

    @Column(name = "available_qty", precision = 14, scale = 4)
    private BigDecimal availableQty;

    @Column(name = "unit_cost", precision = 14, scale = 4)
    @Builder.Default private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(name = "line_status", length = 30)
    @Builder.Default private String lineStatus = "PENDING";

    @Column(name = "inventory_txn_id")
    private Long inventoryTxnId;
}
