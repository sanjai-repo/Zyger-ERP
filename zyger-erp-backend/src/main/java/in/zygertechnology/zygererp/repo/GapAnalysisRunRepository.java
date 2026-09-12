package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.GapAnalysisRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GapAnalysisRunRepository extends JpaRepository<GapAnalysisRun, Long> {
    Optional<GapAnalysisRun> findByRunNumber(String runNumber);
}
