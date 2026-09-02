package in.zygertechnology.zygererp.entity;

import in.zygertechnology.zygererp.config.AuditEntityListener;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class Role {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(unique = true, nullable = false, length = 60) String name;

    @Column(length = 200) String description;

    @Builder.Default boolean active = true;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default Set<Permission> permissions = new HashSet<>();

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
}
