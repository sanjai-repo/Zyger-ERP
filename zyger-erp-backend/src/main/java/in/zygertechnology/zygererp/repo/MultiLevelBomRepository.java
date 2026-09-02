package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.*;

public interface MultiLevelBomRepository extends JpaRepository<MultiLevelBom, Long> {
    List<MultiLevelBom> findByBomMappingIdOrderByAutoCodeAsc(Long bomMappingId);
    Optional<MultiLevelBom> findByAutoCode(String autoCode);
    @Modifying @Query("delete from MultiLevelBom m where m.bomMappingId = :bomMappingId")
    void deleteByBomMappingId(Long bomMappingId);
}