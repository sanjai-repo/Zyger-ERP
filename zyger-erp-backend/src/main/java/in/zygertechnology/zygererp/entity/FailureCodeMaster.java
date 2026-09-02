package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "failure_code_master")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FailureCodeMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60, unique = true, nullable = false) String code;
    @Column(length = 500, nullable = false) String description;
    @Column(name = "breakdown_category_id") Long breakdownCategoryId;
    @Builder.Default Boolean active = true;
    String createdBy; Instant createdAt; String updatedBy; Instant updatedAt;
}
