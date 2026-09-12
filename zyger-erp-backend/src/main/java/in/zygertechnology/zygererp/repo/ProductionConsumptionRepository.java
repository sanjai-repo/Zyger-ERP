package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionConsumption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductionConsumptionRepository extends JpaRepository<ProductionConsumption, Long> {
    Optional<ProductionConsumption> findByConsumptionNo(String consumptionNo);
    List<ProductionConsumption> findByStatus(String status);
    List<ProductionConsumption> findByJobCardId(Long jobCardId);
    boolean existsByConsumptionNo(String consumptionNo);
}