package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity @Table(name="location_master") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class LocationMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60) String code;
    @Column(length = 200) String name;
    @Column(length = 200) String description;
    @Column(name = "location_type", length = 60) String locationType;
    @Column(length = 60) String type;
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @Version Long version;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}
