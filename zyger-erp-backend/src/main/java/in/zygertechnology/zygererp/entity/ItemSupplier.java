package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "item_supplier", indexes = {
        @Index(name = "idx_item_supp_item", columnList = "item_code"),
        @Index(name = "idx_item_supp_supp", columnList = "supplier_code")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ItemSupplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_code", length = 60, nullable = false)
    private String itemCode;

    @Column(name = "supplier_code", length = 60, nullable = false)
    private String supplierCode;

    @Column(name = "supplier_name", length = 200)
    private String supplierName;

    @Column(name = "supplier_part_number", length = 100)
    private String supplierPartNumber;

    @Column(name = "lead_time_days")
    private Integer leadTimeDays;

    @Column(name = "last_purchase_price", precision = 14, scale = 2)
    private BigDecimal lastPurchasePrice;

    @Column(name = "supplier_status", length = 30)
    @Builder.Default
    private String supplierStatus = "ALTERNATE";

    @Column(length = 500)
    private String remarks;
}
