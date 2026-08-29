package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "machine_operating_hours", indexes = {
        @Index(name = "idx_moh_machine_date", columnList = "machine_code,work_date")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MachineOperatingHours {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "machine_code", length = 60, nullable = false) String machineCode;
    @Column(name = "work_date", nullable = false) LocalDate workDate;
    @Column(name = "operating_hours", precision = 10, scale = 2, nullable = false) BigDecimal operatingHours;
    /** PRODUCTION | SHIFT_ESTIMATE | MANUAL */
    @Column(length = 30) @Builder.Default String source = "PRODUCTION";
    @Column(name = "plant_id") Long plantId;
    @Column(name = "created_by", length = 60) String createdBy;
    @Column(name = "created_at") Instant createdAt;
}