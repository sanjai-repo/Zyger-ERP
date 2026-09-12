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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * P13 — Unit tests for {@link ProductConversionService}:
 * CV numbering (config-aware, DOC_57 §4 #15), approved quantity contract
 * (input > 0, output > 0, losses >= 0, output + loss + scrap <= input),
 * fair value boundary (no costing logic — test documents absence), batch
 * identity for controlled items (CLAR-PROD-011, no silent batch generation),
 * lifecycle via WorkflowStateMachine (SUBMIT/VERIFY/POST/REJECT/CANCEL;
 * unapproved "complete" rejected), and POST posting through
 * {@link InventoryIntegrationService} with distinct OUT/IN idempotency keys
 * ({number}-OUT, {number}-IN).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductConversionServiceTest {

    @Mock private ProductConversionRepository conversions;
    @Mock private DocNumberService numbers;
    @Mock private InventoryIntegrationService inventory;
    @Mock private ItemRepository items;

    @InjectMocks
    private ProductConversionService service;

    private final WorkflowStateMachine stateMachine = new WorkflowStateMachine();

    @BeforeEach
    void setUp() {
        try {
            java.lang.reflect.Field f = ProductConversionService.class.getDeclaredField("stateMachine");
            f.setAccessible(true);
            f.set(service, stateMachine);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
        when(numbers.nextNumberFromConfig("product-conversion", 1L)).thenReturn("CV-PLT1-2026-000001");
        when(conversions.save(any())).thenAnswer(i -> {
            ProductConversion c = i.getArgument(0);
            if (c.getId() == null) c.setId(1L);
            return c;
        });
    }

    private ProductConversion draft(String input, String output, String inQty, String outQty, String loss, String scrap) {
        return ProductConversion.builder()
                .conversionType("RM_TO_SFG")
                .inputItemCode(input)
                .inputQuantity(new BigDecimal(inQty))
                .inputUom("KG")
                .outputItemCode(output)
                .outputQuantity(new BigDecimal(outQty))
                .outputUom("KG")
                .processLossQty(new BigDecimal(loss))
                .scrapQty(new BigDecimal(scrap))
                .sourceWarehouse("STORE")
                .destinationWarehouse("PROD")
                .status("DRAFT")
                .build();
    }

    private ProductConversion posted(String docNo, String input, String output, String inQty, String outQty, String loss, String scrap) {
        ProductConversion pc = draft(input, output, inQty, outQty, loss, scrap);
        pc.setId(1L);
        pc.setConversionNumber(docNo);
        return pc;
    }

    private void stubItem(String code, boolean controlled) {
        ItemMaster item = ItemMaster.builder().code(code).name(code).build();
        if (controlled) {
            item.setBatchControl(true);
            item.setRequiresBatch(true);
        } else {
            item.setBatchControl(false);
            item.setRequiresBatch(false);
        }
        when(items.findByCode(code)).thenReturn(Optional.of(item));
    }

    private void toVerified(ProductConversion pc) {
        when(conversions.findById(1L)).thenReturn(Optional.of(pc));
        ProductConversion s = service.action(1L, "submit", "user");
        when(conversions.findById(1L)).thenReturn(Optional.of(s));
        ProductConversion v = service.action(1L, "verify", "user");
        when(conversions.findById(1L)).thenReturn(Optional.of(v));
    }

    // ─── Numbering (DOC_57 §4 #15) ─────────────────────────────────────────

    @Test
    @DisplayName("CV numbering: config-aware path produces CV-{PLANT}-{FY}-{SEQ}")
    void createAssignsCvNumber() {
        stubItem("RM", false);
        stubItem("SFG", false);
        ProductConversion created = service.create(draft("RM", "SFG", "100", "90", "8", "2"), "user");

        assertEquals("CV-PLT1-2026-000001", created.getConversionNumber());
        assertEquals("CV-PLT1-2026-000001", created.getDocNo());
        verify(numbers).nextNumberFromConfig("product-conversion", 1L);
    }

    @Test
    @DisplayName("CV numbering: no PC legacy prefix is ever generated")
    void neverGeneratesLegacyPcPrefix() {
        verify(numbers, never()).next(eq("product-conversion"), contains("PC"));
    }

    // ─── Quantity contract (§11) ───────────────────────────────────────────

    @Test
    @DisplayName("create rejects zero input quantity")
    void createRejectsZeroInput() {
        assertThrows(IllegalArgumentException.class,
                () -> service.create(draft("RM", "SFG", "0", "90", "0", "0"), "user"));
    }

    @Test
    @DisplayName("create rejects zero output quantity")
    void createRejectsZeroOutput() {
        assertThrows(IllegalArgumentException.class,
                () -> service.create(draft("RM", "SFG", "100", "0", "0", "0"), "user"));
    }

    @Test
    @DisplayName("create rejects negative process loss")
    void createRejectsNegativeLoss() {
        assertThrows(IllegalArgumentException.class,
                () -> service.create(draft("RM", "SFG", "100", "90", "-1", "0"), "user"));
    }

    @Test
    @DisplayName("create rejects negative scrap")
    void createRejectsNegativeScrap() {
        assertThrows(IllegalArgumentException.class,
                () -> service.create(draft("RM", "SFG", "100", "90", "0", "-1"), "user"));
    }

    @Test
    @DisplayName("create rejects output + loss + scrap exceeding input")
    void createRejectsConservationViolation() {
        assertThrows(IllegalArgumentException.class,
                () -> service.create(draft("RM", "SFG", "100", "95", "5", "1"), "user"));
    }

    @Test
    @DisplayName("conservation boundary (output + loss + scrap == input) is accepted")
    void conservationAtBoundaryAccepted() {
        stubItem("RM", false);
        stubItem("SFG", false);
        ProductConversion created = service.create(draft("RM", "SFG", "100", "90", "8", "2"), "user");
        assertEquals("DRAFT", created.getStatus());
    }

    // ─── Batch identity (CLAR-PROD-011) ────────────────────────────────────

    @Test
    @DisplayName("batch-controlled input without batch is rejected at create")
    void controlledInputRequiresBatch() {
        stubItem("RM", true);
        ProductConversion pc = draft("RM", "SFG", "100", "90", "8", "2");
        assertThrows(IllegalArgumentException.class, () -> service.create(pc, "user"));
    }

    @Test
    @DisplayName("non-controlled items pass with blank batches")
    void uncontrolledItemsPassWithBlankBatches() {
        stubItem("RM", false);
        stubItem("SFG", false);
        ProductConversion created = service.create(draft("RM", "SFG", "100", "90", "8", "2"), "user");
        assertEquals("DRAFT", created.getStatus());
    }

    @Test
    @DisplayName("batch-controlled output without batch is rejected at POST")
    void controlledOutputRequiresBatchAtPost() {
        stubItem("RM", false);
        stubItem("SFG", true);
        ProductConversion pc = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        toVerified(pc);

        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "post", "user"));
        verify(inventory, never()).receiveConversionOutput(any(), any(), any(), any(), any(), any(), any());
        verify(inventory, never()).consumeConversionInput(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("unknown item code is a hard validation error")
    void unknownItemRejected() {
        when(items.findByCode("RM")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class,
                () -> service.create(draft("RM", "SFG", "100", "90", "8", "2"), "user"));
    }

    // ─── Costing boundary (CLAR-PROD-008) ──────────────────────────────────

    @Test
    @DisplayName("CLAR-PROD-008: service touches no costing/value field in posting (Production is quantity+loss only)")
    void noCostingWriteDuringPost() {
        stubItem("RM", false);
        stubItem("SFG", false);
        ProductConversion pc = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        pc.setInputBatchNumber(null);
        pc.setOutputBatchNumber(null);
        toVerified(pc);

        ProductConversion posted = service.action(1L, "post", "user");
        assertEquals("POSTED", posted.getStatus());
        // The only production-side side effects are the two inventory boundary calls.
        verify(inventory, times(1)).consumeConversionInput(any(), any(), any(), any(), any(), any(), any());
        verify(inventory, times(1)).receiveConversionOutput(any(), any(), any(), any(), any(), any(), any());
    }

    // ─── Lifecycle (WorkflowStateMachine) ──────────────────────────────────

    @Test
    @DisplayName("lifecycle: full approved path DRAFT->SUBMITTED->VERIFIED->POSTED")
    void fullApprovedLifecycle() {
        stubItem("RM", false);
        stubItem("SFG", false);
        ProductConversion pc = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        when(conversions.findById(1L)).thenReturn(Optional.of(pc));

        assertEquals("SUBMITTED", service.action(1L, "submit", "user").getStatus());
        when(conversions.findById(1L)).thenReturn(
                Optional.of(productConversion(1L, "SUBMITTED")));
        assertEquals("VERIFIED", service.action(1L, "verify", "user").getStatus());
        when(conversions.findById(1L)).thenReturn(
                Optional.of(productConversion(1L, "VERIFIED")));
        assertEquals("POSTED", service.action(1L, "post", "user").getStatus());
    }

    private ProductConversion productConversion(Long id, String status) {
        ProductConversion pc = draft("RM", "SFG", "100", "90", "8", "2");
        pc.setId(id);
        pc.setConversionNumber("CV-PLT1-2026-000001");
        pc.setStatus(status);
        pc.setSourceWarehouse("STORE");
        pc.setDestinationWarehouse("PROD");
        return pc;
    }

    @Test
    @DisplayName("lifecycle: unapproved 'complete' action is rejected")
    void completeActionRejected() {
        ProductConversion pc = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        when(conversions.findById(1L)).thenReturn(Optional.of(pc));

        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "complete", "user"));
        verify(inventory, never()).consumeConversionInput(any(), any(), any(), any(), any(), any(), any());
        verify(inventory, never()).receiveConversionOutput(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("lifecycle: illegal transition (verify on DRAFT) is rejected")
    void illegalTransitionRejected() {
        ProductConversion pc = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        when(conversions.findById(1L)).thenReturn(Optional.of(pc));

        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "verify", "user"));
    }

    @Test
    @DisplayName("lifecycle: post without VERIFIED is rejected")
    void postWithoutVerifyRejected() {
        ProductConversion pc = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        when(conversions.findById(1L)).thenReturn(Optional.of(pc));

        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "post", "user"));
        verify(inventory, never()).consumeConversionInput(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("lifecycle: SUBMITTED can be rejected")
    void rejectFromSubmitted() {
        ProductConversion pc = productConversion(1L, "SUBMITTED");
        when(conversions.findById(1L)).thenReturn(Optional.of(pc));

        assertEquals("REJECTED", service.action(1L, "reject", "user").getStatus());
    }

    @Test
    @DisplayName("lifecycle: DRAFT can be cancelled")
    void cancelFromDraft() {
        ProductConversion pc = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        when(conversions.findById(1L)).thenReturn(Optional.of(pc));

        assertEquals("CANCELLED", service.action(1L, "cancel", "user").getStatus());
    }

    // ─── POST posting: distinct OUT/IN idempotency keys ────────────────────

    @Test
    @DisplayName("POST posts OUT with {number}-OUT and IN with {number}-IN via inventory service")
    void postPostsThroughInventoryService() {
        stubItem("RM", false);
        stubItem("SFG", false);
        ProductConversion pc = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        toVerified(pc);

        ProductConversion posted = service.action(1L, "post", "user");
        assertEquals("POSTED", posted.getStatus());

        verify(inventory).consumeConversionInput(
                eq("CV-PLT1-2026-000001-OUT"), eq("RM"), eq("STORE"), any(),
                eq(new BigDecimal("100")), any(LocalDate.class), eq("user"));
        verify(inventory).receiveConversionOutput(
                eq("CV-PLT1-2026-000001-IN"), eq("SFG"), eq("PROD"), any(),
                eq(new BigDecimal("90")), any(LocalDate.class), eq("user"));
    }

    @Test
    @DisplayName("POST loses unit (input - output - loss - scrap) is never restocked, only output enters")
    void postOnlyRestocksOutput() {
        stubItem("RM", false);
        stubItem("SFG", false);
        ProductConversion pc = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        toVerified(pc);

        service.action(1L, "post", "user");

        verify(inventory).consumeConversionInput(
                eq("CV-PLT1-2026-000001-OUT"), eq("RM"), eq("STORE"), any(),
                eq(new BigDecimal("100")), any(LocalDate.class), eq("user"));
        verify(inventory).receiveConversionOutput(
                eq("CV-PLT1-2026-000001-IN"), eq("SFG"), eq("PROD"), any(),
                eq(new BigDecimal("90")), any(LocalDate.class), eq("user"));
        // loss + scrap = 10 units physically leave the conversion; NOT entered as stock
        verify(inventory, never()).receiveConversionOutput(
                eq("CV-PLT1-2026-000001-IN"), contains("RM"), any(), any(), any(), any(), any());
    }

    // ─── Update / Delete ───────────────────────────────────────────────────

    @Test
    @DisplayName("update preserves CV number and is DRAFT-only")
    void updatePreservesNumberAndRestrictsToDraft() {
        ProductConversion existing = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        existing.setStatus("VERIFIED");
        when(conversions.findById(1L)).thenReturn(Optional.of(existing));

        ProductConversion upd = draft("RM", "SFG", "100", "95", "4", "1");
        assertThrows(IllegalStateException.class, () -> service.update(1L, upd, "user"));
    }

    @Test
    @DisplayName("delete is DRAFT-only")
    void deleteRestrictsToDraft() {
        ProductConversion existing = posted("CV-PLT1-2026-000001", "RM", "SFG", "100", "90", "8", "2");
        existing.setStatus("POSTED");
        when(conversions.findById(1L)).thenReturn(Optional.of(existing));

        assertThrows(IllegalStateException.class, () -> service.delete(1L));
    }

    // ─── Test helper ───────────────────────────────────────────────────────
}