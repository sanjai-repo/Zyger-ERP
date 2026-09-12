package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.CalibrationSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CalibrationScheduleRepository extends JpaRepository<CalibrationSchedule, Long> {
    List<CalibrationSchedule> findByInstrumentId(String instrumentId);
    List<CalibrationSchedule> findByCalibrationStatus(String calibrationStatus);
    List<CalibrationSchedule> findByStatus(String status);
}
