package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.JobCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;

public interface JobCardRepository extends JpaRepository<JobCard, Long> {
    List<JobCard> findByStatus(String status);
    List<JobCard> findByWorkOrderNumber(String workOrderNumber);
    List<JobCard> findByJobCardNumber(String jobCardNumber);
    long countByStatus(String status);
    @Query("SELECT COALESCE(SUM(j.completedQuantity), 0) FROM JobCard j")
    BigDecimal sumCompletedQuantity();
}
