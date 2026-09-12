package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.OperationMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OperationMasterRepository extends JpaRepository<OperationMaster, Long> {
    Optional<OperationMaster> findByCode(String code);
    boolean existsByCode(String code);
}
