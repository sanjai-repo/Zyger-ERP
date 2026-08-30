package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity @Table(name = "fg_mapping_line")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class FgMappingLine {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "fg_mapping_id", nullable = false) Long fgMappingId;
    @Column(name = "semi_fg_mapping_id", nullable = false) Long semiFgMappingId;
    String createdBy;
    java.time.Instant createdAt;
    String updatedBy;
    java.time.Instant updatedAt;
    @Version Long version;
}