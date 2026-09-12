package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.PoAmendmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PoAmendmentHistoryRepository extends JpaRepository<PoAmendmentHistory, Long> {
    List<PoAmendmentHistory> findByPoIdOrderByRevisionNumberDesc(Long poId);
}
