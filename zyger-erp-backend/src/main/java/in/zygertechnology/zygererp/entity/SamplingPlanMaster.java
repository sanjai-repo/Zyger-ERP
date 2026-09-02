package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "sampling_plan_master")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class SamplingPlanMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false)
    String standard; // ISO2859_1, ANSI_Z1_4, CUSTOM

    @Column(name = "inspection_level", nullable = false)
    @Builder.Default String inspectionLevel = "GENERAL";

    @Column(name = "lot_size_min", nullable = false)
    Integer lotSizeMin;

    @Column(name = "lot_size_max", nullable = false)
    Integer lotSizeMax;

    @Column(nullable = false)
    @Builder.Default BigDecimal aql = new BigDecimal("1.0");

    @Column(name = "sample_size", nullable = false)
    Integer sampleSize;

    @Column(name = "accept_number", nullable = false)
    Integer acceptNumber;

    @Column(name = "reject_number", nullable = false)
    Integer rejectNumber;

    @Builder.Default Boolean active = Boolean.TRUE;

    @Builder.Default Instant createdAt = Instant.now();
}
