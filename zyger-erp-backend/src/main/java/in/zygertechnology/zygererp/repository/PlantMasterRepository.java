package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.PlantMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PlantMasterRepository extends JpaRepository<PlantMaster, Long> {
    Optional<PlantMaster> findByCode(String code);
}
