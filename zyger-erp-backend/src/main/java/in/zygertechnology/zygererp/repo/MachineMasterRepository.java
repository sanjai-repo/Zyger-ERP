package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MachineMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MachineMasterRepository extends JpaRepository<MachineMaster, Long> {
    Optional<MachineMaster> findByCode(String code);
    boolean existsByCode(String code);
}
