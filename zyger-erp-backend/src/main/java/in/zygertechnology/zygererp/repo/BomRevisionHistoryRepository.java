package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.BomRevisionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BomRevisionHistoryRepository extends JpaRepository<BomRevisionHistory, Long> {
    List<BomRevisionHistory> findByBomIdOrderByRevisionNoDesc(Long bomId);
}
