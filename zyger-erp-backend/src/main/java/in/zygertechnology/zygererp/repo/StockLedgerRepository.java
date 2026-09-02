package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.StockLedger;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockLedgerRepository extends JpaRepository<StockLedger, Long> {
}
