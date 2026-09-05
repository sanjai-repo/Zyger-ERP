package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionGateOverrideAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductionGateOverrideAuditRepository extends JpaRepository<ProductionGateOverrideAudit, Long> {

    List<ProductionGateOverrideAudit> findByOverrideIdOrderByTimestampAsc(Long overrideId);
}