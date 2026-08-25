package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "cost_component_type")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CostComponentType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, unique = true, length = 30)
    String code;

    @Column(nullable = false, length = 100)
    String name;

    @Column(length = 500)
    String description;

    @Column(name = "sort_order")
    @Builder.Default Integer sortOrder = 0;

    @Column(name = "is_active")
    @Builder.Default Boolean isActive = true;

    String createdBy;
    Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
