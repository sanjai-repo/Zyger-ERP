package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProdBackfillProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProdBackfillProgressRepository extends JpaRepository<ProdBackfillProgress, Long> {
    Optional<ProdBackfillProgress> findByJobId(String jobId);
}