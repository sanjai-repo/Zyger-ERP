package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.WaterConsumption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WaterConsumptionRepository extends JpaRepository<WaterConsumption, Long> {
    List<WaterConsumption> findByMeterNumber(String meterNumber);
    List<WaterConsumption> findByDepartment(String department);
}
