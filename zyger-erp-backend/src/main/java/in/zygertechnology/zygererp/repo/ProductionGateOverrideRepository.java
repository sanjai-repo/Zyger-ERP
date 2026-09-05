package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionGateOverride;
import in.zygertechnology.zygererp.entity.ProductionGateOverrideAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductionGateOverrideRepository extends JpaRepository<ProductionGateOverride, Long> {

    /** Active (not yet consumed) override targeting an inspection — idempotency/concurrency anchor. */
    Optional<ProductionGateOverride> findFirstByInspectionIdAndStatusInOrderByIdAsc(Long inspectionId, List<String> statuses);

    List<ProductionGateOverride> findByJobCardNumberOrderByIdDesc(String jobCardNumber);

    List<ProductionGateOverride> findAllByOrderByIdDesc();

    List<ProductionGateOverride> findTop50ByStatusOrderByIdDesc(String status);
}