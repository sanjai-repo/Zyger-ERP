package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.QualityDisposition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QualityDispositionRepository
        extends JpaRepository<QualityDisposition, Long> {
    List<QualityDisposition> findByInspectionId(Long inspectionId);
    List<QualityDisposition> findByNcrId(Long ncrId);
}
