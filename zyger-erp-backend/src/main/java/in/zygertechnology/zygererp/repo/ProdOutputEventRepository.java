package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProdOutputEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProdOutputEventRepository extends JpaRepository<ProdOutputEvent, Long> {
    List<ProdOutputEvent> findBySessionId(Long sessionId);
    List<ProdOutputEvent> findByOperationEventId(Long operationEventId);
    Optional<ProdOutputEvent> findBySessionIdAndOperationEventIdAndOutputTypeAndItemCodeAndLocation(
            Long sessionId, Long operationEventId, String outputType, String itemCode, String location);
}