package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String eventType;  // e.g. "PO_OVERDUE", "CALIBRATION_DUE", "WO_DELAYED", "LOW_STOCK"

    @Column(nullable = false, length = 30)
    private String module;  // e.g. "PURCHASE", "QUALITY", "PRODUCTION", "MAINTENANCE", "INVENTORY"

    @Column(length = 30)
    private String entityType;  // e.g. "PurchaseOrder", "CalibrationSchedule"

    @Column
    private Long entityId;

    @Column(nullable = false, length = 20)
    private String severity;  // "INFO", "WARNING", "CRITICAL"

    @Column(length = 60)
    private String recipientRole;  // e.g. "QUALITY_MANAGER", "STORES" — or null for broadcast

    @Column(nullable = false, length = 500)
    private String message;

    @Column(length = 200)
    private String entityRef;  // e.g. "PO-2026-0001" — human-readable reference

    @Column
    private Instant readAt;

    @Column(nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
