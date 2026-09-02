package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "breakdown_category_master")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BreakdownCategoryMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60, unique = true, nullable = false) String code;
    @Column(length = 200, nullable = false) String name;
    @Builder.Default Boolean active = true;
    String createdBy; Instant createdAt; String updatedBy; Instant updatedAt;
}
