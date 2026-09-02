package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByTargetUserIdOrderByCreatedAtDesc(Long targetUserId);
    List<AuditLog> findByActionContainingIgnoreCaseOrderByCreatedAtDesc(String action);
    List<AuditLog> findTop200ByOrderByCreatedAtDesc();
}
