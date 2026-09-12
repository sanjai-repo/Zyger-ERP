package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;

@Entity
@Table(name = "prod_consumption_line")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProductionConsumptionLine {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consumption_id")
    @JsonIgnore
    ProductionConsumption consumption;

    @Column(name = "item_code", length = 60)
    String itemCode;

    @Column(name = "item_description", length = 255)
    String itemDescription;

    @Column(name = "issued_qty", precision = 18, scale = 4)
    BigDecimal issuedQty;

    @Column(name = "consumed_qty", precision = 18, scale = 4)
    BigDecimal consumedQty;

    @Column(name = "return_qty", precision = 18, scale = 4)
    @Builder.Default BigDecimal returnQty = BigDecimal.ZERO;

    @Column(name = "scrap_qty", precision = 18, scale = 4)
    @Builder.Default BigDecimal scrapQty = BigDecimal.ZERO;

    @Column(name = "batch_number", length = 40)
    String batchNumber;

    @Column(length = 20)
    String uom;

    @Column(length = 60)
    String location;

    @Column(name = "line_remarks", length = 500)
    String lineRemarks;

    @PrePersist
    void prePersist() {
        if (consumedQty == null) consumedQty = BigDecimal.ZERO;
        if (issuedQty == null) issuedQty = BigDecimal.ZERO;
        if (returnQty == null) returnQty = BigDecimal.ZERO;
        if (scrapQty == null) scrapQty = BigDecimal.ZERO;
    }
}