package in.zygertechnology.zygererp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for SalesController.
 * Uses Testcontainers for PostgreSQL and MockMvc for HTTP testing.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@DisplayName("Sales Controller Integration Tests")
class SalesControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /api/v1/sales/dashboard - should return dashboard stats")
    void shouldReturnDashboard() throws Exception {
        mockMvc.perform(get("/api/v1/sales/dashboard")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSO").exists())
                .andExpect(jsonPath("$.pendingApproval").exists());
    }

    @Test
    @DisplayName("GET /api/v1/sales/{type} - should list sales orders")
    void shouldListSalesOrders() throws Exception {
        mockMvc.perform(get("/api/v1/sales/sales-order")
                        .header("Authorization", "Bearer test-token")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").isNumber());
    }

    @Test
    @DisplayName("GET /api/v1/sales/{type} - should reject unknown document type")
    void shouldRejectUnknownType() throws Exception {
        mockMvc.perform(get("/api/v1/sales/unknown-type")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/v1/sales/{type} - should create sales order")
    void shouldCreateSalesOrder() throws Exception {
        Map<String, Object> body = Map.of(
                "customer", "Test Customer",
                "orderDate", "2026-09-01",
                "lines", java.util.List.of()
        );

        mockMvc.perform(post("/api/v1/sales/sales-order")
                        .header("Authorization", "Bearer test-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.docNo").exists())
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @DisplayName("GET /api/v1/sales/{type}/next-number - should return next number")
    void shouldReturnNextNumber() throws Exception {
        mockMvc.perform(get("/api/v1/sales/sales-order/next-number")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextNumber").exists());
    }

    @Test
    @DisplayName("GET /api/v1/sales/{type}/export - should export to xlsx")
    void shouldExportSalesOrders() throws Exception {
        mockMvc.perform(get("/api/v1/sales/sales-order/export")
                        .header("Authorization", "Bearer test-token")
                        .param("format", "xlsx"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test
    @DisplayName("GET /api/v1/sales/proforma-invoice - should list proforma invoices")
    void shouldListProformaInvoices() throws Exception {
        mockMvc.perform(get("/api/v1/sales/proforma-invoice")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/sales/sales-dc - should list delivery challans")
    void shouldListDeliveryChallans() throws Exception {
        mockMvc.perform(get("/api/v1/sales/sales-dc")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/sales/sales-invoice - should list sales invoices")
    void shouldListSalesInvoices() throws Exception {
        mockMvc.perform(get("/api/v1/sales/sales-invoice")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
