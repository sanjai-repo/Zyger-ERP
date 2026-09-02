package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentFacadeTest {

    @Mock private EntityManager em;
    @Mock private tools.jackson.databind.ObjectMapper mapper;
    @Mock private LedgerRepository ledger;
    @Mock private StockService stockService;
    @Mock private ItemCacheService itemCache;
    @Mock private DocNumberService numbers;
    @Mock private SupplierInvoiceAttachmentRepository attachments;
    @Mock private PartyRepository parties;
    @Mock private DocumentWorkflowEngine workflowEngine;
    @Mock private BackdatedEntryGuardService backdatedEntryGuard;
    @Mock private AttachmentService attachmentService;
    @InjectMocks private DocumentFacade documentFacade;

    @BeforeEach
    void setUp() {
        Map<String, Class<? extends DocEntity>> reg = new HashMap<>();
        reg.put("purchase-order", PurchaseOrder.class);
        reg.put("sales-order", SalesOrder.class);
        reg.put("purchase-request", PurchaseRequest.class);
        ReflectionTestUtils.setField(documentFacade, "reg", reg);
    }

    @Nested
    @DisplayName("isRegistered()")
    class IsRegistered {
        @Test
        @DisplayName("Should return true for registered document types")
        void registered() {
            assertTrue(documentFacade.isRegistered("purchase-order"));
            assertTrue(documentFacade.isRegistered("sales-order"));
        }

        @Test
        @DisplayName("Should return false for unregistered document types")
        void unregistered() {
            assertFalse(documentFacade.isRegistered("unknown-type"));
            assertFalse(documentFacade.isRegistered(""));
        }
    }

    @Nested
    @DisplayName("keys()")
    class Keys {
        @Test
        @DisplayName("Should return all registered keys")
        void allKeys() {
            Set<String> keys = documentFacade.keys();
            assertTrue(keys.contains("purchase-order"));
            assertTrue(keys.contains("sales-order"));
            assertTrue(keys.contains("purchase-request"));
            assertEquals(3, keys.size());
        }
    }

    @Nested
    @DisplayName("nextNumber()")
    class NextNumber {
        @Test
        @DisplayName("Should delegate to DocNumberService")
        void delegate() {
            when(numbers.next("purchase-order")).thenReturn("PO-2026-0001");

            String result = documentFacade.nextNumber("purchase-order");
            assertEquals("PO-2026-0001", result);
            verify(numbers).next("purchase-order");
        }

        @Test
        @DisplayName("Should support prefix-based numbering")
        void withPrefix() {
            when(numbers.next("purchase-order", "PO")).thenReturn("PO-2026-0042");

            String result = documentFacade.nextNumber("purchase-order", "PO");
            assertEquals("PO-2026-0042", result);
        }
    }
}
