package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.config.GlobalExceptionHandler;
import in.zygertechnology.zygererp.service.StockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StockControllerTest {

    private MockMvc mockMvc;

    @Mock
    private StockService stockService;

    @InjectMocks
    private StockController stockController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(stockController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Should return stock balance for itemCode")
    void testGetBalance() throws Exception {
        when(stockService.onHand("ITEM100", "MAIN", null)).thenReturn(100.0);
        when(stockService.available("ITEM100", "MAIN")).thenReturn(80.0);
        when(stockService.qcHold("ITEM100", "MAIN")).thenReturn(10.0);

        mockMvc.perform(get("/api/inventory/stock/balance")
                        .param("itemCode", "ITEM100")
                        .param("location", "MAIN")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCode").value("ITEM100"))
                .andExpect(jsonPath("$.onHand").value(100.0))
                .andExpect(jsonPath("$.available").value(80.0))
                .andExpect(jsonPath("$.qcHold").value(10.0));
    }

    @Test
    @DisplayName("Should return summary stock metrics")
    void testGetSummary() throws Exception {
        StockService.Balance b1 = new StockService.Balance("ITEM1", "LOC1", "B1", "H1", 200.0, 50.0, 20.0);
        when(stockService.balances()).thenReturn(Map.of("key1", b1));

        mockMvc.perform(get("/api/inventory/stock/summary")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOnHand").value(200.0))
                .andExpect(jsonPath("$.totalAvailable").value(130.0))
                .andExpect(jsonPath("$.totalReserved").value(50.0))
                .andExpect(jsonPath("$.totalQcHold").value(20.0));
    }
}
