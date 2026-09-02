package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.LoginAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginAuditLogRepository extends JpaRepository<LoginAuditLog, Long> {
}
