package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.PMPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PMPlanRepository extends JpaRepository<PMPlan, Long> {
    List<PMPlan> findByMachineCode(String machineCode);
    List<PMPlan> findByStatus(String status);
}
