package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "actor_user_id")
    Long actorUserId;

    @Column(nullable = false, length = 60)
    String action;

    @Column(name = "target_user_id")
    Long targetUserId;

    @Column(columnDefinition = "TEXT")
    String metadata;

    @Column(name = "ip_address", length = 60)
    String ipAddress;

    @Column(name = "created_at", nullable = false)
    Instant createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
