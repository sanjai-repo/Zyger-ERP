package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.MaintenanceActivityMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface MaintenanceActivityMasterRepository extends JpaRepository<MaintenanceActivityMaster, Long> {
    Optional<MaintenanceActivityMaster> findByCode(String code);
    boolean existsByCode(String code);
}
