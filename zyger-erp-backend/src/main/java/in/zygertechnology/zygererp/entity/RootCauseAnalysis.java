package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "root_cause_analysis")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class RootCauseAnalysis {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rca_number", unique = true, length = 60)
    private String rcaNumber;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "breakdown_id")
    private Long breakdownId;

    @Column(name = "breakdown_number", length = 60)
    private String breakdownNumber;

    @Column(name = "problem_description", columnDefinition = "TEXT")
    private String problemDescription;

    @Column(name = "immediate_cause", columnDefinition = "TEXT")
    private String immediateCause;

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(name = "contributing_cause", columnDefinition = "TEXT")
    private String contributingCause;

    @Column(name = "corrective_action", columnDefinition = "TEXT")
    private String correctiveAction;

    @Column(name = "preventive_action", columnDefinition = "TEXT")
    private String preventiveAction;

    @Column(name = "responsible_person", length = 60)
    private String responsiblePerson;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "verification_date")
    private LocalDate verificationDate;

    @Column(name = "verified_by", length = 60)
    private String verifiedBy;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @Column(name = "root_cause_code_id")
    private Long rootCauseCodeId;

    @Version private Long version;
    @Column(name = "created_by", length = 60) private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_by", length = 60) private String updatedBy;
    @Column(name = "updated_at") private Instant updatedAt;
    @Builder.Default
    @Column(nullable = false) private Boolean deleted = false;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by", length = 60) private String deletedBy;
}
