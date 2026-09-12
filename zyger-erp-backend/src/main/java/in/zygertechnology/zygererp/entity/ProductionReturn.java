package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "production_return")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProductionReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "return_number", unique = true, length = 60)
    private String returnNumber;

    @Column(name = "return_date")
    private Instant returnDate;

    @Column(name = "work_order_number", length = 60)
    private String workOrderNumber;

    @Column(name = "job_card_number", length = 60)
    private String jobCardNumber;

    @Column(name = "item_code", length = 60)
    private String itemCode;

    @Column(name = "item_description", length = 255)
    private String itemDescription;

    @Column(name = "batch_number", length = 60)
    private String batchNumber;

    @Column(precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(length = 20)
    private String uom;

    @Column(name = "original_issue_reference", length = 60)
    private String originalIssueReference;

    @Column(name = "return_reason", length = 255)
    private String returnReason;

    @Column(length = 60)
    private String condition;

    @Column(length = 60)
    private String warehouse;

    @Column(length = 60)
    private String location;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Version
    private Long version;

    @Column(name = "created_by", length = 60)
    private String createdBy;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_by", length = 60)
    private String updatedBy;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
