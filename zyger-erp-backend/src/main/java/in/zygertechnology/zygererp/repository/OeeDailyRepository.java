package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.OeeDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OeeDailyRepository extends JpaRepository<OeeDaily, Long> {
    Optional<OeeDaily> findByPlantIdAndMachineIdAndOeeDate(Long plantId, Long machineId, LocalDate date);
    List<OeeDaily> findByOeeDateBetweenAndPlantId(LocalDate from, LocalDate to, Long plantId);
}
