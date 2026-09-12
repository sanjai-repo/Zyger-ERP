package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;

@Entity @Table(name="po_inward_line") @Getter @Setter
public class PoInwardLine extends BaseLine implements LineEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    PoInward doc;
    @Column(name = "item_desc", length = 200) String itemDesc;
    @Column(length = 300) String description;
    @Column(length = 30) String uom;
    @Column(name = "received_qty", precision = 14, scale = 4) BigDecimal receivedQty;
    @Column(precision = 14, scale = 4) BigDecimal rate;
    @Column(precision = 14, scale = 4) BigDecimal amount;
    @Column(precision = 10, scale = 2) BigDecimal discount;
    @Column(precision = 10, scale = 2) BigDecimal tax;
    @Column(name = "tax_amount", precision = 14, scale = 4) BigDecimal taxAmount;
    @Column(name = "net_amount", precision = 14, scale = 4) BigDecimal netAmount;
    @Column(name = "accepted_qty", precision = 14, scale = 4) BigDecimal acceptedQty;
    @Column(name = "rejected_qty", precision = 14, scale = 4) BigDecimal rejectedQty;
    @Column(name = "rejected_reason", length = 250) String rejectedReason;

    public BigDecimal getQty(){ return receivedQty; }
    public void setQty(BigDecimal q){ this.receivedQty = q; }
}

