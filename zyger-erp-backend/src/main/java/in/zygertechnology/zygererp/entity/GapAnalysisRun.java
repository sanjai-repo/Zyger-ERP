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

    /** FRS §9.1: CAPACITY (demand vs supply, legacy) or QMS (clause-level compliance) analysis mode */
    @Column(name = "run_mode", length = 20)
    String runMode = "CAPACITY";

    /** FRS §9.1: the compliance standard the QMS run is checked against (e.g. ISO 9001:2015) */
    @Column(name = "standard_ref", length = 100)
    String standardRef;

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
