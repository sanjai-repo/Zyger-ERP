package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MaintenanceSpareRequestLine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaintenanceSpareRequestLineRepository extends JpaRepository<MaintenanceSpareRequestLine, Long> {
    List<MaintenanceSpareRequestLine> findByRequestId(Long requestId);
    List<MaintenanceSpareRequestLine> findByItemCode(String itemCode);
}
