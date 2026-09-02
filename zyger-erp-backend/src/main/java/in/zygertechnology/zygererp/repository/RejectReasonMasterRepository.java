package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.RejectReasonMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RejectReasonMasterRepository extends JpaRepository<RejectReasonMaster, Long> {
    List<RejectReasonMaster> findByActiveTrue();
}
