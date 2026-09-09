package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.DcPrintLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DcPrintLogRepository extends JpaRepository<DcPrintLog, Long> {
    long countByDocNo(String docNo);
}
