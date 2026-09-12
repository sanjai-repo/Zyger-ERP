package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionScrapDoc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductionScrapDocRepository extends JpaRepository<ProductionScrapDoc, Long> {
    Optional<ProductionScrapDoc> findByDocNumber(String docNumber);
    List<ProductionScrapDoc> findByEntryIdOrderByIdDesc(Long entryId);
    List<ProductionScrapDoc> findByStatusOrderByIdDesc(String status);
}