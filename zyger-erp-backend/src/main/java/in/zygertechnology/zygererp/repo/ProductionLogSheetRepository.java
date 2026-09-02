package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionLogSheet;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductionLogSheetRepository extends JpaRepository<ProductionLogSheet, Long> {
    List<ProductionLogSheet> findByWorkOrderNumber(String workOrderNumber);
    List<ProductionLogSheet> findByJobCardNumber(String jobCardNumber);
}
