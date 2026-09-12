package in.zygertechnology.zygererp.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Production-module inventory integration wrapper (ADR-PROD-005 / DOC 18 P1).
 *
 * <p>All Production inventory movements MUST flow through this service, which
 * delegates exclusively to the controlled inventory engine {@link StockService}
 * ({@code stock_ledger} + derived {@code stock_balance}). This service <b>never</b>
 * reads/writes {@code stock_balance} or {@code StockBalanceRepository} directly and
 * contains no inventory-accounting logic — it is a thin, additive facade.</p>
 *
 * <p>Explicitly NOT duplicated here: numbering, ledger entry, balance derivation,
 * idempotency journaling, availability checks, reversal and audit. Those are
 * delegated to {@link StockService} (and its idempotency via
 * {@code ledger.existsByDocNoAndDocType}) so there is exactly one source of truth.</p>
 *
 * <p>Transaction boundary: methods are {@link Transactional}; calls to
 * {@link StockService} (itself transactional) join the same transaction so the
 * Production event + inventory posting commit together or roll back together.</p>
 *
 * <p>P1 scope: the wrapper and its unit test are added now. Wiring existing
 * {@code ProductionController} call-sites onto it is deferred to P6/P12 per DOC 18.</p>
 */
@Service
@Transactional
public class InventoryIntegrationService {

    private static final Logger log = LoggerFactory.getLogger(InventoryIntegrationService.class);

    private final StockService stockService;

    public InventoryIntegrationService(StockService stockService) {
        this.stockService = stockService;
    }

    // ─── Finished-goods / output receipt ───────────────────────────────────
    // Mirrors ProductionController job-card-complete FG_RECEIPT posting.

    /**
     * Receive finished goods produced by a Job Card into stock.
     * Delegates to {@link StockService#recordStockIn}.
     */
    public void receiveFinishedGood(
            String docNo, String itemCode, String location, String batchNo,
            BigDecimal qty, LocalDate txDate, String user) {
        log.info("FG receipt via InventoryIntegrationService: docNo={}, item={}, inQty={}",
                docNo, itemCode, qty);
        stockService.recordStockIn(
                docNo, PROD_JOB_CARD_COMPLETE, TX_FG_RECEIPT,
                itemCode, location, batchNo, null,
                qty, txDate, user, STOCK_FREE);
    }

    // ─── Product conversion ────────────────────────────────────────────────
    // Mirrors ProductionController product-conversion POST / COMPLETE postings.

    /** Consume the conversion input item. Delegates to {@link StockService#recordStockOut}. */
    public void consumeConversionInput(
            String docNo, String itemCode, String location, String batchNo,
            BigDecimal qty, LocalDate txDate, String user) {
        log.info("Conversion input via InventoryIntegrationService: docNo={}, item={}, outQty={}",
                docNo, itemCode, qty);
        stockService.recordStockOut(
                docNo, PROD_PRODUCT_CONVERSION, TX_CONVERSION_OUT,
                itemCode, location, batchNo, null,
                qty, txDate, user);
    }

    /** Receive the conversion output item. Delegates to {@link StockService#recordStockIn}. */
    public void receiveConversionOutput(
            String docNo, String itemCode, String location, String batchNo,
            BigDecimal qty, LocalDate txDate, String user) {
        log.info("Conversion output via InventoryIntegrationService: docNo={}, item={}, inQty={}",
                docNo, itemCode, qty);
        stockService.recordStockIn(
                docNo, PROD_PRODUCT_CONVERSION, TX_CONVERSION_IN,
                itemCode, location, batchNo, null,
                qty, txDate, user, STOCK_FREE);
    }

    // ─── Production return ─────────────────────────────────────────────────
    // Mirrors ProductionController production-return RECEIVE posting. The stock
    // status (FREE / QC_HOLD / SCRAP) is a production-station disposition.

    /**
     * Receive a Production Return into stock with the given countable stock status.
     *
     * <p>D-C1: only {@code FREE} and {@code QC_HOLD} are countable stock statuses and may be
     * written to {@code stock_balance} through this boundary. SCRAP/REJECTED/REWORK are
     * orchestration dispositions handled by controlled posting / NCR / rework route, never
     * as a countable stock-in. A blank/unsupported status is rejected (never defaults to FREE).</p>
     */
    public void receiveProductionReturn(
            String docNo, String itemCode, String location, String batchNo,
            BigDecimal qty, LocalDate txDate, String user, String stockStatus) {
        if (!STOCK_FREE.equals(stockStatus) && !STOCK_QC_HOLD.equals(stockStatus)) {
            throw new IllegalArgumentException(
                    "Production return may only post countable stock status FREE or QC_HOLD (got: "
                            + stockStatus + ") — unsupported dispositions never fall back to FREE");
        }
        log.info("Production return via InventoryIntegrationService: docNo={}, item={}, inQty={}, status={}",
                docNo, itemCode, qty, stockStatus);
        stockService.recordStockIn(
                docNo, PROD_PRODUCTION_RETURN, TX_RETURN_RECEIPT,
                itemCode, location, batchNo, null,
                qty, txDate, user, stockStatus);
    }

    // ─── Generic passthroughs (thin) ───────────────────────────────────────

    /** Generic controlled stock-in. Delegates all accounting to {@link StockService}. */
    public void stockIn(String docNo, String docType, String txType, String itemCode,
                        String location, String batchNo, String heatNo, BigDecimal inQty,
                        LocalDate txDate, String user, String stockStatus) {
        stockService.recordStockIn(docNo, docType, txType, itemCode, location, batchNo,
                heatNo, inQty, txDate, user, stockStatus);
    }

    /** Generic controlled stock-out. Delegates all accounting to {@link StockService}. */
    public void stockOut(String docNo, String docType, String txType, String itemCode,
                         String location, String batchNo, String heatNo, BigDecimal outQty,
                         LocalDate txDate, String user) {
        stockService.recordStockOut(docNo, docType, txType, itemCode, location, batchNo,
                heatNo, outQty, txDate, user);
    }

    /** Generic controlled stock adjustment (signed delta). Delegates to {@link StockService}. */
    public void stockAdjustment(String docNo, String docType, String txType, String itemCode,
                                String location, String batchNo, String heatNo, BigDecimal deltaQty,
                                LocalDate txDate, String user) {
        stockService.recordStockAdjustment(docNo, docType, txType, itemCode, location, batchNo,
                heatNo, deltaQty, txDate, user);
    }

    // ─── Shared constants matching the existing ProductionController postings ──
    public static final String PROD_JOB_CARD_COMPLETE = "job-card-complete";
    public static final String PROD_PRODUCT_CONVERSION = "product-conversion";
    public static final String PROD_PRODUCTION_RETURN = "production-return";

    public static final String TX_FG_RECEIPT = "FG_RECEIPT";
    public static final String TX_CONVERSION_OUT = "CONVERSION_OUT";
    public static final String TX_CONVERSION_IN = "CONVERSION_IN";
    public static final String TX_RETURN_RECEIPT = "RETURN_RECEIPT";

    public static final String STOCK_FREE = "FREE";
    public static final String STOCK_QC_HOLD = "QC_HOLD";
}