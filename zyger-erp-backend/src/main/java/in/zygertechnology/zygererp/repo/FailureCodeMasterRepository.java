package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.FailureCodeMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface FailureCodeMasterRepository extends JpaRepository<FailureCodeMaster, Long> {
    Optional<FailureCodeMaster> findByCode(String code);
    boolean existsByCode(String code);
}
