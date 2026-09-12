package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ProductionEntryRepository extends JpaRepository<ProductionEntry, Long> {
    List<ProductionEntry> findByWorkOrderNumber(String workOrderNumber);
    List<ProductionEntry> findByJobCardNumber(String jobCardNumber);
    List<ProductionEntry> findByRouteSheetNumber(String routeSheetNumber);
    List<ProductionEntry> findByStatus(String status);
    long countByStatus(String status);

    List<ProductionEntry> findByJobCardNumberAndOperationCode(String jobCardNumber, String operationCode);
    List<ProductionEntry> findByJobCardNumberAndOperationCodeAndStatus(String jobCardNumber, String operationCode, String status);

    @Query("SELECT pe FROM ProductionEntry pe WHERE pe.jobCardNumber = :jobCard AND pe.status IN ('POSTED', 'COMPLETED', 'APPROVED', 'SUBMITTED')")
    List<ProductionEntry> findCommittedEntriesForJobCard(@Param("jobCard") String jobCardNumber);
}
