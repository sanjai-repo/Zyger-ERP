package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.PMSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PMScheduleRepository extends JpaRepository<PMSchedule, Long> {
    List<PMSchedule> findByPlanId(Long planId);
    List<PMSchedule> findByMachineCode(String machineCode);
    List<PMSchedule> findByStatus(String status);
}
