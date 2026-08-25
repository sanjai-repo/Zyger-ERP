package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.RouteOperationInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RouteOperationInspectionRepository extends JpaRepository<RouteOperationInspection, Long> {
    List<RouteOperationInspection> findByRouteOperationIdOrderBySortOrderAsc(Long routeOperationId);
}
