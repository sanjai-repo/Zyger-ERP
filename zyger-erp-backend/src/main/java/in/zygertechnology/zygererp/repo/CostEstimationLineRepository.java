package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.CostEstimationLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CostEstimationLineRepository extends JpaRepository<CostEstimationLine, Long> {
    List<CostEstimationLine> findByEstimationId(Long estimationId);
}
