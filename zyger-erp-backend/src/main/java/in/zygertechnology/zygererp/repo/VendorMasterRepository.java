package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.VendorMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface VendorMasterRepository extends JpaRepository<VendorMaster, Long> {
    Optional<VendorMaster> findByCode(String code);
    boolean existsByCode(String code);
}