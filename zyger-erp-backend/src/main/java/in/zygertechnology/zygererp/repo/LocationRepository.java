package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.LocationMaster;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<LocationMaster, Long> {
}
