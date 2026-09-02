package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ProcessGroupRepository extends JpaRepository<ProcessGroup, Long> {
    Optional<ProcessGroup> findByCode(String code);
    boolean existsByCode(String code);
    List<ProcessGroup> findByActiveTrue();
}
