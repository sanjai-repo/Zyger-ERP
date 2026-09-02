package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="purchase_target") @Getter @Setter @DocKey("purchase-target")
public class PurchaseTarget extends BaseDoc implements DocEntity {
    @Column(length = 60) String period;
    String department;
    @Column(name = "employee_buyer", length = 120) String employeeBuyer;
    @Column(name = "target_type", length = 60) String targetType;
    @Column(name = "start_date") java.time.LocalDate startDate;
    @Column(name = "end_date") java.time.LocalDate endDate;
    @Column(name = "target_value") BigDecimal targetValue;
    BigDecimal achievement;
    BigDecimal variance;
    @Override public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}
