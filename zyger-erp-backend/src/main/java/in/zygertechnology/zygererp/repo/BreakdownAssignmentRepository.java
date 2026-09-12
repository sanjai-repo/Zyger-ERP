package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.BreakdownAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BreakdownAssignmentRepository extends JpaRepository<BreakdownAssignment, Long> {
    List<BreakdownAssignment> findByBreakdownId(Long breakdownId);

    /**
     * Count assignments for a technician on OTHER breakdowns that are still active
     * (not CLOSED/CANCELLED), excluding the given breakdown. Used for the BR-13
     * technician-overlap guard.
     */
    @Query("SELECT COUNT(a) FROM BreakdownAssignment a WHERE a.technicianId = :technicianId " +
           "AND a.status NOT IN ('CLOSED','CANCELLED') AND a.breakdownId <> :breakdownId")
    long countActiveByTechnicianId(@Param("technicianId") Long technicianId,
                                   @Param("breakdownId") Long breakdownId);
}
