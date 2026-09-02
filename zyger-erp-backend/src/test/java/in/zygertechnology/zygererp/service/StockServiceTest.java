package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.StockBalance;
import in.zygertechnology.zygererp.repo.LedgerRepository;
import in.zygertechnology.zygererp.repo.StockBalanceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock
    private LedgerRepository ledgerRepository;

    @Mock
    private StockBalanceRepository stockBalanceRepository;

    @Mock
    private DocumentFacade documentFacade;

    @InjectMocks
    private StockService stockService;

    @Test
    @DisplayName("Should correctly format stock key from item, location, batch, and heat")
    void testStockKeyGeneration() {
        String key = StockService.key("ITEM100", "MAIN_WH", "B123", "H456");
        assertEquals("ITEM100|MAIN_WH|B123|H456", key);
    }

    @Test
    @DisplayName("Should handle null values gracefully in stock key generation")
    void testStockKeyGenerationWithNulls() {
        String key = StockService.key("ITEM100", null, null, null);
        assertEquals("ITEM100|||", key);
    }

    @Test
    @DisplayName("Should compute balance available quantity correctly")
    void testBalanceAvailableQuantity() {
        StockService.Balance balance = new StockService.Balance("ITEM01", "WH1", "B1", "H1", 100.0, 20.0, 10.0);
        assertEquals(70.0, balance.available());
    }

    @Test
    @DisplayName("Should aggregate FREE and QC_HOLD stock balances")
    void testBalancesAggregation() {
        StockBalance freeStock = new StockBalance();
        freeStock.setItemCode("ITEM-A");
        freeStock.setLocation("LOC-1");
        freeStock.setBatchNo("BATCH-1");
        freeStock.setHeatNo("HEAT-1");
        freeStock.setStockStatus("FREE");
        freeStock.setQty(BigDecimal.valueOf(150));

        StockBalance qcStock = new StockBalance();
        qcStock.setItemCode("ITEM-A");
        qcStock.setLocation("LOC-1");
        qcStock.setBatchNo("BATCH-1");
        qcStock.setHeatNo("HEAT-1");
        qcStock.setStockStatus("QC_HOLD");
        qcStock.setQty(BigDecimal.valueOf(50));

        when(stockBalanceRepository.findAll()).thenReturn(List.of(freeStock, qcStock));
        when(documentFacade.findAll(anyString())).thenReturn(Collections.emptyList());

        Map<String, StockService.Balance> result = stockService.balances();

        String key = StockService.key("ITEM-A", "LOC-1", "BATCH-1", "HEAT-1");
        assertTrue(result.containsKey(key));

        StockService.Balance balance = result.get(key);
        assertEquals(200.0, balance.onHand());
        assertEquals(50.0, balance.qcHold());
        assertEquals(150.0, balance.available());
    }
}
