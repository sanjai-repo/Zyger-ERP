package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MaterialPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MaterialPlanRepository extends JpaRepository<MaterialPlan, Long> {
    Optional<MaterialPlan> findByPlanNumber(String planNumber);
}
