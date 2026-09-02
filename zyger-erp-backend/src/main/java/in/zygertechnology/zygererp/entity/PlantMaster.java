package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "plant_master")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class PlantMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(length = 20, unique = true, nullable = false)
    String code;

    @Column(length = 200, nullable = false)
    String name;

    @Column(columnDefinition = "TEXT")
    String address;

    @Column(length = 60)
    @Builder.Default String timezone = "Asia/Kolkata";

    @Builder.Default Boolean active = Boolean.TRUE;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;

    @PrePersist void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (createdBy == null || createdBy.isBlank()) createdBy = "system";
    }
}
