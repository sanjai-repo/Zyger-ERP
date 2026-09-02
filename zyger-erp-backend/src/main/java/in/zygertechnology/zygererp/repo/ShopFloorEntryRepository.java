package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ShopFloorEntry;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ShopFloorEntryRepository extends BaseDocRepository<ShopFloorEntry> {
    List<ShopFloorEntry> findByWorkOrderNo(String workOrderNo);
}
