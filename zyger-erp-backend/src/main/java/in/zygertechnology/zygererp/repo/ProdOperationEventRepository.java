package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProdOperationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProdOperationEventRepository extends JpaRepository<ProdOperationEvent, Long> {
    List<ProdOperationEvent> findBySessionId(Long sessionId);
    Optional<ProdOperationEvent> findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(
            Long sessionId, String subjobNumber, String operationCode, Integer seq);
}