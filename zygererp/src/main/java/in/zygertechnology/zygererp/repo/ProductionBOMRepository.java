package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductionBOMRepository extends BaseDocRepository<ProductionBOM> {
    List<ProductionBOM> findByItemCode(String itemCode);
    List<ProductionBOM> findByItemCodeAndIsActiveTrue(String itemCode);
    List<ProductionBOM> findByItemCodeAndSalesOrderIdAndIsActiveTrue(String itemCode, Long salesOrderId);
    ProductionBOM findByBomNumber(String bomNumber);
}
