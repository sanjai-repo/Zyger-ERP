package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.QualityInspectionStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QualityInspectionStatusHistoryRepository
        extends JpaRepository<QualityInspectionStatusHistory, Long> {

    List<QualityInspectionStatusHistory> findByInspectionIdOrderByChangedAtAsc(Long inspectionId);

    List<QualityInspectionStatusHistory> findByInspectionNumberOrderByChangedAtAsc(String inspectionNumber);
}
