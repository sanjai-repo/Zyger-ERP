package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.*;

public interface MultiLevelBomLineRepository extends JpaRepository<MultiLevelBomLine, Long> {
    List<MultiLevelBomLine> findByMultiLevelBomIdIn(Collection<Long> multiLevelBomIds);
    @Modifying @Query("delete from MultiLevelBomLine l where l.multiLevelBomId in :ids")
    void deleteByMultiLevelBomIdIn(Collection<Long> ids);
}