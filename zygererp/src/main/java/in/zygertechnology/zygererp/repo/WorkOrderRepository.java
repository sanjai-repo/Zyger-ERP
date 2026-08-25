package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkOrderRepository extends BaseDocRepository<WorkOrder> {
    List<WorkOrder> findByItemCode(String itemCode);
    List<WorkOrder> findByBomId(Long bomId);
    List<WorkOrder> findByStatus(String status);
    List<WorkOrder> findByWoNumber(String woNumber);
}
