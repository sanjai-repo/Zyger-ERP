package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="job_work_price_history") @Getter @Setter
public class JobWorkPriceHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    String supplier;
    String process;
    @Column(name = "previous_rate") BigDecimal previousRate;
    @Column(name = "new_rate") BigDecimal newRate;
    @Column(name = "effective_date") java.time.LocalDate effectiveDate;
    @Column(name = "changed_by", length = 60) String changedBy;
    @Column(name = "approved_by", length = 60) String approvedBy;
    @Column(length = 500) String changeReason;
}
