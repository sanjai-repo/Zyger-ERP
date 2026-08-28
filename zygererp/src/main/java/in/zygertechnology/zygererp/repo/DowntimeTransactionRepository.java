package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.DowntimeTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;
public interface DowntimeTransactionRepository extends JpaRepository<DowntimeTransaction, Long> {
    List<DowntimeTransaction> findByMachineId(Long machineId);
    List<DowntimeTransaction> findBySourceTypeAndSourceId(String sourceType, Long sourceId);
    @Query("SELECT COALESCE(SUM(d.durationMinutes),0) FROM DowntimeTransaction d WHERE d.machineId = :machineId AND d.sourceType = 'BREAKDOWN'")
    BigDecimal totalBreakdownMinutesByMachine(Long machineId);
}
