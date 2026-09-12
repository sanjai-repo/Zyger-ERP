package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionBatchCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductionBatchCardRepository extends JpaRepository<ProductionBatchCard, Long> {
    Optional<ProductionBatchCard> findByDocNumber(String docNumber);
    List<ProductionBatchCard> findByEntryIdOrderByIdDesc(Long entryId);

    // P10 manual-allocation exhaustion + duplicate-creation guard
    List<ProductionBatchCard> findByEntryIdAndItemCodeAndIsReversalFalseOrderByIdAsc(Long entryId, String itemCode);
    Optional<ProductionBatchCard> findByEntryIdAndPhysicalBatchNumberAndIsReversalFalse(Long entryId, String physicalBatchNumber);
    List<ProductionBatchCard> findByReversedFromDocId(Long docId);
}
