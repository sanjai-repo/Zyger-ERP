package in.zygertechnology.zygererp.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static in.zygertechnology.zygererp.service.InventoryIntegrationService.*;
import static org.mockito.Mockito.verify;

/**
 * P1 — InventoryIntegrationService unit test (DOC 18 P1; ADR-PROD-005).
 *
 * Verifies the additive wrapper delegates every Production movement to the
 * controlled {@link StockService} engine with the correct document-type and
 * transaction-type constants, and that it performs no direct stock-balance work
 * (it only depends on StockService; {@code StockBalanceRepository} is not used).
 */
@ExtendWith(MockitoExtension.class)
class InventoryIntegrationServiceTest {

    @Mock
    private StockService stockService;

    @InjectMocks
    private InventoryIntegrationService integrationService;

    private static final String DOC = "JC-2026-000001";
    private static final String DOC_CONV = "CV-2026-000001";
    private static final String DOC_RET = "PR-2026-000001";
    private static final String ITEM = "FG-001";
    private static final String LOC = "STORE";
    private static final String BATCH = "B1";
    private static final LocalDate TX = LocalDate.of(2026, 1, 5);
    private static final String USER = "operator";

    @Test
    @DisplayName("receiveFinishedGood should delegate to StockService.recordStockIn as FG_RECEIPT")
    void receiveFinishedGoodDelegatesAsFgReceipt() {
        integrationService.receiveFinishedGood(DOC, ITEM, LOC, BATCH, new BigDecimal("10.00"), TX, USER);

        verify(stockService).recordStockIn(
                DOC, PROD_JOB_CARD_COMPLETE, TX_FG_RECEIPT,
                ITEM, LOC, BATCH, null,
                new BigDecimal("10.00"), TX, USER, STOCK_FREE);
    }

    @Test
    @DisplayName("consumeConversionInput should delegate to StockService.recordStockOut as CONVERSION_OUT")
    void consumeConversionInputDelegatesAsConversionOut() {
        integrationService.consumeConversionInput(DOC_CONV, ITEM, LOC, BATCH, new BigDecimal("5.00"), TX, USER);

        verify(stockService).recordStockOut(
                DOC_CONV, PROD_PRODUCT_CONVERSION, TX_CONVERSION_OUT,
                ITEM, LOC, BATCH, null,
                new BigDecimal("5.00"), TX, USER);
    }

    @Test
    @DisplayName("receiveConversionOutput should delegate to StockService.recordStockIn as CONVERSION_IN")
    void receiveConversionOutputDelegatesAsConversionIn() {
        integrationService.receiveConversionOutput(DOC_CONV, ITEM, LOC, BATCH, new BigDecimal("7.00"), TX, USER);

        verify(stockService).recordStockIn(
                DOC_CONV, PROD_PRODUCT_CONVERSION, TX_CONVERSION_IN,
                ITEM, LOC, BATCH, null,
                new BigDecimal("7.00"), TX, USER, STOCK_FREE);
    }

    @Test
    @DisplayName("receiveProductionReturn should forward the disposition stock status")
    void receiveProductionReturnForwardsStatus() {
        integrationService.receiveProductionReturn(DOC_RET, ITEM, LOC, BATCH,
                new BigDecimal("3.00"), TX, USER, "QC_HOLD");

        verify(stockService).recordStockIn(
                DOC_RET, PROD_PRODUCTION_RETURN, TX_RETURN_RECEIPT,
                ITEM, LOC, BATCH, null,
                new BigDecimal("3.00"), TX, USER, "QC_HOLD");
    }

    @Test
    @DisplayName("generic stockIn/stockOut/stockAdjustment delegate straight through")
    void genericPassthroughsDelegate() {
        integrationService.stockIn(DOC, "gen-in", "TX1", ITEM, LOC, BATCH, "H1",
                new BigDecimal("1.00"), TX, USER, STOCK_FREE);
        integrationService.stockOut(DOC, "gen-out", "TX2", ITEM, LOC, BATCH, "H1",
                new BigDecimal("2.00"), TX, USER);
        integrationService.stockAdjustment(DOC, "gen-adj", "TX3", ITEM, LOC, BATCH, "H1",
                new BigDecimal("-0.50"), TX, USER);

        verify(stockService).recordStockIn(DOC, "gen-in", "TX1", ITEM, LOC, BATCH, "H1",
                new BigDecimal("1.00"), TX, USER, STOCK_FREE);
        verify(stockService).recordStockOut(DOC, "gen-out", "TX2", ITEM, LOC, BATCH, "H1",
                new BigDecimal("2.00"), TX, USER);
        verify(stockService).recordStockAdjustment(DOC, "gen-adj", "TX3", ITEM, LOC, BATCH, "H1",
                new BigDecimal("-0.50"), TX, USER);
    }
}