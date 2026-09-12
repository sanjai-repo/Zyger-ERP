package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.time.LocalDate;
import java.math.BigDecimal;
@Entity @Table(name="job_order_schedule") @Getter @Setter
public class JobOrderSchedule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    JobOrder doc;
    @Column(name = "schedule_number", length = 60) String scheduleNumber;
    @Column(name = "item_code", length = 60) String itemCode;
    String process;
    @Column(name = "scheduled_qty") BigDecimal scheduledQty;
    @Column(name = "issue_date") LocalDate issueDate;
    @Column(name = "expected_return_date") LocalDate expectedReturnDate;
    @Column(name = "received_qty") BigDecimal receivedQty;
    @Column(name = "pending_qty") BigDecimal pendingQty;
    @Column(name = "rejected_qty") BigDecimal rejectedQty;
    @Column(length = 30) String status;
}
