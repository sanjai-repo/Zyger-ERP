package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface RackMasterRepository extends JpaRepository<RackMaster, Long> {
    Optional<RackMaster> findByCode(String code);
    boolean existsByCode(String code);
    List<RackMaster> findByActiveTrue();
    List<RackMaster> findByStoreId(Long storeId);
    List<RackMaster> findByStoreIdAndActiveTrue(Long storeId);
}
