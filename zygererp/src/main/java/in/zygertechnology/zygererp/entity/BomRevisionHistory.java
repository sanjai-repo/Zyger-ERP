package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bom_revision_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BomRevisionHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "bom_id", nullable = false) Long bomId;
    @Column(name = "revision_no", nullable = false) Integer revisionNo;
    @Column(name = "bom_version", length = 20) String bomVersion;
    @Column(name = "created_at", nullable = false) LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "created_by", length = 100) String createdBy;
    @Column(columnDefinition = "TEXT") String remarks;
    @Column(name = "previous_revision_id") Long previousRevisionId;
}
