package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurchaseServiceTest {

    @Mock private DocumentFacade docs;
    @Mock private PurchasePriceHistoryRepository priceHistory;
    @Mock private JobWorkPriceHistoryRepository jobWorkPriceHistory;
    @Mock private PartyRepository parties;
    @Mock private ItemRepository items;
    @Mock private EmailService emailService;
    @Mock private PrintService printer;
    @Mock private NotificationService notifications;
    @Mock private MasterAuditLogRepository auditLogs;
    @Mock private QualityInspectionService qualityInspectionService;
    @Mock private EntityManager em;
    @InjectMocks private PurchaseService purchaseService;

    @Nested
    @DisplayName("isPurchase()")
    class IsPurchase {
        @Test
        @DisplayName("Should return true for known purchase keys")
        void knownKeys() {
            assertTrue(purchaseService.isPurchase("purchase-request"));
            assertTrue(purchaseService.isPurchase("supplier-enquiry"));
            assertTrue(purchaseService.isPurchase("supplier-quotation"));
            assertTrue(purchaseService.isPurchase("purchase-order"));
            assertTrue(purchaseService.isPurchase("job-order"));
            assertTrue(purchaseService.isPurchase("purchase-target"));
            assertTrue(purchaseService.isPurchase("purchase-price-list"));
            assertTrue(purchaseService.isPurchase("job-work-price-list"));
        }

        @Test
        @DisplayName("Should return false for non-purchase keys")
        void unknownKeys() {
            assertFalse(purchaseService.isPurchase("sales-order"));
            assertFalse(purchaseService.isPurchase("quality-ncr"));
            assertFalse(purchaseService.isPurchase("production-entry"));
            assertFalse(purchaseService.isPurchase(""));
        }
    }

    @Nested
    @DisplayName("create()")
    class Create {
        @Test
        @DisplayName("Should create purchase request with valid body")
        void createPurchaseRequest() {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("supplier", "ABC Suppliers");

            PurchaseRequest pr = new PurchaseRequest();
            pr.setDocNo("PR-001");
            pr.setStatus("DRAFT");
            when(docs.create(eq("purchase-request"), anyMap(), eq("admin"))).thenReturn(pr);

            DocEntity result = purchaseService.create("purchase-request", body, "admin");
            assertNotNull(result);
            assertEquals("admin", body.get("createdBy"));
            verify(docs).create(eq("purchase-request"), anyMap(), eq("admin"));
        }

        @Test
        @DisplayName("Should copy notes to remarks and vice versa")
        void preProcessNotesRemarks() {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("notes", "Test note");

            PurchaseRequest pr = new PurchaseRequest();
            when(docs.create(eq("purchase-request"), anyMap(), eq("user1"))).thenReturn(pr);

            purchaseService.create("purchase-request", body, "user1");
            assertEquals("Test note", body.get("remarks"));
        }

        @Test
        @DisplayName("Should copy requiredDate to docDate when docDate is absent")
        void preProcessDateMapping() {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("requiredDate", "2026-01-15");

            PurchaseRequest pr = new PurchaseRequest();
            when(docs.create(eq("purchase-request"), anyMap(), eq("user1"))).thenReturn(pr);

            purchaseService.create("purchase-request", body, "user1");
            assertEquals("2026-01-15", body.get("docDate"));
        }

        @Test
        @DisplayName("Should resolve supplier name to code")
        void resolveSupplierName() {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("supplier", "ABC Suppliers");

            Party party = new Party();
            party.setCode("SUP-ABC");
            party.setName("ABC Suppliers");

            when(parties.findByName("ABC Suppliers")).thenReturn(Optional.of(party));

            PurchaseRequest pr = new PurchaseRequest();
            when(docs.create(eq("purchase-request"), anyMap(), eq("user1"))).thenReturn(pr);

            purchaseService.create("purchase-request", body, "user1");
            assertEquals("SUP-ABC", body.get("supplierCode"));
        }
    }

    @Nested
    @DisplayName("action()")
    class Action {
        @Test
        @DisplayName("Should delegate action to DocumentFacade")
        void delegateAction() {
            PurchaseOrder po = new PurchaseOrder();
            po.setId(10L);
            po.setStatus("DRAFT");

            when(docs.action("purchase-order", 10L, "SUBMIT", "Approve please", "admin"))
                    .thenReturn(po);

            DocEntity result = purchaseService.action("purchase-order", 10L, "SUBMIT", "Approve please", "admin");
            assertNotNull(result);
            verify(docs).action("purchase-order", 10L, "SUBMIT", "Approve please", "admin");
        }
    }
}
