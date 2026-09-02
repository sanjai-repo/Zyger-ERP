package in.zygertechnology.zygererp.entity;

import in.zygertechnology.zygererp.config.AuditEntityListener;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;
import java.time.Instant; import java.time.LocalDate;

@MappedSuperclass @Getter @Setter
@SQLRestriction("deleted = false")
@EntityListeners(AuditEntityListener.class)
public abstract class BaseDoc {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    /** Multi-plant scoping. 1 = default plant. */
    @Column(name = "plant_id")
    Long plantId = 1L;

    @Column(unique = true) String docNo;
    String status;
    LocalDate docDate;
    @Column(length = 500) String remarks;

    // ── Lifecycle fields ──
    String submittedBy;
    Instant submittedAt;

    /** FK to AppUser.id for approval — replaces free-text string. */
    @Column(name = "approved_by_user_id")
    Long approvedByUserId;
    Instant approvedAt;

    String closedBy;
    Instant closedAt;

    String cancelledBy;
    Instant cancelledAt;

    String reopenedBy;
    Instant reopenedAt;

    // ── Audit ──
    String createdBy;
    Instant createdAt;
    Instant updatedAt;
    String updatedBy;

    // ── Soft delete + optimistic lock ──
    @Column(nullable = false) Boolean deleted = false;
    Instant deletedAt;
    String deletedBy;
    @Version
    Long version;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (createdBy == null || createdBy.isBlank()) createdBy = "system";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
