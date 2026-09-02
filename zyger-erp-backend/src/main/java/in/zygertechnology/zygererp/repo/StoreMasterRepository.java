package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface StoreMasterRepository extends JpaRepository<StoreMaster, Long> {
    Optional<StoreMaster> findByCode(String code);
    boolean existsByCode(String code);
    List<StoreMaster> findByActiveTrue();
}
