package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.CostComponentType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CostComponentTypeRepository extends JpaRepository<CostComponentType, Long> {
    Optional<CostComponentType> findByCode(String code);
    List<CostComponentType> findByIsActiveTrueOrderBySortOrderAsc();
}
