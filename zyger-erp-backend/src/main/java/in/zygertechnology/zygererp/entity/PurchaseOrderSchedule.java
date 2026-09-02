package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.time.LocalDate;
import java.math.BigDecimal;
@Entity @Table(name="purchase_order_schedule") @Getter @Setter
public class PurchaseOrderSchedule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    PurchaseOrder doc;
    @Column(name = "schedule_number", length = 60) String scheduleNumber;
    @Column(name = "item_code", length = 60) String itemCode;
    @Column(name = "scheduled_qty") BigDecimal scheduledQty;
    @Column(name = "scheduled_date") LocalDate scheduledDate;
    @Column(name = "revised_date") LocalDate revisedDate;
    @Column(name = "received_qty") BigDecimal receivedQty;
    @Column(name = "pending_qty") BigDecimal pendingQty;
    @Column(length = 60) String supplier;
    @Column(length = 30) String status;
}
