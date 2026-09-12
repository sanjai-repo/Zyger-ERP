package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.PMCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PMCompletionRepository extends JpaRepository<PMCompletion, Long> {
    List<PMCompletion> findByScheduleId(Long scheduleId);
    List<PMCompletion> findByMachineCode(String machineCode);
}
