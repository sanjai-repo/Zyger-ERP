package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MasterAuditLogRepository extends JpaRepository<MasterAuditLog, Long> {
    List<MasterAuditLog> findByEntityTypeAndEntityIdOrderByChangedAtDesc(String entityType, Long entityId);
    List<MasterAuditLog> findTop200ByOrderByChangedAtDesc();
}
