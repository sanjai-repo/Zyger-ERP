package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.PendingReasonMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PendingReasonMasterRepository extends JpaRepository<PendingReasonMaster, Long> {
    List<PendingReasonMaster> findByActiveTrue();
}
