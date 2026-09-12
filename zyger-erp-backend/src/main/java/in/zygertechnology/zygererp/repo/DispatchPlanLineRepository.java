package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.DispatchPlanLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DispatchPlanLineRepository extends JpaRepository<DispatchPlanLine, Long> {
    List<DispatchPlanLine> findByDispatchPlanId(Long dispatchPlanId);
}
