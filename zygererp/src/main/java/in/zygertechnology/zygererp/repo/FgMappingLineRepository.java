package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.*;

public interface FgMappingLineRepository extends JpaRepository<FgMappingLine, Long> {
    List<FgMappingLine> findByFgMappingIdIn(Collection<Long> fgMappingIds);
    @Modifying @Query("delete from FgMappingLine l where l.fgMappingId in :ids")
    void deleteByFgMappingIdIn(Collection<Long> ids);
}