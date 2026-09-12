package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "fg_possible")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FgPossible {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "inquiry_number", unique = true, length = 60)
    String inquiryNumber;

    @Column(name = "item_code", nullable = false, length = 60)
    String itemCode;

    @Column(name = "target_date")
    LocalDate targetDate;

    @Column(name = "include_wip")
    @Builder.Default Boolean includeWip = true;

    @Column(name = "include_open_po")
    @Builder.Default Boolean includeOpenPo = true;

    @Column(name = "order_qty", precision = 38, scale = 2)
    BigDecimal orderQty;

    @Column(name = "fg_possible_qty", precision = 38, scale = 2)
    BigDecimal fgPossibleQty;

    @Column(name = "shortage_qty", precision = 38, scale = 2)
    BigDecimal shortageQty;

    @Column(name = "limiting_factor", length = 500)
    String limitingFactor;

    /** FRS §3.5: planner's decision action */
    @Column(name = "decision_action", length = 50)
    String decisionAction;

    @Column(name = "decision_remarks", length = 500)
    String decisionRemarks;

    @Column(name = "run_by", length = 100)
    String runBy;

    @Column(name = "run_date")
    Instant runDate;

    @Column(length = 30)
    @Builder.Default String status = "DRAFT";

    @Column(name = "breakdown_json", columnDefinition = "TEXT")
    String breakdownJson;

    @Column(length = 500)
    String remarks;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (runDate == null) runDate = Instant.now();
    }
}
