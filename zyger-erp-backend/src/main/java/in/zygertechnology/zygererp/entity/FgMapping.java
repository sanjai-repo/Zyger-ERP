package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity @Table(name = "fg_mapping")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class FgMapping {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "bom_mapping_id", nullable = false) Long bomMappingId;
    @Column(name = "auto_code", nullable = false, unique = true, length = 40) String autoCode;
    @Column(length = 200) String name;
    @Column(name = "fg_item_code", nullable = false, length = 60) String fgItemCode;
    @Column(name = "fg_item_name", length = 300) String fgItemName;
    String createdBy;
    java.time.Instant createdAt;
    String updatedBy;
    java.time.Instant updatedAt;
    @Version Long version;
}