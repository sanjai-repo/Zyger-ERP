package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "maintenance_spare_request")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class MaintenanceSpareRequest {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_number", unique = true, length = 60)
    private String requestNumber;

    @Column(name = "source_type", length = 30)
    private String sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "reference_number", length = 60)
    private String referenceNumber;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "requested_by", length = 60)
    private String requestedBy;

    @Column(name = "requested_date")
    private LocalDate requestedDate;

    @Column(length = 30)
    @Builder.Default private String status = "PENDING";

    @Column(name = "approved_by", length = 60)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejected_reason", length = 500)
    private String rejectedReason;

    @Column(length = 500)
    private String remarks;

    @Version private Long version;
    @Column(name = "created_by", length = 60) private String createdBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_by", length = 60) private String updatedBy;
    @Column(name = "updated_at") private Instant updatedAt;
    @Column(nullable = false) @Builder.Default private Boolean deleted = false;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "deleted_by", length = 60) private String deletedBy;
}
