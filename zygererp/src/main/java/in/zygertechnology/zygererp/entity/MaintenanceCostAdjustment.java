package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "maintenance_cost_adjustment", indexes = {
        @Index(name = "idx_mca_cost_transaction", columnList = "cost_transaction_id"),
        @Index(name = "idx_mca_parent", columnList = "parent_type,parent_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaintenanceCostAdjustment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "cost_transaction_id", nullable = false) Long costTransactionId;
    @Column(name = "parent_type", length = 30) String parentType;
    @Column(name = "parent_id") Long parentId;
    @Column(name = "parent_number", length = 60) String parentNumber;
    @Column(name = "machine_code", length = 60) String machineCode;
    /** ADJUST | REVERSE */
    @Column(name = "adjustment_type", length = 20) @Builder.Default String adjustmentType = "ADJUST";
    @Column(name = "delta_amount", precision = 14, scale = 4, nullable = false) BigDecimal deltaAmount;
    @Column(columnDefinition = "TEXT") String reason;
    @Column(name = "posted_by", length = 60) String postedBy;
    @Column(name = "posted_at", nullable = false) Instant postedAt;
}