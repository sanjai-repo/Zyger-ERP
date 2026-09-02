package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductionReturnRepository extends JpaRepository<ProductionReturn, Long> {
    List<ProductionReturn> findByWorkOrderNumber(String workOrderNumber);
    List<ProductionReturn> findByStatus(String status);
}
