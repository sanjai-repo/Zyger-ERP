package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "root_cause_code_master")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RootCauseCodeMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60, unique = true, nullable = false) String code;
    @Column(length = 500, nullable = false) String description;
    @Builder.Default Boolean active = true;
    String createdBy; Instant createdAt; String updatedBy; Instant updatedAt;
}
