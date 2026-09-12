package in.zygertechnology.zygererp.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * P2 — Inventory integration boundary between the Production domain and {@link StockService}.
 *
 * <p>Purpose (C5 / DOC 10 layering; Rule 9):
 * <pre>
 * ProductionJobCardService
 *         ↓
 * ProductionStockBoundary   ← this
 *         ↓
 * StockService              (NOT modified)
 * </pre>
 *
 * <p>Production code must never touch {@code stock_balance}/{@code StockBalanceRepository} directly; all inventory
 * posting flows through {@link StockService} (which owns the idempotency guard
 * {@code ledger.existsByDocNoAndDocType(docNo, docType)}). This boundary centralises that delegation for the Job Card
 * lifecycle, preserving the exact posting behaviour of the former in-controller call.
 */
@Service
public class ProductionStockBoundary {

    private final StockService stockService;

    public ProductionStockBoundary(StockService stockService) {
        this.stockService = stockService;
    }

    /**
     * Finished-goods receipt posted on Job Card completion.
     *
     * <p>Behaviour-locked: identical semantics to the original in-controller call
     * ({@code stockService.recordStockIn(jobCardNumber, "job-card-complete", "FG_RECEIPT", partCode, "STORE", null, null,
     * totalGood, LocalDate.now(), user, "FREE")}). `FREE` stock status, default params. The idempotency guard inside
     * {@code StockService} still applies (duplicate docNo+docType blocked).
     */
    public void recordJobCardCompleteGood(String jobCardNumber, String partCode,
                                          BigDecimal totalGood, String user) {
        stockService.recordStockIn(
                jobCardNumber, "job-card-complete", "FG_RECEIPT",
                partCode, "STORE", null, null,
                totalGood, LocalDate.now(), user, "FREE");
    }
}