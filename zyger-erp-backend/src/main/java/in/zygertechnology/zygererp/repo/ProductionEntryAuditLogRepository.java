package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionEntryAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductionEntryAuditLogRepository extends JpaRepository<ProductionEntryAuditLog, Long> {
    List<ProductionEntryAuditLog> findByEntryIdOrderByTimestampAsc(Long entryId);
}
