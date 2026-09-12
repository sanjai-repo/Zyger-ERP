package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface BinMasterRepository extends JpaRepository<BinMaster, Long> {
    Optional<BinMaster> findByCode(String code);
    boolean existsByCode(String code);
    List<BinMaster> findByActiveTrue();
    List<BinMaster> findByRackId(Long rackId);
    List<BinMaster> findByRackIdAndActiveTrue(Long rackId);
    List<BinMaster> findByStoreId(Long storeId);
    List<BinMaster> findByStoreIdAndActiveTrue(Long storeId);
}
