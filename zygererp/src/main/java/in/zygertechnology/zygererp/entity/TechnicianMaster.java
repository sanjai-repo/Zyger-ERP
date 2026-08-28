package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "technician_master")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TechnicianMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60, unique = true, nullable = false) String code;
    @Column(length = 200, nullable = false) String name;
    @Column(length = 100) String skillCategory;
    @Column(name = "department_id") Long departmentId;
    @Column(name = "user_id", length = 60) String userId;
    @Builder.Default Boolean active = true;
    String createdBy; Instant createdAt; String updatedBy; Instant updatedAt;
}
