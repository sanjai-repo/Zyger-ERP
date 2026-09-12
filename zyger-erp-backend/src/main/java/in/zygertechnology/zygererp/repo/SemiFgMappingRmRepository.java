package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.*;

public interface SemiFgMappingRmRepository extends JpaRepository<SemiFgMappingRm, Long> {
    List<SemiFgMappingRm> findBySemiFgMappingIdIn(Collection<Long> semiFgMappingIds);
    @Modifying @Query("delete from SemiFgMappingRm r where r.semiFgMappingId in :ids")
    void deleteBySemiFgMappingIdIn(Collection<Long> ids);
}