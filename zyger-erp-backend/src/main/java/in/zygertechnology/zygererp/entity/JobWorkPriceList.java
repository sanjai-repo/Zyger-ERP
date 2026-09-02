package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.time.LocalDate;
import java.math.BigDecimal;
@Entity @Table(name="job_work_price_list") @Getter @Setter @DocKey("job-work-price-list")
public class JobWorkPriceList extends BaseDoc implements DocEntity {
    String supplier;
    String process;
    @Column(length = 30) String uom;
    @Column(name = "rate") BigDecimal rate;
    @Column(name = "rate_basis", length = 30) String rateBasis;
    @Column(name = "effective_from") LocalDate effectiveFrom;
    @Column(name = "effective_to") LocalDate effectiveTo;
    @Column(length = 30) String currency;
    @Column(name = "approval_status", length = 30) String approvalStatus;
    @Column(name = "revision_number") Integer revisionNumber;
    @Override public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}
