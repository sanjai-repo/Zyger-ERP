package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.WorkCenter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WorkCenterRepository extends JpaRepository<WorkCenter, Long> {
    Optional<WorkCenter> findByCode(String code);
    boolean existsByCode(String code);
}
