package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.CalibrationEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CalibrationEntryRepository extends JpaRepository<CalibrationEntry, Long> {
    List<CalibrationEntry> findByScheduleId(Long scheduleId);
    List<CalibrationEntry> findByInstrumentId(String instrumentId);
}
