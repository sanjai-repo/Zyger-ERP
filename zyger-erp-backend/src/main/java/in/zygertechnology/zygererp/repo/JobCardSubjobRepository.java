package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.JobCardSubjob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JobCardSubjobRepository extends JpaRepository<JobCardSubjob, Long> {
    List<JobCardSubjob> findByJobCardId(Long jobCardId);
    List<JobCardSubjob> findByJobCardJobCardNumber(String jobCardNumber);
}
