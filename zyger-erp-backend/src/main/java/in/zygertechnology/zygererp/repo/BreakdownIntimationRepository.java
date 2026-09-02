package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.BreakdownIntimation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BreakdownIntimationRepository extends JpaRepository<BreakdownIntimation, Long> {
    List<BreakdownIntimation> findByMachineCode(String machineCode);
    List<BreakdownIntimation> findByStatus(String status);

    /**
     * BR-12: find any still-open breakdown intimation for a machine
     * (OPEN/ASSIGNED/DIAGNOSED/IN_DIAGNOSIS/IN_PROGRESS). Mirrors the partial unique
     * index uq_machine_active_breakdown.
     */
    @Query("SELECT b FROM BreakdownIntimation b WHERE b.machineCode = :machineCode " +
           "AND b.status IN ('OPEN','ASSIGNED','DIAGNOSED','IN_DIAGNOSIS','IN_PROGRESS') " +
           "ORDER BY b.createdAt ASC")
    List<BreakdownIntimation> findActiveByMachineCode(@Param("machineCode") String machineCode);
}
