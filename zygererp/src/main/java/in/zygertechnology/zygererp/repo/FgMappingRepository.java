package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.*;

public interface FgMappingRepository extends JpaRepository<FgMapping, Long> {
    List<FgMapping> findByBomMappingIdOrderByAutoCodeAsc(Long bomMappingId);
    Optional<FgMapping> findByAutoCode(String autoCode);
    @Modifying @Query("delete from FgMapping f where f.bomMappingId = :bomMappingId")
    void deleteByBomMappingId(Long bomMappingId);
}