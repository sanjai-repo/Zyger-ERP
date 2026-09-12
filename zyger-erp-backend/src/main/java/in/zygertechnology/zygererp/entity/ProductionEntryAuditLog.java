package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "production_entry_audit_log")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ProductionEntryAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entry_id", nullable = false)
    private Long entryId;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType; // CREATE, DRAFT_SAVE, FIELD_CHANGE, POST, CANCEL, REVERSE, EXPORT

    @Column(name = "field_name", length = 100)
    private String fieldName;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "timestamp", nullable = false)
    @Builder.Default
    private Instant timestamp = Instant.now();

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;
}
