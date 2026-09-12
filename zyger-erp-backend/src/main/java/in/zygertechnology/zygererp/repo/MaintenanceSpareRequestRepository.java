package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MaintenanceSpareRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaintenanceSpareRequestRepository extends JpaRepository<MaintenanceSpareRequest, Long> {
    List<MaintenanceSpareRequest> findByStatus(String status);
    List<MaintenanceSpareRequest> findBySourceTypeAndSourceId(String sourceType, Long sourceId);
}
