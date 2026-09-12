package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.SamplingPlanMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SamplingPlanMasterRepository extends JpaRepository<SamplingPlanMaster, Long> {
    List<SamplingPlanMaster> findByStandardAndActiveTrue(String standard);
}
