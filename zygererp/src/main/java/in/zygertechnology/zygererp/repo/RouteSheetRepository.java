package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RouteSheetRepository extends BaseDocRepository<RouteSheet> {
    List<RouteSheet> findByItemCode(String itemCode);
    List<RouteSheet> findByItemCodeAndStatus(String itemCode, String status);
    long countByItemCodeAndStatus(String itemCode, String status);
}
