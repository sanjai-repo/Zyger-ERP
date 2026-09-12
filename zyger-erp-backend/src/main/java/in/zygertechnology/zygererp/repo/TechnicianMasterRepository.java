package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.TechnicianMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface TechnicianMasterRepository extends JpaRepository<TechnicianMaster, Long> {
    Optional<TechnicianMaster> findByCode(String code);
    boolean existsByCode(String code);
}
