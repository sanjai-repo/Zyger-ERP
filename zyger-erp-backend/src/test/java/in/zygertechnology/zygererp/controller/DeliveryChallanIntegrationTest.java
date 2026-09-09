package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.AbstractPostgresIntegrationTest;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Delivery Challan Controller & Integration Tests")
class DeliveryChallanIntegrationTest extends AbstractPostgresIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private in.zygertechnology.zygererp.service.StockService stockService;

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private void seedStock(String itemCode, String location, double qty) {
        stockService.recordStockIn(
                "SEED-" + System.currentTimeMillis(),
                "stock-in",
                "STOCK_IN",
                itemCode,
                location,
                null,
                null,
                java.math.BigDecimal.valueOf(qty),
                java.time.LocalDate.now(),
                "system",
                "FREE"
        );
    }

    @Test
    @DisplayName("JO DC: Create, Next Number, Get by ID")
    void testJoDcWorkflow() throws Exception {
        seedStock("RM-001", "Main Warehouse", 100.0);

        // Next Number
        mockMvc.perform(get("/api/inventory/delivery-challan/jo-dc/next-number")
                        .header("Authorization", bearer(adminToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextNumber").exists());

        // Create JO DC
        Map<String, Object> body = Map.of(
                "party", "Job Worker Vendor Inc",
                "sourceLocation", "Main Warehouse",
                "docDate", "2026-09-09",
                "jobOrderNo", "JO-2026-0001",
                "challanPurpose", "Sending for Job Work",
                "processName", "Plating",
                "expectedReturnDate", "2026-09-25",
                "jobWorkRateApplicable", true,
                "gstOnJobWork", "Nil",
                "lines", List.of(
                        Map.of("itemCode", "RM-001", "qty", 10.0, "rate", 25.0, "amount", 250.0, "uom", "PCS")
                )
        );

        MvcResult res = mockMvc.perform(post("/api/inventory/delivery-challan/jo-dc")
                        .header("Authorization", bearer(adminToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.docNo").value(org.hamcrest.Matchers.startsWith("JODC")))
                .andReturn();

        String content = res.getResponse().getContentAsString();
        Map<?, ?> created = objectMapper.readValue(content, Map.class);
        Long id = Long.valueOf(String.valueOf(created.get("id")));

        // Fetch JO DC by ID
        mockMvc.perform(get("/api/inventory/delivery-challan/jo-dc/" + id)
                        .header("Authorization", bearer(adminToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.party").value("Job Worker Vendor Inc"))
                .andExpect(jsonPath("$.jobOrderNo").value("JO-2026-0001"));
    }

    @Test
    @DisplayName("General DC: Create, Convert to Invoice flag, Print PDF")
    void testGeneralDcWorkflow() throws Exception {
        seedStock("FG-001", "Main Warehouse", 100.0);

        Map<String, Object> body = Map.of(
                "party", "ACME Customer Ltd",
                "sourceLocation", "Main Warehouse",
                "docDate", "2026-09-09",
                "dcAgainst", "Sale",
                "salesOrderNo", "SO-2026-0100",
                "convertToInvoiceLater", true,
                "taxApplicable", true,
                "lines", List.of(
                        Map.of("itemCode", "FG-001", "qty", 5.0, "rate", 100.0, "amount", 500.0, "uom", "PCS")
                )
        );

        MvcResult res = mockMvc.perform(post("/api/inventory/delivery-challan/general-dc")
                        .header("Authorization", bearer(adminToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.docNo").value(org.hamcrest.Matchers.startsWith("GDC")))
                .andReturn();

        Map<?, ?> created = objectMapper.readValue(res.getResponse().getContentAsString(), Map.class);
        Long id = Long.valueOf(String.valueOf(created.get("id")));

        // Print PDF Endpoint Test
        mockMvc.perform(get("/api/inventory/delivery-challan/general-dc/" + id + "/print")
                        .header("Authorization", bearer(adminToken())))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"));
    }

    @Test
    @DisplayName("Transfer DC: Create with In-Transit Tracking")
    void testTransferDcWorkflow() throws Exception {
        seedStock("ITM-100", "Main Warehouse", 100.0);

        Map<String, Object> body = Map.of(
                "destinationLocation", "Branch Warehouse South",
                "sourceLocation", "Main Warehouse",
                "docDate", "2026-09-09",
                "transferType", "Inter-Branch",
                "inTransitTracking", true,
                "lines", List.of(
                        Map.of("itemCode", "ITM-100", "qty", 15.0, "uom", "PCS")
                )
        );

        mockMvc.perform(post("/api/inventory/delivery-challan/transfer-dc")
                        .header("Authorization", bearer(adminToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.docNo").value(org.hamcrest.Matchers.startsWith("TDC")))
                .andExpect(jsonPath("$.inTransitTracking").value(true));
    }

    @Test
    @DisplayName("DC Reports: Register, Job Work Ageing, Pending Invoice, Stock in Transit")
    void testDcReports() throws Exception {
        mockMvc.perform(get("/api/inventory/delivery-challan/reports/register")
                        .header("Authorization", bearer(adminToken()))
                        .param("dcType", "ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/inventory/delivery-challan/reports/job-work-ageing")
                        .header("Authorization", bearer(adminToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/inventory/delivery-challan/reports/pending-invoice")
                        .header("Authorization", bearer(adminToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/inventory/delivery-challan/reports/stock-in-transit")
                        .header("Authorization", bearer(adminToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
