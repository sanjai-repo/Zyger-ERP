package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.QualityCalibrationInstrument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface QualityCalibrationInstrumentRepository extends JpaRepository<QualityCalibrationInstrument, Long> {
    Optional<QualityCalibrationInstrument> findByInstrumentCode(String instrumentCode);
}
