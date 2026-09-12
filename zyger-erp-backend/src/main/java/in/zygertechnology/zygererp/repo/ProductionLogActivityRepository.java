package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionLogActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductionLogActivityRepository extends JpaRepository<ProductionLogActivity, Long> {
    List<ProductionLogActivity> findByLogSheetId(Long logSheetId);
}
