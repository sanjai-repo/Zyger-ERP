package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.CompanyInfo;
import in.zygertechnology.zygererp.repo.CompanyInfoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrintServiceTest {

    @Mock private CompanyInfoRepository companyInfos;
    @InjectMocks private PrintService printService;

    @Nested
    @DisplayName("deliveryChallan()")
    class DeliveryChallan {
        @Test
        @DisplayName("Should generate PDF bytes for delivery challan")
        void generatePdf() {
            when(companyInfos.findById(1L)).thenReturn(Optional.empty());

            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("docNo", "DC-001");
            doc.put("docDate", "2026-01-15");
            doc.put("customer", "Acme Corp");
            doc.put("lines", List.of());

            byte[] result = printService.deliveryChallan(doc, "sales-dc");
            assertNotNull(result);
            assertTrue(result.length > 0);
            // PDF magic bytes: %PDF
            assertTrue(result[0] == (byte) '%');
        }

        @Test
        @DisplayName("Should generate PDF with lines")
        void generatePdfWithLines() {
            when(companyInfos.findById(1L)).thenReturn(Optional.empty());

            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("docNo", "DC-002");
            doc.put("customer", "Beta Inc");
            doc.put("lines", List.of(
                    Map.of("itemCode", "ITEM-1", "description", "Widget", "quantity", 10, "uom", "NOS")
            ));

            byte[] result = printService.deliveryChallan(doc, "sales-dc");
            assertNotNull(result);
            assertTrue(result.length > 100);
        }
    }

    @Nested
    @DisplayName("workOrder()")
    class WorkOrderPrint {
        @Test
        @DisplayName("Should generate PDF for work order")
        void generatePdf() {
            when(companyInfos.findById(1L)).thenReturn(Optional.empty());

            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("docNo", "WO-001");
            doc.put("itemCode", "ITEM-100");
            doc.put("lines", List.of());

            byte[] result = printService.workOrder(doc);
            assertNotNull(result);
            assertTrue(result.length > 0);
        }
    }

    @Nested
    @DisplayName("salesDoc()")
    class SalesDocPrint {
        @Test
        @DisplayName("Should generate PDF for sales document")
        void generatePdf() {
            when(companyInfos.findById(1L)).thenReturn(Optional.empty());

            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("docNo", "SO-001");
            doc.put("customer", "Acme Corp");
            doc.put("lines", List.of());

            byte[] result = printService.salesDoc(doc, "sales-order");
            assertNotNull(result);
            assertTrue(result.length > 0);
        }
    }
}
