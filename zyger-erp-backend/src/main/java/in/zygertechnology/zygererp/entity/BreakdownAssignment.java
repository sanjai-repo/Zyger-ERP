package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "breakdown_assignment", indexes = {
    @Index(name = "idx_ba_breakdown", columnList = "breakdown_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BreakdownAssignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "breakdown_id", nullable = false) Long breakdownId;
    @Column(name = "technician_id", nullable = false) Long technicianId;
    @Column(name = "assigned_by", length = 60) String assignedBy;
    @Builder.Default
    @Column(name = "assigned_at") Instant assignedAt = Instant.now();
    @Column(length = 30) @Builder.Default String status = "ASSIGNED";
    @Column(name = "secondary_assignee") @Builder.Default Boolean secondaryAssignee = false;
    @Version Long version;
}
