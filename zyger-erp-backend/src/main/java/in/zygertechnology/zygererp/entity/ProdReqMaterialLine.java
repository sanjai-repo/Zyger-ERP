package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "prod_req_material_line")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProdReqMaterialLine {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "req_id")
    @JsonIgnore
    ProdReqMaterial request;

    @Column(name = "item_code", length = 60)
    String itemCode;

    @Column(name = "item_description", length = 255)
    String itemDescription;

    @Column(name = "required_qty", precision = 18, scale = 4)
    BigDecimal requiredQty;

    @Column(name = "issued_qty", precision = 18, scale = 4)
    @Builder.Default BigDecimal issuedQty = BigDecimal.ZERO;

    @Column(length = 20)
    String uom;

    @Column(name = "store_code", length = 60)
    String storeCode;

    @Column(length = 20)
    String rack;

    @Column(length = 20)
    String bin;

    @Column(length = 40)
    String lot;

    @Column(name = "batch_number", length = 40)
    String batchNumber;

    @Column(name = "line_remarks", length = 500)
    String lineRemarks;

    @PrePersist
    void prePersist() {
        if (issuedQty == null) issuedQty = BigDecimal.ZERO;
        if (requiredQty == null) requiredQty = BigDecimal.ZERO;
    }
}