package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.config.ApiEnvelope;
import in.zygertechnology.zygererp.entity.DocEntity;
import in.zygertechnology.zygererp.entity.WorkOrder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * P2 — ProductionOrderService thin-adapter tests.
 *
 * Verifies that the Production Order domain adapter delegates to the canonical Work Order owner
 * ({@link PlanningService}/{@link DocumentFacade}) without duplicating persistence or business logic,
 * applies the additive {@code orderType} discriminator, and introduces no {@code prod_order} model (C2/D2/D3).
 */
@ExtendWith(MockitoExtension.class)
class ProductionOrderServiceTest {

    @Mock
    private PlanningService planning;

    @Mock
    private DocumentFacade docs;

    @Mock
    private Principal principal;

    @InjectMocks
    private ProductionOrderService svc;

    private static WorkOrder wo(Long id, String status) {
        WorkOrder wo = new WorkOrder();
        wo.setId(id);
        wo.setStatus(status);
        wo.setOrderQuantity(java.math.BigDecimal.TEN);
        return wo;
    }

    @Test
    @DisplayName("create delegates to canonical planning.create and maps orderType onto work_order")
    void createDelegatesAndAppliesOrderType() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("itemCode", "ITEM1");
        body.put("orderQuantity", 10);
        body.put("orderType", "SINGLE");

        WorkOrder created = wo(99L, "DRAFT");
        when(principal.getName()).thenReturn("tester");
        when(planning.create(eq("work-order"), any(), eq("tester"))).thenReturn(created);
        when(docs.toRow(created)).thenReturn(Map.of("id", 99L, "status", "DRAFT", "orderType", "SINGLE"));

        Map<String, Object> result = svc.create(body, principal);

        assertEquals(99L, result.get("id"));
        assertEquals("SINGLE", result.get("orderType"));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
        verify(planning).create(eq("work-order"), cap.capture(), eq("tester"));
        // domain orderType must be mapped to canonical key and passed to planning
        assertTrue(cap.getValue().containsKey("orderType"));
        assertFalse(cap.getValue().containsKey("order_type"));
        assertEquals("SINGLE", cap.getValue().get("orderType"));
    }

    @Test
    @DisplayName("create accepts legacy order_type and maps it to canonical orderType")
    void createMapsLegacyOrderType() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("order_type", "COMPOSITE");
        when(principal.getName()).thenReturn("tester");
        when(planning.create(anyString(), any(), anyString())).thenReturn(wo(1L, "DRAFT"));
        when(docs.toRow(any(DocEntity.class))).thenReturn(Map.of("id", 1L));

        svc.create(body, principal);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
        verify(planning).create(eq("work-order"), cap.capture(), eq("tester"));
        assertFalse(cap.getValue().containsKey("order_type"));
        assertEquals("COMPOSITE", cap.getValue().get("orderType"));
    }

    @Test
    @DisplayName("update delegates to canonical planning.update for work-order doc type")
    void updateDelegatesToCanonicalOwner() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderQuantity", 20);
        when(principal.getName()).thenReturn("tester");
        when(planning.update(eq("work-order"), eq(5L), any(), eq("tester"))).thenReturn(wo(5L, "DRAFT"));
        when(docs.toRow(any(DocEntity.class))).thenReturn(Map.of("id", 5L, "orderQuantity", 20));

        Map<String, Object> result = svc.update(5L, body, principal);

        verify(planning).update(eq("work-order"), eq(5L), any(), eq("tester"));
        assertEquals(5L, result.get("id"));
    }

    @Test
    @DisplayName("action delegates to canonical planning.action (single source of truth)")
    void actionDelegatesToCanonicalOwner() {
        when(principal.getName()).thenReturn("tester");
        when(planning.action(eq("work-order"), eq(7L), eq("RELEASE"), eq("note"), eq("tester")))
                .thenReturn(wo(7L, "RELEASED"));
        when(docs.toRow(any(DocEntity.class))).thenReturn(Map.of("id", 7L, "status", "RELEASED"));

        Map<String, Object> result = svc.action(7L, "RELEASE", Map.of("note", "note"), principal);

        verify(planning).action(eq("work-order"), eq(7L), eq("RELEASE"), eq("note"), eq("tester"));
        assertEquals("RELEASED", result.get("status"));
    }

    @Test
    @DisplayName("populate delegates to canonical populateFromBomAndRoute")
    void populateDelegatesToCanonicalOwner() {
        when(planning.populateFromBomAndRoute(8L)).thenReturn(wo(8L, "DRAFT"));
        when(docs.toRow(any(DocEntity.class))).thenReturn(Map.of("id", 8L, "woNumber", "WO-8"));

        Map<String, Object> result = svc.populate(8L);

        verify(planning).populateFromBomAndRoute(8L);
        assertEquals(8L, result.get("id"));
    }

    @Test
    @DisplayName("createFromSo delegates to canonical createWorkOrderFromSO")
    void createFromSoDelegatesToCanonicalOwner() {
        when(principal.getName()).thenReturn("tester");
        when(planning.createWorkOrderFromSO(eq(10L), eq(11L), eq(5), eq("tester"))).thenReturn(wo(30L, "DRAFT"));
        when(docs.toRow(any(DocEntity.class))).thenReturn(Map.of("id", 30L));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("salesOrderId", 10L);
        body.put("salesOrderItemId", 11L);
        body.put("quantity", 5);
        Map<String, Object> result = svc.createFromSo(body, principal);

        verify(planning).createWorkOrderFromSO(10L, 11L, 5, "tester");
        assertEquals(30L, result.get("id"));
    }

    @Test
    @DisplayName("list is paged envelope over canonical work-order list")
    void listReturnsPagedEnvelope() {
        when(docs.list(eq("work-order"), any())).thenReturn(Map.of(
                "content", java.util.List.of(Map.of("id", 1L)),
                "totalElements", 1L, "totalPages", 1));

        ApiEnvelope<?> envelope = svc.list(Map.of("page", "0", "size", "8"));

        verify(docs).list(eq("work-order"), any());
        assertNotNull(envelope);
        assertNotNull(envelope.meta());
        assertEquals(1L, envelope.meta().totalElements());
    }

    @Test
    @DisplayName("delete delegates to canonical remove on work-order")
    void deleteDelegatesToCanonicalOwner() {
        when(principal.getName()).thenReturn("tester");
        svc.delete(4L, principal);
        verify(docs).remove("work-order", 4L, "tester");
    }

    @Test
    @DisplayName("must NOT introduce a prod_order doc type or persistence key")
    void noProdOrderModelIntroduced() {
        // The adapter is hard-bound to the canonical work-order doc type. There is no prod_order path.
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("itemCode", "ITEM1");
        body.put("orderQuantity", 10);
        when(principal.getName()).thenReturn("tester");
        when(planning.create(anyString(), any(), anyString())).thenReturn(wo(1L, "DRAFT"));
        when(docs.toRow(any(DocEntity.class))).thenReturn(Map.of("id", 1L, "orderType", "SINGLE"));

        svc.create(body, principal);

        // planning.create must be invoked with "work-order", never "prod_order"
        verify(planning, never()).create(startsWith("prod_"), any(), anyString());
    }
}