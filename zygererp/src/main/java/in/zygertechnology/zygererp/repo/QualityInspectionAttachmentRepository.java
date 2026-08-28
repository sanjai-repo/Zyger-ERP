package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.QualityInspectionAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QualityInspectionAttachmentRepository
        extends JpaRepository<QualityInspectionAttachment, Long> {
    List<QualityInspectionAttachment> findByInspectionId(Long inspectionId);
}
