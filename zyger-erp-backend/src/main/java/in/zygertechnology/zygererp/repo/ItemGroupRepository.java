package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ItemGroupRepository extends JpaRepository<ItemGroup, Long> {
    Optional<ItemGroup> findByCode(String code);
    boolean existsByCode(String code);
    List<ItemGroup> findByActiveTrue();
    long countByParentId(Long parentId);
}
