package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.StockLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface LedgerRepository extends JpaRepository<StockLedger, Long> {
    List<StockLedger> findAllByOrderByTxDateAsc();
    List<StockLedger> findTop8ByOrderByTxDateDesc();

    boolean existsByItemCode(String itemCode);

    boolean existsByDocNoAndDocType(String docNo, String docType);

    @Query("SELECT COALESCE(SUM(s.inQty),0) - COALESCE(SUM(s.outQty),0) FROM StockLedger s " +
           "WHERE s.itemCode = :item " +
           "AND (:loc IS NULL OR :loc = '' OR s.location = :loc) " +
           "AND (:batch IS NULL OR :batch = '' OR s.batchNo = :batch)")
    BigDecimal onHandBalance(@Param("item") String item,
                             @Param("loc") String loc,
                             @Param("batch") String batch);
}

