package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.InspectionPlanCharacteristic;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InspectionPlanCharacteristicRepository extends JpaRepository<InspectionPlanCharacteristic, Long> {
    List<InspectionPlanCharacteristic> findByPlanIdAndActiveTrueOrderByLineNoAsc(Long planId);
}
