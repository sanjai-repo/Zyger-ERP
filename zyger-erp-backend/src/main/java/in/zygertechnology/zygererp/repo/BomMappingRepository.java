package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface BomMappingRepository extends JpaRepository<BomMapping, Long> {
    List<BomMapping> findAllByOrderByAutoCode();
    Optional<BomMapping> findByAutoCode(String autoCode);
    boolean existsByAutoCode(String autoCode);
}