package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MaterialPlanLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MaterialPlanLineRepository extends JpaRepository<MaterialPlanLine, Long> {
    List<MaterialPlanLine> findByPlanId(Long planId);
    List<MaterialPlanLine> findByItemCode(String itemCode);
}
