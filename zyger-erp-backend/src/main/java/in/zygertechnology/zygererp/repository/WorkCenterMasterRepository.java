package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.WorkCenterMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface WorkCenterMasterRepository extends JpaRepository<WorkCenterMaster, Long> {
    Optional<WorkCenterMaster> findByCode(String code);
    List<WorkCenterMaster> findByPlantIdAndActiveTrue(Long plantId);
}
