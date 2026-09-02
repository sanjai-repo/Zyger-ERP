package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.MeterMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface MeterMasterRepository extends JpaRepository<MeterMaster, Long> {
    Optional<MeterMaster> findByCode(String code);
    List<MeterMaster> findByMeterTypeAndActiveTrue(String meterType);
}
