package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ToolServiceIntimation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ToolServiceIntimationRepository extends JpaRepository<ToolServiceIntimation, Long> {
    List<ToolServiceIntimation> findByToolId(String toolId);
    List<ToolServiceIntimation> findByStatus(String status);
}
