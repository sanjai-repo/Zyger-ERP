package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.SalesOrder;
import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.PrintService;
import in.zygertechnology.zygererp.service.SalesService;
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

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class SalesControllerTest {

    @Mock
    private DocumentFacade documentFacade;

    @Mock
    private SalesService salesService;

    @Mock
    private ExportService exportService;

    @Mock
    private PrintService printService;

    @InjectMocks
    private SalesController salesController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(salesController)
                .setControllerAdvice(new in.zygertechnology.zygererp.config.GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/sales/{type} should return document list")
    void testListSalesDocuments() throws Exception {
        when(documentFacade.list(eq("sales-order"), any())).thenReturn(Map.of("content", List.of(), "totalElements", 0));

        mockMvc.perform(get("/api/v1/sales/sales-order"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @DisplayName("GET /api/v1/sales/{type}/{id} should return single document row")
    void testGetSalesDocument() throws Exception {
        when(documentFacade.getRow("sales-order", 100L)).thenReturn(Map.of("id", 100, "docNo", "SO-100"));

        mockMvc.perform(get("/api/v1/sales/sales-order/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.docNo").value("SO-100"));
    }

    @Test
    @DisplayName("GET /api/v1/sales/dashboard should return sales dashboard stats")
    void testSalesDashboard() throws Exception {
        when(salesService.dashboard()).thenReturn(Map.of("totalSO", 15, "openSalesOrders", 5));

        mockMvc.perform(get("/api/v1/sales/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSO").value(15));
    }

    @Test
    @DisplayName("GET /api/v1/sales/invalid-type should return 400 Bad Request")
    void testInvalidSalesDocumentType() throws Exception {
        mockMvc.perform(get("/api/v1/sales/invalid-type"))
                .andExpect(status().isBadRequest());
    }
}
