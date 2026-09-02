package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.DispatchPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DispatchPlanRepository extends JpaRepository<DispatchPlan, Long> {
    Optional<DispatchPlan> findByDispatchNumber(String dispatchNumber);
    List<DispatchPlan> findByStatus(String status);
}
