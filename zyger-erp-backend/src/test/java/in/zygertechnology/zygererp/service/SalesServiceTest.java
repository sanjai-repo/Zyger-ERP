package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesServiceTest {

    @Mock private DocumentFacade docs;
    @Mock private PartyRepository parties;
    @Mock private ItemRepository items;
    @Mock private StockService stockService;
    @InjectMocks private SalesService salesService;

    @Nested
    @DisplayName("isSales()")
    class IsSales {
        @Test
        @DisplayName("Should return true for known sales keys")
        void knownKeys() {
            assertTrue(salesService.isSales("sales-order"));
            assertTrue(salesService.isSales("proforma-invoice"));
            assertTrue(salesService.isSales("sales-dc"));
            assertTrue(salesService.isSales("sales-invoice"));
            assertTrue(salesService.isSales("dc-return"));
            assertTrue(salesService.isSales("invoice-return"));
        }

        @Test
        @DisplayName("Should return false for non-sales keys")
        void unknownKeys() {
            assertFalse(salesService.isSales("purchase-order"));
            assertFalse(salesService.isSales("quality-ncr"));
            assertFalse(salesService.isSales(""));
        }
    }

    @Nested
    @DisplayName("create()")
    class Create {
        @Test
        @DisplayName("Should create sales order with valid body")
        void createSalesOrder() {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("customer", "Acme Corp");
            body.put("lines", List.of());

            SalesOrder so = new SalesOrder();
            so.setDocNo("SO-001");
            so.setStatus("DRAFT");
            when(docs.create(eq("sales-order"), anyMap(), eq("admin"))).thenReturn(so);

            DocEntity result = salesService.create("sales-order", body, "admin");
            assertNotNull(result);
            assertEquals("admin", body.get("createdBy"));
        }

        @Test
        @DisplayName("Should resolve customer name to code")
        void resolveCustomerName() {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("customer", "Acme Corp");

            Party party = new Party();
            party.setCode("CUST-ACME");
            party.setName("Acme Corp");

            when(parties.findByName("Acme Corp")).thenReturn(Optional.of(party));

            SalesOrder so = new SalesOrder();
            when(docs.create(eq("sales-order"), anyMap(), eq("user1"))).thenReturn(so);

            salesService.create("sales-order", body, "user1");
            assertEquals("CUST-ACME", body.get("customerCode"));
        }

        @Test
        @DisplayName("Should copy orderDate to docDate when docDate is absent")
        void preProcessDateMapping() {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("orderDate", "2026-03-01");

            SalesOrder so = new SalesOrder();
            when(docs.create(eq("sales-order"), anyMap(), eq("user1"))).thenReturn(so);

            salesService.create("sales-order", body, "user1");
            assertEquals("2026-03-01", body.get("docDate"));
        }
    }

    @Nested
    @DisplayName("action()")
    class Action {
        @Test
        @DisplayName("Should delegate action to DocumentFacade")
        void delegateAction() {
            SalesOrder so = new SalesOrder();
            so.setId(10L);
            so.setStatus("DRAFT");

            when(docs.action(eq("sales-order"), eq(10L), eq("SUBMIT"), any(), eq("admin"), anyMap()))
                    .thenReturn(so);

            DocEntity result = salesService.action("sales-order", 10L, "SUBMIT", "Please approve", "admin");
            assertNotNull(result);
        }
    }
}
