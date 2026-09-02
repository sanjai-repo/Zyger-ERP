package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.BreakdownCategoryMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface BreakdownCategoryMasterRepository extends JpaRepository<BreakdownCategoryMaster, Long> {
    Optional<BreakdownCategoryMaster> findByCode(String code);
    boolean existsByCode(String code);
}
