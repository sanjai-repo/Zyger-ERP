package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionRejectionDoc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductionRejectionDocRepository extends JpaRepository<ProductionRejectionDoc, Long> {
    Optional<ProductionRejectionDoc> findByDocNumber(String docNumber);
    List<ProductionRejectionDoc> findByEntryIdOrderByIdDesc(Long entryId);
    List<ProductionRejectionDoc> findByStatusOrderByIdDesc(String status);
}