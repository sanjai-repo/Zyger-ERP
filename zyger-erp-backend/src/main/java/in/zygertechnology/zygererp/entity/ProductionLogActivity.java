package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "production_log_activity")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProductionLogActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "log_sheet_id")
    @JsonIgnore
    private ProductionLogSheet logSheet;

    @Column(name = "activity_type", length = 60)
    private String activityType;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(precision = 18, scale = 2)
    private BigDecimal duration;

    @Column(precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(name = "related_breakdown_id") Long relatedBreakdownId;

    @Column(name = "qty_completed_during_activity", precision = 18, scale = 4)
    private BigDecimal qtyCompletedDuringActivity;

    @Column(length = 500)
    private String remarks;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
