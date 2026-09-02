package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.RootCauseAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RootCauseAnalysisRepository extends JpaRepository<RootCauseAnalysis, Long> {
    List<RootCauseAnalysis> findByMachineCode(String machineCode);
    List<RootCauseAnalysis> findByBreakdownId(Long breakdownId);
    List<RootCauseAnalysis> findByStatus(String status);
}
