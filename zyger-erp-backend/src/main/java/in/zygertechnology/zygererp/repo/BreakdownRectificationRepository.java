package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.BreakdownRectification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BreakdownRectificationRepository extends JpaRepository<BreakdownRectification, Long> {
    List<BreakdownRectification> findByBreakdownId(Long breakdownId);
    List<BreakdownRectification> findByBreakdownNumber(String breakdownNumber);
}
