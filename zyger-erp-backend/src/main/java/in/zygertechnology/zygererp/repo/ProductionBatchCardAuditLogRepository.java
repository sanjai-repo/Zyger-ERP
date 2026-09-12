package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionBatchCardAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductionBatchCardAuditLogRepository extends JpaRepository<ProductionBatchCardAuditLog, Long> {
}
