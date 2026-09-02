package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByOwnerTypeAndOwnerIdAndDeletedAtIsNullOrderByUploadedAtDesc(String ownerType, Long ownerId);
}
