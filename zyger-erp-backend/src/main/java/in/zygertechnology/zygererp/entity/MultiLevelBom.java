package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity @Table(name = "multi_level_bom")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MultiLevelBom {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "bom_mapping_id", nullable = false) Long bomMappingId;
    @Column(name = "auto_code", nullable = false, unique = true, length = 40) String autoCode;
    @Column(length = 200) String name;
    String createdBy;
    java.time.Instant createdAt;
    String updatedBy;
    java.time.Instant updatedAt;
    @Version Long version;
}