package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.PmWorkOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PmWorkOrderRepository extends JpaRepository<PmWorkOrder, Long> {
    List<PmWorkOrder> findByStatus(String status);
    List<PmWorkOrder> findByAssignedTechnicianId(Long technicianId);
    List<PmWorkOrder> findByMachineCode(String machineCode);
    List<PmWorkOrder> findByScheduleId(Long scheduleId);
    List<PmWorkOrder> findByAssignedTechnicianIdAndStatusIn(Long technicianId, List<String> statuses);
    List<PmWorkOrder> findByStatusIn(List<String> statuses);
}
