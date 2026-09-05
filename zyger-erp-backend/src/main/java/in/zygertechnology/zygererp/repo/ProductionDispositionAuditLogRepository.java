package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionDispositionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductionDispositionAuditLogRepository extends JpaRepository<ProductionDispositionAuditLog, Long> {
}