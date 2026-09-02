package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "maintenance_cost_transaction", indexes = {
        @Index(name = "idx_mct_parent", columnList = "parent_type,parent_id"),
        @Index(name = "idx_mct_machine", columnList = "machine_code")})
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class MaintenanceCostTransaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cost_reference", unique = true, length = 60)
    private String costReference;

    @Column(name = "parent_type", length = 30)
    private String parentType;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "parent_number", length = 60)
    private String parentNumber;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "cost_category", length = 30, nullable = false)
    private String costCategory;

    @Column(name = "cost_type", length = 30)
    private String costType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 14, scale = 4, nullable = false)
    @Builder.Default private BigDecimal amount = BigDecimal.ZERO;

    @Column(precision = 14, scale = 4)
    private BigDecimal qty;

    @Column(precision = 14, scale = 4)
    private BigDecimal rate;

    @Column(length = 10)
    @Builder.Default private String currency = "INR";

    @Column(name = "incurred_date")
    private LocalDate incurredDate;

    @Column(name = "posted_by", length = 60)
    private String postedBy;

    @Column(nullable = false)
    @Builder.Default private Boolean immutable = false;

    @Column(name = "reversal_id")
    private Long reversalId;

    @Version private Long version;
    @Column(name = "created_by", length = 60) private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_by", length = 60) private String updatedBy;
    @Column(name = "updated_at") private Instant updatedAt;
    @Column(nullable = false) @Builder.Default private Boolean deleted = false;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by", length = 60) private String deletedBy;
}
