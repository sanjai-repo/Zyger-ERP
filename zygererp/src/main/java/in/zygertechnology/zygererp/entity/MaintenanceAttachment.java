package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "maintenance_attachment", indexes = {
    @Index(name = "idx_matt_source", columnList = "source_type, source_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaintenanceAttachment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "source_type", length = 30, nullable = false) String sourceType;
    @Column(name = "source_id", nullable = false) Long sourceId;
    @Column(name = "file_url", length = 500, nullable = false) String fileUrl;
    @Column(name = "file_type", length = 30) String fileType;  // PHOTO, VIDEO, CERTIFICATE, DOCUMENT
    @Column(name = "file_name", length = 255) String fileName;
    @Column(name = "uploaded_by", length = 60) String uploadedBy;
    @Column(name = "uploaded_at") Instant uploadedAt = Instant.now();
}
