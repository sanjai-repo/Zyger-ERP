package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProdBackfillEntryOutcome;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProdBackfillEntryOutcomeRepository extends JpaRepository<ProdBackfillEntryOutcome, Long> {
    Optional<ProdBackfillEntryOutcome> findByJobIdAndEntryNumber(String jobId, String entryNumber);
    List<ProdBackfillEntryOutcome> findByJobId(String jobId);
    long countByJobIdAndOutcome(String jobId, String outcome);
}