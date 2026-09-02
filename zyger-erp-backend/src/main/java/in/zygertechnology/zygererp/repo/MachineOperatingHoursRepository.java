package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MachineOperatingHours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MachineOperatingHoursRepository extends JpaRepository<MachineOperatingHours, Long> {
    Optional<MachineOperatingHours> findByMachineCodeAndWorkDate(String machineCode, LocalDate workDate);
    List<MachineOperatingHours> findByMachineCodeAndWorkDateBetween(String machineCode, LocalDate from, LocalDate to);

    @Query("SELECT COALESCE(SUM(m.operatingHours), 0) FROM MachineOperatingHours m WHERE m.machineCode = :machineCode AND m.workDate BETWEEN :from AND :to")
    BigDecimal sumOperatingHours(@Param("machineCode") String machineCode, @Param("from") LocalDate from, @Param("to") LocalDate to);
}