package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ToolMasterRepository extends JpaRepository<ToolMaster, Long> {
    Optional<ToolMaster> findByCode(String code);
    boolean existsByCode(String code);
    List<ToolMaster> findByActiveTrue();
    List<ToolMaster> findByCurrentStatus(String status);
}
