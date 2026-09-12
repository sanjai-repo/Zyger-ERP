package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "master_audit_log")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MasterAuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "entity_type", nullable = false, length = 60) String entityType;
    @Column(name = "entity_id", nullable = false) Long entityId;
    @Column(nullable = false, length = 30) String action;
    @Column(name = "field_name", length = 100) String fieldName;
    @Column(name = "old_value", columnDefinition = "TEXT") String oldValue;
    @Column(name = "new_value", columnDefinition = "TEXT") String newValue;
    @Column(name = "changed_by", length = 60) String changedBy;
    @Column(name = "changed_at", nullable = false) Instant changedAt;
}
