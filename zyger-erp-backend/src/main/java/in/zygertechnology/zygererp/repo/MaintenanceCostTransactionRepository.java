package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MaintenanceCostTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaintenanceCostTransactionRepository extends JpaRepository<MaintenanceCostTransaction, Long> {
    List<MaintenanceCostTransaction> findByParentTypeAndParentId(String parentType, Long parentId);
    List<MaintenanceCostTransaction> findByMachineCode(String machineCode);
    List<MaintenanceCostTransaction> findByCostCategory(String costCategory);
    List<MaintenanceCostTransaction> findByIdAndImmutableFalse(Long id);
}
