package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "user_screen_permissions",
        uniqueConstraints = { @UniqueConstraint(columnNames = {"user_id", "screen_id"}) })
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UserScreenPermission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "user_id", nullable = false)
    Long userId;

    @Column(name = "screen_id", nullable = false)
    Long screenId;

    @Builder.Default
    @Column(name = "can_view", nullable = false)
    boolean canView = false;

    @Builder.Default
    @Column(name = "can_create", nullable = false)
    boolean canCreate = false;

    @Builder.Default
    @Column(name = "can_edit", nullable = false)
    boolean canEdit = false;

    @Builder.Default
    @Column(name = "can_delete", nullable = false)
    boolean canDelete = false;

    @Builder.Default
    @Column(name = "can_export", nullable = false)
    boolean canExport = false;

    @Column(name = "granted_by")
    Long grantedBy;

    @Column(name = "granted_at")
    Instant grantedAt;
}
