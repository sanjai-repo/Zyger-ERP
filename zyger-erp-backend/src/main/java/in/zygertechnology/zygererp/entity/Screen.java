package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "screens")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Screen {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "screen_key", unique = true, nullable = false, length = 60)
    String screenKey;

    @Column(name = "screen_name", nullable = false, length = 120)
    String screenName;

    @Column(name = "parent_screen_id")
    Long parentScreenId;

    @Column(name = "sort_order")
    Integer sortOrder;

    @Column(length = 80)
    String module;

    @Builder.Default
    @Column(nullable = false)
    boolean active = true;

    String createdBy;
    Instant createdAt;
}
