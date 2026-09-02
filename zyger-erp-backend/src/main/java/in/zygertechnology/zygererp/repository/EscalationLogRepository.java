package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.EscalationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EscalationLogRepository extends JpaRepository<EscalationLog, Long> {
    List<EscalationLog> findByDocKeyAndDocId(String docKey, Long docId);
}
