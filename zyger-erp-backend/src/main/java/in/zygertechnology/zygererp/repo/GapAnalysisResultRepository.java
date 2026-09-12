package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.GapAnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GapAnalysisResultRepository extends JpaRepository<GapAnalysisResult, Long> {
    List<GapAnalysisResult> findByRunId(Long runId);
    List<GapAnalysisResult> findByGapType(String gapType);
    List<GapAnalysisResult> findByRunIdAndSeverityIn(Long runId, List<String> severities);
}
