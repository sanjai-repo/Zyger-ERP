package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface UOMMasterRepository extends JpaRepository<UOMMaster, Long> {
    Optional<UOMMaster> findByCode(String code);
    boolean existsByCode(String code);
    List<UOMMaster> findByActiveTrue();
}
