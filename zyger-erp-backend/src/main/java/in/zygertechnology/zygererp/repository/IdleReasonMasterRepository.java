package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.IdleReasonMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IdleReasonMasterRepository extends JpaRepository<IdleReasonMaster, Long> {
    List<IdleReasonMaster> findByActiveTrue();
}
