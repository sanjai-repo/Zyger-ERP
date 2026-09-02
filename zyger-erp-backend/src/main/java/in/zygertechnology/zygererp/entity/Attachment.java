package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "attachment")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Attachment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", nullable = false)
    PlantMaster plant;

    @Column(name = "owner_type", length = 60, nullable = false)
    String ownerType;

    @Column(name = "owner_id", nullable = false)
    Long ownerId;

    @Column(name = "file_name", length = 255, nullable = false)
    String fileName;

    @Column(name = "content_type", length = 100)
    String contentType;

    @Column(name = "size_bytes")
    Long sizeBytes;

    @Column(name = "storage_path", length = 500, nullable = false)
    String storagePath;

    @Column(name = "checksum_sha256", length = 64)
    String checksumSha256;

    @Column(length = 30)
    @Builder.Default String category = "OTHER";

    @Column(name = "uploaded_by", length = 60)
    String uploadedBy;

    @Builder.Default
    Instant uploadedAt = Instant.now();

    Instant deletedAt;

    @PrePersist void prePersist() {
        if (uploadedAt == null) uploadedAt = Instant.now();
    }
}
