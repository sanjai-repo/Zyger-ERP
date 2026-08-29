package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MaintenanceCostAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaintenanceCostAdjustmentRepository extends JpaRepository<MaintenanceCostAdjustment, Long> {
    List<MaintenanceCostAdjustment> findByCostTransactionId(Long costTransactionId);
    List<MaintenanceCostAdjustment> findByParentTypeAndParentId(String parentType, Long parentId);
}