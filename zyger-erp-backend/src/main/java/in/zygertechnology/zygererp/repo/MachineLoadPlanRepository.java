package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MachineLoadPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MachineLoadPlanRepository extends JpaRepository<MachineLoadPlan, Long> {
    Optional<MachineLoadPlan> findByPlanNumber(String planNumber);
}
