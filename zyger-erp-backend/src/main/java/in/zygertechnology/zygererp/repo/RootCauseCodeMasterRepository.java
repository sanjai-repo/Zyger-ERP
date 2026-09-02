package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.RootCauseCodeMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface RootCauseCodeMasterRepository extends JpaRepository<RootCauseCodeMaster, Long> {
    Optional<RootCauseCodeMaster> findByCode(String code);
    boolean existsByCode(String code);
}
