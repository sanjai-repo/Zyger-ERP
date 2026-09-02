package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "login_audit_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoginAuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String username;

    @Column(nullable = false, length = 20)
    private String outcome;

    @Column(length = 200)
    private String ipAddress;

    @Column(nullable = false)
    private Instant occurredAt;

    @PrePersist
    void onCreate() { if (occurredAt == null) occurredAt = Instant.now(); }
}
