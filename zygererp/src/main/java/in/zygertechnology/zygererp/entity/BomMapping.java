package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity @Table(name = "bom_mapping")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class BomMapping {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "auto_code", nullable = false, unique = true, length = 40) String autoCode;
    @Column(length = 200) String name;
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    java.time.Instant createdAt;
    String updatedBy;
    java.time.Instant updatedAt;
    @Version Long version;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}