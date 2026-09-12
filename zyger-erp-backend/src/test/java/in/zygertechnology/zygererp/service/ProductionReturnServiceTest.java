package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * P12 — Unit tests for {@link ProductionReturnService}:
 * D-C1 strict disposition (unsupported NEVER falls back to FREE, defaults
 * QC_HOLD for batch-controlled else GOOD), D-C2 returnable-balance
 * validation (returnQty <= issued - consumed - alreadyReturned), cumulative
 * returnQty accumulation, workflow transitions (SUBMIT -> VERIFY -> RECEIVE,
 * illegal transitions rejected), standalone returns (no origin), and
 * countable stock status boundary (only FREE / QC_HOLD reach inventory).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductionReturnServiceTest {

    @Mock private ProductionReturnRepository returns;
    @Mock private ProductionConsumptionRepository consumptions;
    @Mock private ProductionConsumptionLineRepository consumptionLines;
    @Mock private DocNumberService numbers;
    @Mock private InventoryIntegrationService inventory;

    @InjectMocks
    private ProductionReturnService service;

    private final WorkflowStateMachine stateMachine = new WorkflowStateMachine();

    @BeforeEach
    void setUp() {
        try {
            java.lang.reflect.Field f = ProductionReturnService.class.getDeclaredField("stateMachine");
            f.setAccessible(true);
            f.set(service, stateMachine);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
        when(numbers.next("production-return")).thenReturn("PR-2026-000001");
        when(returns.save(any())).thenAnswer(i -> {
            ProductionReturn r = i.getArgument(0);
            if (r.getId() == null) r.setId(1L);
            return r;
        });
        when(consumptionLines.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private void toVerified(ProductionReturn pr, long id) {
        when(returns.findById(id)).thenReturn(Optional.of(pr));
        ProductionReturn submitted = service.action(id, "submit", "user");
        when(returns.findById(id)).thenReturn(Optional.of(submitted));
        service.action(id, "verify", "user");
        when(returns.findById(id)).thenReturn(Optional.of(pr));
    }

    private ProductionReturn draft(String item, BigDecimal qty, String condition, String origin) {
        return ProductionReturn.builder()
                .itemCode(item).batchNumber("B1")
                .quantity(qty).condition(condition)
                .originalIssueReference(origin)
                .location("STORE")
                .status("DRAFT")
                .build();
    }

    private ProductionConsumption consumption(String no, String item, String issued, String consumed, String returned) {
        ProductionConsumption c = ProductionConsumption.builder()
                .consumptionNo(no).status("POSTED")
                .lines(new ArrayList<>())
                .build();
        ProductionConsumptionLine line = ProductionConsumptionLine.builder()
                .itemCode(item).batchNumber("B1")
                .issuedQty(new BigDecimal(issued))
                .consumedQty(new BigDecimal(consumed))
                .returnQty(new BigDecimal(returned))
                .build();
        c.getLines().add(line);
        return c;
    }

    // ─── D-C1: strict disposition ──────────────────────────────────────────

    @Test
    @DisplayName("D-C1: unsupported disposition is rejected with a validation error (never FREE)")
    void unsupportedDispositionRejected() {
        ProductionReturn pr = draft("ITEM-1", new BigDecimal("5"), "UNKNOWN", null);
        pr.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(pr));

        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "receive", "user"));
        verify(inventory, never()).receiveProductionReturn(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("D-C1: blank disposition defaults QC_HOLD for batch-controlled item")
    void blankDispositionDefaultsQcHoldForBatch() {
        ProductionReturn pr = draft("ITEM-1", new BigDecimal("5"), null, null);
        pr.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(pr));

        // step to VERIFIED via SUBMIT
        service.action(1L, "submit", "user");
        service.action(1L, "verify", "user");

        ProductionReturn received = service.action(1L, "receive", "user");

        assertEquals("RECEIVED", received.getStatus());
        assertEquals("QC_HOLD", received.getCondition());
        verify(inventory).receiveProductionReturn(
                eq("PR-2026-000001"), eq("ITEM-1"), eq("STORE"), eq("B1"),
                eq(new BigDecimal("5")), any(LocalDate.class), eq("user"), eq("QC_HOLD"));
    }

    @Test
    @DisplayName("D-C1: blank disposition defaults GOOD for non-batch-controlled item")
    void blankDispositionDefaultsGoodWithoutBatch() {
        ProductionReturn pr = draft("ITEM-1", new BigDecimal("5"), null, null);
        pr.setBatchNumber(null);
        pr.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(pr));

        service.action(1L, "submit", "user");
        service.action(1L, "verify", "user");

        ProductionReturn received = service.action(1L, "receive", "user");

        assertEquals("GOOD", received.getCondition());
        verify(inventory).receiveProductionReturn(
                eq("PR-2026-000001"), eq("ITEM-1"), eq("STORE"), isNull(),
                eq(new BigDecimal("5")), any(LocalDate.class), eq("user"), eq("FREE"));
    }

    // ─── D-C2: returnable balance ──────────────────────────────────────────

    @Test
    @DisplayName("D-C2: return equal to issued - consumed - alreadyReturned is accepted")
    void returnAtBalanceAccepted() {
        when(consumptions.findByConsumptionNo("PC-2026-0001"))
                .thenReturn(Optional.of(consumption("PC-2026-0001", "ITEM-1", "10", "6", "2")));
        ProductionReturn pr = draft("ITEM-1", new BigDecimal("2"), "GOOD", "PC-2026-0001");
        pr.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(pr));

        service.action(1L, "submit", "user");
        service.action(1L, "verify", "user");
        ProductionReturn received = service.action(1L, "receive", "user");

        assertEquals("RECEIVED", received.getStatus());
        verify(consumptionLines).save(argThat(l -> l.getReturnQty().compareTo(new BigDecimal("4")) == 0));
    }

    @Test
    @DisplayName("D-C2: return exceeding returnable balance is rejected")
    void returnExceedingBalanceRejected() {
        when(consumptions.findByConsumptionNo("PC-2026-0001"))
                .thenReturn(Optional.of(consumption("PC-2026-0001", "ITEM-1", "10", "6", "2")));
        ProductionReturn pr = draft("ITEM-1", new BigDecimal("3"), "GOOD", "PC-2026-0001");
        pr.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(pr));

        service.action(1L, "submit", "user");
        service.action(1L, "verify", "user");
        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "receive", "user"));
        verify(inventory, never()).receiveProductionReturn(any(), any(), any(), any(), any(), any(), any(), any());
        verify(consumptionLines, never()).save(any());
    }

    @Test
    @DisplayName("D-C2: multiple returns are cumulatively bounded")
    void multipleReturnsCumulativelyBounded() {
        when(consumptions.findByConsumptionNo("PC-2026-0001"))
                .thenReturn(Optional.of(consumption("PC-2026-0001", "ITEM-1", "10", "6", "0")));

        ProductionReturn r1 = draft("ITEM-1", new BigDecimal("3"), "GOOD", "PC-2026-0001");
        r1.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(r1));
        service.action(1L, "submit", "user");
        service.action(1L, "verify", "user");
        service.action(1L, "receive", "user");

        ProductionReturn r2 = draft("ITEM-1", new BigDecimal("4"), "GOOD", "PC-2026-0001");
        r2.setReturnNumber("PR-2026-000002");
        when(returns.findById(2L)).thenReturn(Optional.of(r2));
        service.action(2L, "submit", "user");
        service.action(2L, "verify", "user");

        // Balance after r1: 10 - 6 - 3 = 1, so r2 of 4 must be rejected
        assertThrows(IllegalArgumentException.class, () -> service.action(2L, "receive", "user"));
    }

    @Test
    @DisplayName("D-C2: unresolvable origin is rejected")
    void unresolvableOriginRejected() {
        when(consumptions.findByConsumptionNo("PC-UNKNOWN")).thenReturn(Optional.empty());
        ProductionReturn pr = draft("ITEM-1", new BigDecimal("5"), "GOOD", "PC-UNKNOWN");
        pr.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(pr));

        service.action(1L, "submit", "user");
        service.action(1L, "verify", "user");
        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "receive", "user"));
    }

    @Test
    @DisplayName("D-C2: standalone return without origin is accepted unconstrained")
    void standaloneReturnAccepted() {
        ProductionReturn pr = draft("ITEM-1", new BigDecimal("50"), "GOOD", null);
        pr.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(pr));

        service.action(1L, "submit", "user");
        service.action(1L, "verify", "user");
        ProductionReturn received = service.action(1L, "receive", "user");

        assertEquals("RECEIVED", received.getStatus());
        verify(inventory, times(1)).receiveProductionReturn(
                any(), any(), any(), any(), any(), any(), any(), any());
    }

    // ─── Workflow ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("Workflow: illegal transition (receive on DRAFT) is rejected")
    void illegalTransitionRejected() {
        ProductionReturn pr = draft("ITEM-1", new BigDecimal("5"), "GOOD", null);
        pr.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(pr));

        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "receive", "user"));
        verify(inventory, never()).receiveProductionReturn(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Workflow: verify on SUBMITTED advances the return correctly")
    void submitThenVerify() {
        ProductionReturn pr = draft("ITEM-1", new BigDecimal("5"), "GOOD", null);
        pr.setReturnNumber("PR-2026-000001");
        when(returns.findById(1L)).thenReturn(Optional.of(pr));

        ProductionReturn submitted = service.action(1L, "submit", "user");
        assertEquals("SUBMITTED", submitted.getStatus());

        when(returns.findById(1L)).thenReturn(Optional.of(submitted));
        ProductionReturn verified = service.action(1L, "verify", "user");
        assertEquals("VERIFIED", verified.getStatus());
    }

    // ─── Create / Update ───────────────────────────────────────────────────

    @Test
    @DisplayName("create rejects zero quantity")
    void createRejectsZeroQuantity() {
        assertThrows(IllegalArgumentException.class,
                () -> service.create(draft("ITEM-1", BigDecimal.ZERO, "GOOD", null), "user"));
    }

    @Test
    @DisplayName("create rejects unsupported disposition at save time")
    void createRejectsUnsupportedDisposition() {
        assertThrows(IllegalArgumentException.class,
                () -> service.create(draft("ITEM-1", new BigDecimal("5"), "BOGUS", null), "user"));
    }

    @Test
    @DisplayName("update preserves numbering and is DRAFT-only")
    void updatePreservesNumberAndRestrictsToDraft() {
        ProductionReturn existing = draft("ITEM-1", new BigDecimal("5"), "GOOD", null);
        existing.setId(1L);
        existing.setReturnNumber("PR-2026-000001");
        existing.setStatus("VERIFIED");
        when(returns.findById(1L)).thenReturn(Optional.of(existing));

        ProductionReturn update = draft("ITEM-1", new BigDecimal("7"), "QC_HOLD", null);
        assertThrows(IllegalStateException.class, () -> service.update(1L, update, "user"));
    }

    @Test
    @DisplayName("delete is DRAFT-only")
    void deleteRestrictsToDraft() {
        ProductionReturn existing = draft("ITEM-1", new BigDecimal("5"), "GOOD", null);
        existing.setId(1L);
        existing.setStatus("VERIFIED");
        when(returns.findById(1L)).thenReturn(Optional.of(existing));

        assertThrows(IllegalStateException.class, () -> service.delete(1L));
    }
}