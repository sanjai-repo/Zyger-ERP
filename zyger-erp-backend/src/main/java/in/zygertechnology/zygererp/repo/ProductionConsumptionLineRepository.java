package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionConsumptionLine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductionConsumptionLineRepository extends JpaRepository<ProductionConsumptionLine, Long> {
    List<ProductionConsumptionLine> findByConsumptionId(Long consumptionId);
}