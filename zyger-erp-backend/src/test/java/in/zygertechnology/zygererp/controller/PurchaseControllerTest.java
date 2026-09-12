package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.JobOrderReconciliationService;
import in.zygertechnology.zygererp.service.PrintService;
import in.zygertechnology.zygererp.service.PurchaseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
class PurchaseControllerTest {

    @Mock
    private DocumentFacade documentFacade;

    @Mock
    private PurchaseService purchaseService;

    @Mock
    private ExportService exportService;

    @Mock
    private PrintService printService;

    @Mock
    private JobOrderReconciliationService joReconciliation;

    @InjectMocks
    private PurchaseController purchaseController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(purchaseController)
                .setControllerAdvice(new in.zygertechnology.zygererp.config.GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/purchase/{type} should return document list")
    void testListPurchaseDocuments() throws Exception {
        when(documentFacade.list(eq("purchase-order"), any())).thenReturn(Map.of("content", List.of(), "totalElements", 0));

        mockMvc.perform(get("/api/v1/purchase/purchase-order"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @DisplayName("GET /api/v1/purchase/dashboard should return purchase dashboard stats")
    void testPurchaseDashboard() throws Exception {
        when(purchaseService.dashboard()).thenReturn(Map.of("totalPO", 20, "openPO", 8));

        mockMvc.perform(get("/api/v1/purchase/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPO").value(20));
    }

    @Test
    @DisplayName("GET /api/v1/purchase/invalid-type should return 400 Bad Request")
    void testInvalidPurchaseDocumentType() throws Exception {
        mockMvc.perform(get("/api/v1/purchase/invalid-type"))
                .andExpect(status().isBadRequest());
    }
}
