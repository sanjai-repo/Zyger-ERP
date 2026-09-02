package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.WorkOrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkOrderStatusHistoryRepository extends JpaRepository<WorkOrderStatusHistory, Long> {
    List<WorkOrderStatusHistory> findByWorkOrderIdOrderByCreatedAtAsc(Long workOrderId);
}
