package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ToolServiceRectification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ToolServiceRectificationRepository extends JpaRepository<ToolServiceRectification, Long> {
    List<ToolServiceRectification> findByServiceId(Long serviceId);
    List<ToolServiceRectification> findByServiceNumber(String serviceNumber);
}
