package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Spec §9: file attachments linked to an inspection
 * (Drawing, MTC, CMM, Photo, Other).
 */
@Entity
@Table(name = "quality_inspection_attachment", indexes = {
        @Index(name = "idx_qia_inspection", columnList = "inspection_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QualityInspectionAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "inspection_id", nullable = false)
    Long inspectionId;

    @Column(name = "file_name", nullable = false, length = 255)
    String fileName;

    @Column(name = "file_path", nullable = false, length = 500)
    String filePath;

    @Column(name = "attachment_type", length = 30)
    String attachmentType;   // Drawing, MTC, CMM, Photo, Other

    @Column(name = "uploaded_by", length = 60)
    String uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    @Builder.Default Instant uploadedAt = Instant.now();
}
