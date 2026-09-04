package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProdExecutionSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProdExecutionSessionRepository extends JpaRepository<ProdExecutionSession, Long> {
    Optional<ProdExecutionSession> findByEntryNumber(String entryNumber);
    boolean existsByEntryNumber(String entryNumber);
    List<ProdExecutionSession> findBySessionStatus(String sessionStatus);
    List<ProdExecutionSession> findByJobCardNumber(String jobCardNumber);
    List<ProdExecutionSession> findByWorkOrderNumber(String workOrderNumber);
}