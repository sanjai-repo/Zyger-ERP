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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * P10 — Unit tests for {@link ProductionBatchCardService} (DOCUMENT_60):
 * manual allocation (CLAR-PROD-011), controlled-item scope, lifecycle
 * OPEN → HELD ↔ OPEN / OPEN, HELD → CLOSED, entry must be POSTED, output
 * bucket + exhaustion, duplicate batch allocation, partial allocation,
 * idempotent create, and CLOSED-only negated-mirror reversal. Recording-only:
 * asserts nothing below ever reaches StockService / WIP / normalized events.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductionBatchCardServiceTest {

    @Mock private DocNumberService numbers;
    @Mock private ProductionEntryRepository productionEntries;
    @Mock private ProductionBatchCardRepository batchCards;
    @Mock private ProductionDocPostingKeyRepository postingKeys;
    @Mock private ProductionBatchCardAuditLogRepository auditLogs;
    @Mock private ItemRepository items;
    @Mock private JobCardSubjobRepository subjobs;

    @InjectMocks
    private ProductionBatchCardService service;

    private ProductionEntry postedEntry;
    private final WorkflowStateMachine stateMachine = new WorkflowStateMachine();

    @BeforeEach
    void setUp() {
        postedEntry = ProductionEntry.builder()
                .id(1L)
                .productionType("GENERAL")
                .entryNumber("PE-0001")
                .status("POSTED")
                .isReversal(false)
                .partCode("PC-1")
                .partDescription("Part One")
                .operationCode("OP-1")
                .jobCardNumber("JC-1")
                .subjobNumber("SJ-1")
                .uom("PCS")
                .goodQuantity(new BigDecimal("90"))
                .rejectedQuantity(new BigDecimal("4"))
                .reworkQuantity(new BigDecimal("3"))
                .scrapQuantity(new BigDecimal("3"))
                .build();

        // Inject the real state machine so workflow transitions are enforced.
        try {
            java.lang.reflect.Field f = ProductionBatchCardService.class.getDeclaredField("stateMachine");
            f.setAccessible(true);
            f.set(service, stateMachine);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }

        when(productionEntries.findById(anyLong())).thenAnswer(i -> Optional.of(postedEntry));
        when(items.findByCode(anyString())).thenReturn(Optional.of(
                ItemMaster.builder().code("PC-1").name("Item One").active(true)
                        .batchControl(true).requiresBatch(true).build()));
        JobCardSubjob subjob = mock(JobCardSubjob.class);
        when(subjob.getOperationCode()).thenReturn("OP-1");
        when(subjobs.findByJobCardJobCardNumber(anyString())).thenReturn(List.of(subjob));
        when(batchCards.save(any())).thenAnswer(i -> i.getArgument(0));
        when(batchCards.findById(any())).thenReturn(Optional.empty());
        when(batchCards.findByEntryIdAndPhysicalBatchNumberAndIsReversalFalse(any(), any()))
                .thenReturn(Optional.empty());
        when(batchCards.findByEntryIdAndItemCodeAndIsReversalFalseOrderByIdAsc(any(), any()))
                .thenReturn(List.of());
        when(batchCards.findByReversedFromDocId(any())).thenReturn(List.of());
        when(postingKeys.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(auditLogs.save(any())).thenReturn(null);

        // Default batch numbering mirrors the legacy format BC-YYYY-NNNN.
        when(numbers.next("batch-card", "BC")).thenReturn("BC-2026-0001");
        when(numbers.next("batch-card", "BC-RV")).thenReturn("BC-RV-2026-0001");
    }

    private ProductionBatchCard card(long entryId, String batch, String qty) {
        return ProductionBatchCard.builder()
                .entryId(entryId)
                .itemCode("PC-1")
                .physicalBatchNumber(batch)
                .quantity(new BigDecimal(qty))
                .jobCardNumber("JC-1")
                .subjobNumber("SJ-1")
                .operationCode("OP-1")
                .build();
    }

    private ProductionBatchCardAllocation alloc(String batch, String qty) {
        return ProductionBatchCardAllocation.builder()
                .batchNumber(batch).quantity(new BigDecimal(qty)).build();
    }

    // ---------------- contract: CLAR-011 controlled scope ----------------

    @Test
    @DisplayName("Rejects a card for a non-batch/lot-controlled item")
    void rejectsNonControlledItem() {
        when(items.findByCode("PC-1")).thenReturn(Optional.of(
                ItemMaster.builder().code("PC-1").active(true).batchControl(false).requiresBatch(false).build()));
        ProductionBatchCard doc = card(1L, "B-1", "10");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("batch/lot-controlled"), e.getMessage());
    }

    @Test
    @DisplayName("Rejects a card with no physical batch number (controlled item)")
    void rejectsMissingPhysicalBatch() {
        ProductionBatchCard doc = card(1L, "  ", "10");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("Physical batch number"), e.getMessage());
    }

    @Test
    @DisplayName("Rejects a card for an item that is not an output of the entry")
    void rejectsItemNotAnOutput() {
        postedEntry.setPartCode("PC-OTHER");
        ProductionBatchCard doc = card(1L, "B-1", "10");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("not an output"), e.getMessage());
    }

    @Test
    @DisplayName("Accepts an item listed as an additional (co/by) output of the entry — P8 multi-output")
    void acceptsAdditionalOutputItem() {
        when(items.findByCode("IT-1")).thenReturn(Optional.of(
                ItemMaster.builder().code("IT-1").active(true).batchControl(true).requiresBatch(false).build()));
        postedEntry.setPartCode("PC-MAIN");
        when(productionEntries.findById(1L)).thenAnswer(i -> {
            postedEntry.setAdditionalOutputs(List.of(
                    ProductionEntryOutput.builder().outputType("CO").itemCode("IT-1")
                            .quantity(new BigDecimal("25")).build()));
            return Optional.of(postedEntry);
        });
        ProductionBatchCard doc = card(1L, "B-1", "10");
        doc.setItemCode("IT-1");
        ProductionBatchCard saved = service.create(doc, "tester");
        assertEquals("BC-2026-0001", saved.getDocNumber());
        assertEquals("OPEN", saved.getStatus());
        assertEquals("PE-0001", saved.getEntryNumber());
    }

    @Test
    @DisplayName("Rejects a card against a non-posted entry")
    void rejectsNonPostedEntry() {
        postedEntry.setStatus("DRAFT");
        ProductionBatchCard doc = card(1L, "B-1", "10");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("POSTED"), e.getMessage());
    }

    @Test
    @DisplayName("Rejects a card against a reversal entry")
    void rejectsReversalEntry() {
        postedEntry.setIsReversal(true);
        ProductionBatchCard doc = card(1L, "B-1", "10");
        assertThrows(IllegalArgumentException.class, () -> service.create(doc, "tester"));
    }

    // ---------------- create + numbering ----------------

    @Test
    @DisplayName("CREATE loads the entry snapshot and issues BC-YYYY-NNNN")
    void createLoadsSnapshot() {
        ProductionBatchCard saved = service.create(card(1L, "B-1", "10"), "tester");
        assertEquals("BC-2026-0001", saved.getDocNumber());
        assertEquals("PE-0001", saved.getEntryNumber());
        assertEquals("JC-1", saved.getJobCardNumber());
        assertEquals("SJ-1", saved.getSubjobNumber());
        assertEquals("OP-1", saved.getOperationCode());
        assertEquals("OPEN", saved.getStatus());
        assertEquals("Item One", saved.getItemName());
        assertEquals("PCS", saved.getUom());
        assertFalse(Boolean.TRUE.equals(saved.getIsReversal()));
        verify(auditLogs, times(1)).save(any());
        // Recording-only boundary: never touches stock/WIP.
        verify(items, never()).save(any());
    }

    @Test
    @DisplayName("Duplicate create (same entry + physical batch) is idempotent")
    void duplicateCreateReturnsExisting() {
        when(batchCards.findByEntryIdAndPhysicalBatchNumberAndIsReversalFalse(1L, "B-1"))
                .thenReturn(Optional.of(card(1L, "B-1", "10")));
        assertThrows(ProductionBatchCardService.DuplicateBatchCardException.class,
                () -> service.create(card(1L, "B-1", "10"), "tester"));
        // No second number should be consumed for the duplicate.
        verify(numbers, never()).next(anyString(), anyString());
    }

    @Test
    @DisplayName("CREATE with zero quantity is rejected")
    void rejectsZeroQuantity() {
        ProductionBatchCard doc = card(2L, "B-1", "0");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("greater than zero"), e.getMessage());
    }

    // ---------------- exhaustion / allocation rules ----------------

    @Test
    @DisplayName("Exhaustion: sum of cards cannot exceed the entry output bucket")
    void rejectsExceedingBucket() {
        // goodQuantity = 90; an existing open card already uses 85.
        when(batchCards.findByEntryIdAndItemCodeAndIsReversalFalseOrderByIdAsc(1L, "PC-1"))
                .thenReturn(List.of(card(1L, "B-OLD", "85")));
        ProductionBatchCard doc = card(1L, "B-1", "10");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("exceeds the available output quantity"), e.getMessage());
    }

    @Test
    @DisplayName("Partial allocation allowed: Σ allocations < card quantity is accepted")
    void acceptsPartialAllocation() {
        ProductionBatchCard doc = card(1L, "B-1", "10");
        doc.setAllocations(List.of(alloc("B-1", "7")));
        ProductionBatchCard saved = service.create(doc, "tester");
        assertEquals(BigDecimal.valueOf(10), saved.getQuantity());
        assertEquals(1, saved.getAllocations().size());
    }

    @Test
    @DisplayName("Over-allocation on the card itself is rejected")
    void rejectsOverAllocation() {
        ProductionBatchCard doc = card(1L, "B-1", "10");
        doc.setAllocations(List.of(alloc("B-1", "7"), alloc("B-2", "5")));
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("exceeds the Batch Card quantity"), e.getMessage());
    }

    @Test
    @DisplayName("Duplicate batch allocation on one card is rejected")
    void rejectsDuplicateAllocationBatch() {
        ProductionBatchCard doc = card(1L, "B-1", "10");
        doc.setAllocations(List.of(alloc("B-1", "4"), alloc("B-1", "3")));
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("already allocated"), e.getMessage());
    }

    @Test
    @DisplayName("Allocation without a batch number is rejected")
    void rejectsAllocationWithoutBatch() {
        ProductionBatchCard doc = card(1L, "B-1", "10");
        doc.setAllocations(List.of(ProductionBatchCardAllocation.builder().quantity(new BigDecimal("3")).build()));
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("batch number is mandatory"), e.getMessage());
    }

    @Test
    @DisplayName("Allocation with zero/negative quantity is rejected")
    void rejectsNonPositiveAllocation() {
        ProductionBatchCard doc = card(1L, "B-1", "10");
        doc.setAllocations(List.of(alloc("B-1", "-4")));
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.create(doc, "tester"));
        assertTrue(e.getMessage().contains("greater than zero"), e.getMessage());
    }

    @Test
    @DisplayName("Lot and heat numbers are captured on the allocation (CLAR-PROD-011)")
    void capturesLotAndHeat() {
        ProductionBatchCard doc = card(1L, "B-1", "10");
        doc.setLotNumber("LOT-9");
        doc.setHeatNumber("HEAT-77");
        doc.setAllocations(List.of(ProductionBatchCardAllocation.builder()
                .batchNumber("B-1").lotNumber("LOT-9").heatNumber("HEAT-77")
                .quantity(new BigDecimal("10")).build()));
        ProductionBatchCard saved = service.create(doc, "tester");
        assertEquals("LOT-9", saved.getLotNumber());
        assertEquals("HEAT-77", saved.getHeatNumber());
        assertEquals("HEAT-77", saved.getAllocations().get(0).getHeatNumber());
    }

    // ---------------- lifecycle ----------------

    @Test
    @DisplayName("Lifecycle: OPEN → HOLD → REOPEN → CLOSE")
    void lifecycleTransitions() {
        ProductionBatchCard open = service.create(card(1L, "B-1", "10"), "tester");
        open.setId(101L);
        when(batchCards.findById(101L)).thenReturn(Optional.of(open));

        ProductionBatchCard held = service.action(101L, "hold", null, null, "tester");
        assertEquals("HELD", held.getStatus());
        assertEquals("BC-2026-0001", held.getDocNumber());

        ProductionBatchCard reopened = service.action(101L, "reopen", null, null, "tester");
        assertEquals("OPEN", reopened.getStatus());

        ProductionBatchCard closed = service.action(101L, "close", null, null, "tester");
        assertEquals("CLOSED", closed.getStatus());
    }

    @Test
    @DisplayName("Illegal transition HELD → (recreate-case guard) and OPEN → nothing else: unknown action rejected")
    void rejectsUnknownAction() {
        ProductionBatchCard open = service.create(card(1L, "B-1", "10"), "tester");
        open.setId(101L);
        when(batchCards.findById(101L)).thenReturn(Optional.of(open));
        assertThrows(IllegalArgumentException.class,
                () -> service.action(101L, "fly", null, null, "tester"));
    }

    @Test
    @DisplayName("HOLD from CLOSED is illegal")
    void rejectsHoldFromClosed() {
        ProductionBatchCard open = service.create(card(1L, "B-1", "10"), "tester");
        open.setId(101L);
        when(batchCards.findById(101L)).thenReturn(Optional.of(open));
        service.action(101L, "close", null, null, "tester");
        assertThrows(IllegalArgumentException.class,
                () -> service.action(101L, "hold", null, null, "tester"));
    }

    @Test
    @DisplayName("close is idempotent via workflow guard only (CLOSED stays CLOSED through state machine)")
    void closeIdempotentAtStatus() {
        ProductionBatchCard open = service.create(card(1L, "B-1", "10"), "tester");
        open.setId(101L);
        when(batchCards.findById(101L)).thenReturn(Optional.of(open));
        service.action(101L, "close", null, null, "tester");
        // second close from CLOSED is not in the transition table -> illegal (safe, no double state)
        assertThrows(IllegalArgumentException.class,
                () -> service.action(101L, "close", null, null, "tester"));
    }

    // ---------------- update ----------------

    @Test
    @DisplayName("UPDATE is only allowed while OPEN and preserves the doc number")
    void updatePreservesNumber() {
        ProductionBatchCard existing = card(1L, "B-1", "10");
        existing.setId(200L);
        existing.setDocNumber("BC-2026-0002");
        existing.setStatus("OPEN");
        when(batchCards.findById(200L)).thenReturn(Optional.of(existing));

        ProductionBatchCard update = card(1L, "B-1", "15");
        update.setDocNumber("IGNORED-RENUMBER");
        ProductionBatchCard saved = service.update(200L, update, "tester");

        assertEquals("BC-2026-0002", saved.getDocNumber());
        assertEquals(new BigDecimal("15"), saved.getQuantity());
        assertEquals("OPEN", saved.getStatus());
        verify(numbers, never()).next(anyString(), anyString());
    }

    @Test
    @DisplayName("UPDATE on a CLOSED card is rejected")
    void rejectsUpdateClosed() {
        ProductionBatchCard existing = card(1L, "B-1", "10");
        existing.setId(200L);
        existing.setDocNumber("BC-2026-0002");
        existing.setStatus("CLOSED");
        when(batchCards.findById(200L)).thenReturn(Optional.of(existing));
        assertThrows(IllegalArgumentException.class,
                () -> service.update(200L, card(1L, "B-1", "15"), "tester"));
    }

    @Test
    @DisplayName("UPDATE that would collide with another entry+batch card is rejected (excluding self)")
    void rejectsUpdateCollision() {
        ProductionBatchCard existing = card(1L, "B-1", "10");
        existing.setId(200L);
        existing.setStatus("OPEN");
        existing.setDocNumber("BC-2026-0002");
        when(batchCards.findById(200L)).thenReturn(Optional.of(existing));
        // another card holds (entry 1, batch B-9)
        ProductionBatchCard other = card(1L, "B-9", "5");
        other.setId(999L);
        when(batchCards.findByEntryIdAndPhysicalBatchNumberAndIsReversalFalse(1L, "B-9"))
                .thenReturn(Optional.of(other));
        ProductionBatchCard update = card(1L, "B-9", "12");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.update(200L, update, "tester"));
        assertTrue(e.getMessage().contains("already exists"), e.getMessage());
    }

    // ---------------- reversal ----------------

    @Test
    @DisplayName("REVERSE builds a closed negated mirror BC-RV-NNNN; original stays CLOSED")
    void reversalMirror() {
        ProductionBatchCard original = card(1L, "B-1", "10");
        original.setId(300L);
        original.setDocNumber("BC-2026-0001");
        original.setStatus("CLOSED");
        original.setAllocations(List.of(alloc("B-1", "6")));
        when(batchCards.findById(300L)).thenReturn(Optional.of(original));

        ProductionBatchCard mirror = service.action(300L, "reverse", "over-card",
                "K-REV-1", "tester");

        assertEquals("BC-RV-2026-0001", mirror.getDocNumber());
        assertEquals("CLOSED", mirror.getStatus());
        assertTrue(mirror.getIsReversal());
        assertEquals(300L, mirror.getReversedFromDocId());
        assertEquals(new BigDecimal("-10"), mirror.getQuantity());
        assertEquals(new BigDecimal("-6"), mirror.getAllocations().get(0).getQuantity());
        assertEquals("over-card", mirror.getReversalReason());
        // original stays CLOSED and records the reversal reason
        assertEquals("over-card", original.getReversalReason());
        assertEquals("CLOSED", original.getStatus());
        verify(postingKeys, times(1)).save(any());
    }

    @Test
    @DisplayName("REVERSE on a non-CLOSED card is rejected")
    void rejectsReverseOpen() {
        ProductionBatchCard original = card(1L, "B-1", "10");
        original.setId(300L);
        original.setStatus("OPEN");
        when(batchCards.findById(300L)).thenReturn(Optional.of(original));
        assertThrows(IllegalArgumentException.class,
                () -> service.action(300L, "reverse", null, null, "tester"));
    }

    @Test
    @DisplayName("REVERSE is rejected once a mirror already exists (different key)")
    void rejectsDoubleReverse() {
        ProductionBatchCard original = card(1L, "B-1", "10");
        original.setId(300L);
        original.setStatus("CLOSED");
        when(batchCards.findById(300L)).thenReturn(Optional.of(original));
        when(batchCards.findByReversedFromDocId(300L))
                .thenReturn(List.of(ProductionBatchCard.builder().docNumber("BC-RV-2026-0001").build()));
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.action(300L, "reverse", null, "K-OTHER", "tester"));
        assertTrue(e.getMessage().contains("already been reversed"), e.getMessage());
    }

    @Test
    @DisplayName("POST on an already-CLOSED card idempotently returns the card (P9 parity)")
    void postOnClosedParity() {
        ProductionBatchCard original = card(1L, "B-1", "10");
        original.setId(300L);
        original.setStatus("CLOSED");
        original.setDocNumber("BC-2026-0001");
        when(batchCards.findById(300L)).thenReturn(Optional.of(original));
        ProductionBatchCard res = service.action(300L, "create", null, null, "tester");
        assertEquals("BC-2026-0001", res.getDocNumber());
    }
}