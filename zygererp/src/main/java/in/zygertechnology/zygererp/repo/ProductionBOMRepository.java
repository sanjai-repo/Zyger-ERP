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

    /** FRS v4.0 X-06: count Approved Primary BOMs per item, excluding a given ID */
    long countByItemCodeAndStatusAndBomTypeAndIdNot(String itemCode, String status, String bomType, Long id);

    /** FRS v4.0 X-06: count Approved BOMs per (item, salesOrder), excluding a given ID */
    long countByItemCodeAndSalesOrderIdAndStatusAndIdNot(String itemCode, Long salesOrderId, String status, Long id);
}
