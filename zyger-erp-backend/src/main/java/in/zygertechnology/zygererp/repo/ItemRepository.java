package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ItemMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ItemRepository extends JpaRepository<ItemMaster, Long> {
    Optional<ItemMaster> findByCode(String code);
    boolean existsByCode(String code);
    long countByItemGroupId(Long itemGroupId);
}
