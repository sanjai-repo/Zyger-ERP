package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.SparePartMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SparePartMasterRepository extends JpaRepository<SparePartMaster, Long> {
    Optional<SparePartMaster> findByCode(String code);
    List<SparePartMaster> findByActiveTrue();
}
