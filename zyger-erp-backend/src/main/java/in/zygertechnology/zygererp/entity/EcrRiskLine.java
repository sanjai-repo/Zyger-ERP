package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** FRS §9.2: structured Risk Analysis grid, one or more rows per ECR (not a flat remarks field). */
@Entity
@Table(name = "ecr_risk_line")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EcrRiskLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "engineering_change_id", nullable = false)
    private EngineeringChange engineeringChange;

    @Column(name = "identified_risk", length = 500)
    private String identifiedRisk;

    /** LOW, MEDIUM, HIGH */
    @Column(name = "risk_level", length = 20)
    private String riskLevel;

    @Column(length = 500)
    private String remarks;

    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
