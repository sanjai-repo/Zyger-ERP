package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.DepartmentMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface DepartmentMasterRepository extends JpaRepository<DepartmentMaster, Long> {
    Optional<DepartmentMaster> findByCode(String code);
    boolean existsByCode(String code);
}
