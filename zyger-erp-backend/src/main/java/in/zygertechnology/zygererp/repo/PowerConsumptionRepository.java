package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.PowerConsumption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PowerConsumptionRepository extends JpaRepository<PowerConsumption, Long> {
    List<PowerConsumption> findByMachineCode(String machineCode);
    List<PowerConsumption> findByDepartment(String department);
}
