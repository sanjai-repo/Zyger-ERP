package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.*;

public interface SemiFgMappingRepository extends JpaRepository<SemiFgMapping, Long> {
    List<SemiFgMapping> findByBomMappingIdOrderByAutoCodeAsc(Long bomMappingId);
    List<SemiFgMapping> findByBomMappingIdIn(Collection<Long> bomMappingIds);
    Optional<SemiFgMapping> findByAutoCode(String autoCode);
    @Modifying @Query("delete from SemiFgMapping s where s.bomMappingId = :bomMappingId")
    void deleteByBomMappingId(Long bomMappingId);
}