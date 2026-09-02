package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "gap_analysis_run")
@Getter
@Setter
@EntityListeners(AuditEntityListener.class)
public class GapAnalysisRun {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(unique = true, nullable = false, length = 60)
    String runNumber;

    @Column(name = "analysis_date")
    Instant analysisDate;

    @Column(name = "planning_horizon_start")
    Instant planningHorizonStart;

    @Column(name = "planning_horizon_end")
    Instant planningHorizonEnd;

    @Column(nullable = false, length = 30)
    String scope;

    @Column(name = "scope_value", length = 200)
    String scopeValue;

    @Column(name = "generated_by", length = 100)
    String generatedBy;

    @Column(nullable = false, length = 20)
    String status;

    @Column(length = 500)
    String remarks;

    @Version
    Long version;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}
