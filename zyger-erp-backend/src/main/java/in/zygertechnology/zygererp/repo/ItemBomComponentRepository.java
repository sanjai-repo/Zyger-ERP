package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ItemBomComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemBomComponentRepository extends JpaRepository<ItemBomComponent, Long> {
    List<ItemBomComponent> findByParentItemCodeOrderByIdAsc(String parentItemCode);
    void deleteByParentItemCode(String parentItemCode);
}
