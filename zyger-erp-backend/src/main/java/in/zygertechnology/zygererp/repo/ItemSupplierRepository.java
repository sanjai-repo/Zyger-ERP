package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ItemSupplier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemSupplierRepository extends JpaRepository<ItemSupplier, Long> {
    List<ItemSupplier> findByItemCodeOrderByIdAsc(String itemCode);
    void deleteByItemCode(String itemCode);
}
