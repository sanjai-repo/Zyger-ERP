package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.MaintenanceAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MaintenanceAttachmentRepository extends JpaRepository<MaintenanceAttachment, Long> {
    List<MaintenanceAttachment> findBySourceTypeAndSourceId(String sourceType, Long sourceId);
}
