package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.RouteOperationTool;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RouteOperationToolRepository extends JpaRepository<RouteOperationTool, Long> {
    List<RouteOperationTool> findByRouteOperationId(Long routeOperationId);
}
