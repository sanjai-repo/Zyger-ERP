package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.CostEstimation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CostEstimationRepository extends JpaRepository<CostEstimation, Long> {
    Optional<CostEstimation> findByEstimationNumber(String estimationNumber);
    List<CostEstimation> findByItemCode(String itemCode);
}
