package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.PurchasePriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.math.BigDecimal;
import java.util.Optional;

public interface PurchasePriceHistoryRepository extends JpaRepository<PurchasePriceHistory, Long> {
    Optional<PurchasePriceHistory> findTopBySupplierAndItemCodeOrderByEffectiveDateDescIdDesc(String supplier, String itemCode);
}
