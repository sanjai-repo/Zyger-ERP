package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "downtime_transaction", indexes = {
    @Index(name = "idx_dt_machine", columnList = "machine_id"),
    @Index(name = "idx_dt_source", columnList = "source_type, source_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DowntimeTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "machine_id", nullable = false) Long machineId;
    @Column(name = "machine_code", length = 60) String machineCode;
    @Column(name = "source_type", length = 30) String sourceType;  // BREAKDOWN, PM, TOOLING, etc.
    @Column(name = "source_id") Long sourceId;
    @Column(name = "start_time") Instant startTime;
    @Column(name = "end_time") Instant endTime;
    @Column(name = "duration_minutes") BigDecimal durationMinutes;
    @Column(name = "created_at") Instant createdAt = Instant.now();
    @Version Long version;
}
