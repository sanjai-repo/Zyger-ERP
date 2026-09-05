package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionReworkDoc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductionReworkDocRepository extends JpaRepository<ProductionReworkDoc, Long> {
    Optional<ProductionReworkDoc> findByDocNumber(String docNumber);
    List<ProductionReworkDoc> findByEntryIdOrderByIdDesc(Long entryId);
    List<ProductionReworkDoc> findByStatusOrderByIdDesc(String status);
}