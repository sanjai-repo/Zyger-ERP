package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.BreakdownAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface BreakdownAssignmentRepository extends JpaRepository<BreakdownAssignment, Long> {
    List<BreakdownAssignment> findByBreakdownId(Long breakdownId);
}
