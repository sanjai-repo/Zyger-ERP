package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.QualityCharacteristicMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface QualityCharacteristicMeasurementRepository extends JpaRepository<QualityCharacteristicMeasurement, Long> {

    List<QualityCharacteristicMeasurement> findByItemCodeAndCharacteristicCode(String itemCode, String characteristicCode);

    List<QualityCharacteristicMeasurement> findByItemCode(String itemCode);

    List<QualityCharacteristicMeasurement> findByInspectionId(Long inspectionId);
}