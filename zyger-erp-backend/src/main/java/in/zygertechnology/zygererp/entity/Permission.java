package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "permissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"module", "screen", "action"})
})
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Permission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(nullable = false, length = 40) String module;

    @Column(nullable = false, length = 60) String screen;

    @Column(nullable = false, length = 30) String action;

    @Column(length = 200) String description;

    public String code() {
        return module + ":" + screen + ":" + action;
    }
}
