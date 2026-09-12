package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.StockBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface StockBalanceRepository extends JpaRepository<StockBalance, Long> {

    Optional<StockBalance> findByItemCodeAndLocationAndBatchNoAndHeatNoAndStockStatus(
            String itemCode, String location, String batchNo, String heatNo, String stockStatus);

    List<StockBalance> findByItemCode(String itemCode);

    List<StockBalance> findByItemCodeAndLocation(String itemCode, String location);

    List<StockBalance> findByStockStatus(String stockStatus);

    @Query("SELECT COALESCE(SUM(sb.qty), 0) FROM StockBalance sb " +
           "WHERE sb.itemCode = :item " +
           "AND (:loc IS NULL OR :loc = '' OR sb.location = :loc) " +
           "AND (:batch IS NULL OR :batch = '' OR sb.batchNo = :batch)")
    BigDecimal sumQtyByItemAndLocation(@Param("item") String item,
                                       @Param("loc") String loc,
                                       @Param("batch") String batch);

    @Query("SELECT COALESCE(SUM(sb.qty), 0) FROM StockBalance sb " +
           "WHERE sb.itemCode = :item " +
           "AND sb.stockStatus = 'FREE' " +
           "AND (:loc IS NULL OR :loc = '' OR sb.location = :loc)")
    BigDecimal sumAvailableByItem(@Param("item") String item, @Param("loc") String loc);

    @Query("SELECT COALESCE(SUM(sb.qty), 0) FROM StockBalance sb " +
           "WHERE sb.itemCode = :item " +
           "AND sb.stockStatus = 'QC_HOLD' " +
           "AND (:loc IS NULL OR :loc = '' OR sb.location = :loc)")
    BigDecimal sumQcHoldByItem(@Param("item") String item, @Param("loc") String loc);

    @Modifying
    @Transactional
    @Query("DELETE FROM StockBalance sb WHERE sb.qty <= 0 AND sb.stockStatus = 'FREE'")
    void deleteZeroFreeBalances();
}
