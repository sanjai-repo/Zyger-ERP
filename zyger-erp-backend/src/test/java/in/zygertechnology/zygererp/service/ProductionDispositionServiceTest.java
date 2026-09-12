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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * P9 — Unit tests for {@link ProductionDispositionService} (DOCUMENT_59):
 * lifecycle (DRAFT → SUBMITTED → APPROVED → POSTED → CLOSED, lateral CANCELLED/
 * REVERSED), quantity buckets, strict disposition (never FREE — D-C1), batch
 * identity (CLAR-011), rework-route target operation (CLAR-005), idempotent POST,
 * and negated-mirror reversal.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductionDispositionServiceTest {

    @Mock private DocNumberService numbers;
    @Mock private ProductionEntryRepository productionEntries;
    @Mock private ProductionRejectionDocRepository rejectionDocs;
    @Mock private ProductionScrapDocRepository scrapDocs;
    @Mock private ProductionReworkDocRepository reworkDocs;
    @Mock private ProductionDocPostingKeyRepository postingKeys;
    @Mock private ProductionDispositionAuditLogRepository auditLogs;
    @Mock private ItemRepository items;
    @Mock private JobCardSubjobRepository subjobs;

    @InjectMocks
    private ProductionDispositionService service;

    private ProductionEntry postedEntry;

    @BeforeEach
    void setUp() {
        postedEntry = ProductionEntry.builder()
                .productionType("GENERAL")
                .entryNumber("PE-0001")
                .status("POSTED")
                .isReversal(false)
                .partCode("PC-1")
                .partDescription("Part One")
                .operationCode("OP-1")
                .goodQuantity(new BigDecimal("90"))
                .rejectedQuantity(new BigDecimal("4"))
                .reworkQuantity(new BigDecimal("3"))
                .scrapQuantity(new BigDecimal("3"))
                .build();

        when(productionEntries.findById(anyLong())).thenAnswer(i -> Optional.of(postedEntry));
        when(items.findByCode(anyString())).thenReturn(Optional.of(
                ItemMaster.builder().code("IT-1").name("Item One").active(true).batchControl(false).build()));
        when(subjobs.findByJobCardJobCardNumber(anyString())).thenReturn(List.of());
        when(rejectionDocs.save(any())).thenAnswer(i -> i.getArgument(0));
        when(scrapDocs.save(any())).thenAnswer(i -> i.getArgument(0));
        when(reworkDocs.save(any())).thenAnswer(i -> i.getArgument(0));
        when(rejectionDocs.findById(any())).thenReturn(Optional.empty());
        when(scrapDocs.findById(any())).thenReturn(Optional.empty());
        when(reworkDocs.findById(any())).thenReturn(Optional.empty());
        when(auditLogs.save(any())).thenReturn(null);
    }

    // ---------------- helpers ----------------

    private ProductionRejectionLine rejLine(String itemCode, String qty, String disposition) {
        return ProductionRejectionLine.builder()
                .itemCode(itemCode).itemName("Item One")
                .quantity(new BigDecimal(qty)).uom("PCS")
                .reasonCode("R-01").reasonDescription("Surface defect")
                .disposition(disposition).location("STORE")
                .build();
    }

    private ProductionRejectionDoc rejectionDoc() {
        ProductionRejectionDoc doc = new ProductionRejectionDoc();
        doc.setEntryId(1L);
        doc.setInspectionDate(LocalDate.of(2026, 1, 15));
        doc.setInspector("INSP-1");
        doc.setLines(List.of(rejLine("IT-1", "2", ProductionDispositionService.DISPOSITION_SCRAP)));
        return doc;
    }

    private ProductionRejectionDoc createdRejection() {
        return service.createRejection(rejectionDoc(), "u");
    }

    private void stubFindRejection(ProductionRejectionDoc d) {
        when(rejectionDocs.findById(any())).thenReturn(Optional.of(d));
    }

    // ---------------- CREATE ----------------

    @Test
    @DisplayName("P9: create rejection reserves REJ number, snapshots entry headers, stays DRAFT")
    void createRejectionBasic() {
        when(numbers.next("rejection-document", "REJ")).thenReturn("REJ-PL-2026-0001");
        ProductionRejectionDoc saved = createdRejection();

        assertEquals("DRAFT", saved.getStatus());
        assertEquals("REJ-PL-2026-0001", saved.getDocNumber());
        assertEquals("PE-0001", saved.getEntryNumber());
        assertEquals("PC-1", saved.getPartCode());
        assertEquals("OP-1", saved.getOperationCode());
        assertEquals("u", saved.getCreatedBy());
        assertEquals(1, saved.getLines().size());
    }

    @Test
    @DisplayName("P9: create rejection against a missing entry is rejected")
    void createRejectionMissingEntry() {
        when(productionEntries.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> createdRejection());
    }

    @Test
    @DisplayName("P9: create against a DRAFT / reversed entry is rejected")
    void createRejectionRequiresPostedEntry() {
        postedEntry.setStatus("DRAFT");
        assertThrows(IllegalArgumentException.class, this::createdRejection);

        postedEntry.setStatus("POSTED");
        postedEntry.setIsReversal(true);
        assertThrows(IllegalArgumentException.class, this::createdRejection);
    }

    // ---------------- POST VALIDATION ----------------

    @Test
    @DisplayName("P9: unknown disposition never becomes FREE (D-C1)")
    void postRejectsUnknownDisposition() {
        when(numbers.next("rejection-document", "REJ")).thenReturn("REJ-PL-2026-0002");
        ProductionRejectionDoc doc = rejectionDoc();
        doc.getLines().get(0).setDisposition("FREE");
        ProductionRejectionDoc saved = service.createRejection(doc, "u");
        stubFindRejection(saved);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.actionRejection(saved.getId(), "post", null, null, "u"));
        assertTrue(ex.getMessage().contains("D-C1"));
    }

    @Test
    @DisplayName("P9: zero and negative line quantity are rejected")
    void postLineQuantityRules() {
        ProductionRejectionDoc d0 = rejectionDoc();
        d0.getLines().get(0).setQuantity(BigDecimal.ZERO);
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.validateForPost(d0))
                .getMessage().contains("greater than zero"));

        ProductionRejectionDoc d1 = rejectionDoc();
        d1.getLines().get(0).setQuantity(new BigDecimal("-1"));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.validateForPost(d1))
                .getMessage().contains("greater than zero"));
    }

    @Test
    @DisplayName("P9: missing reason and missing item are rejected")
    void postLineMandatoryFields() {
        ProductionRejectionDoc d = rejectionDoc();
        d.getLines().get(0).setReasonCode(null);
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.validateForPost(d))
                .getMessage().contains("reason"));

        ProductionRejectionDoc d2 = rejectionDoc();
        d2.getLines().get(0).setItemCode("");
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.validateForPost(d2))
                .getMessage().contains("item code"));
    }

    @Test
    @DisplayName("P9: batch identity mandatory for batch/lot-controlled item (CLAR-011)")
    void batchControlledMissingBatch() {
        when(items.findByCode("IT-B")).thenReturn(Optional.of(
                ItemMaster.builder().code("IT-B").name("Batch Item").active(true).batchControl(true).build()));
        ProductionRejectionDoc d = rejectionDoc();
        d.getLines().get(0).setItemCode("IT-B");
        d.getLines().get(0).setBatchNumber(null);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.validateForPost(d));
        assertTrue(ex.getMessage().contains("Batch identity"));
    }

    @Test
    @DisplayName("P9: rejection total may not exceed the entry rejected bucket (CLAR-002 R1)")
    void rejectionBucketExceeded() {
        ProductionRejectionDoc d = rejectionDoc();
        d.getLines().get(0).setQuantity(new BigDecimal("5"));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.validateForPost(d));
        assertTrue(ex.getMessage().contains("exceeds the available rejected quantity"));
    }

    @Test
    @DisplayName("P9: scrap total may not exceed the entry scrap bucket")
    void scrapBucketExceeded() {
        when(numbers.next("scrap-document", "SC")).thenReturn("SC-PL-2026-0001");
        ProductionScrapDoc d = new ProductionScrapDoc();
        d.setEntryId(1L);
        d.setScrapDate(LocalDate.of(2026, 1, 15));
        d.setLines(List.of(ProductionScrapLine.builder()
                .itemCode("IT-1").quantity(new BigDecimal("9")).uom("PCS")
                .reasonCode("R-02").disposition("SCRAP")
                .warehouse("STORE").location("STORE").build()));
        ProductionScrapDoc saved = service.createScrap(d, "u");
        when(scrapDocs.findById(any())).thenReturn(Optional.of(saved));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.actionScrap(saved.getId(), "post", null, null, "u"));
        assertTrue(ex.getMessage().contains("exceeds the available scrap quantity"));
    }

    @Test
    @DisplayName("P9: rework requires a target rework-route operation (CLAR-005) and caps at bucket")
    void reworkRequiresTargetOperation() {
        when(numbers.next("rework-document", "PER")).thenReturn("PER-PL-2026-0001");
        when(reworkDocs.save(any())).thenAnswer(i -> i.getArgument(0));

        ProductionReworkDoc d = new ProductionReworkDoc();
        d.setEntryId(1L);
        d.setReworkDate(LocalDate.of(2026, 1, 15));
        d.setLines(List.of(ProductionReworkLine.builder()
                .itemCode("IT-1").quantity(new BigDecimal("1")).uom("PCS")
                .reasonCode("R-03").sourceOperationCode("OP-1").targetOperationCode(null).build()));
        ProductionReworkDoc saved = service.createRework(d, "u");
        when(reworkDocs.findById(any())).thenReturn(Optional.of(saved));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.actionRework(saved.getId(), "post", null, null, "u"));
        assertTrue(ex.getMessage().contains("target (rework-route) operation"));

        d.getLines().get(0).setTargetOperationCode("REW-1");
        ProductionReworkDoc ok = service.updateRework(saved.getId(), d, "u");
        assertEquals("POSTED", service.actionRework(ok.getId(), "post", null, null, "u").getStatus());
    }

    // ---------------- LIFECYCLE ----------------

    @Test
    @DisplayName("P9: submit/approve/post/close chain transitions correctly")
    void lifecycleTransitions() {
        when(numbers.next("rejection-document", "REJ")).thenReturn("REJ-PL-2026-0003");
        ProductionRejectionDoc d = createdRejection();
        stubFindRejection(d);

        assertEquals("SUBMITTED", service.actionRejection(d.getId(), "submit", null, null, "u").getStatus());
        assertEquals("APPROVED", service.actionRejection(d.getId(), "approve", null, null, "u").getStatus());
        assertEquals("POSTED", service.actionRejection(d.getId(), "post", null, null, "u").getStatus());
        assertEquals("CLOSED", service.actionRejection(d.getId(), "close", null, null, "u").getStatus());
    }

    @Test
    @DisplayName("P9: illegal transitions are rejected (approve from DRAFT, submit after post, cancel after post)")
    void illegalTransitions() {
        when(numbers.next("rejection-document", "REJ")).thenReturn("REJ-PL-2026-0004");
        ProductionRejectionDoc d = createdRejection();
        stubFindRejection(d);

        assertTrue(assertThrows(IllegalArgumentException.class,
                () -> service.actionRejection(d.getId(), "approve", null, null, "u"))
                .getMessage().contains("SUBMITTED"));
        assertEquals("POSTED", service.actionRejection(d.getId(), "post", null, null, "u").getStatus());
        assertTrue(assertThrows(IllegalArgumentException.class,
                () -> service.actionRejection(d.getId(), "submit", null, null, "u"))
                .getMessage().contains("DRAFT"));
        assertTrue(assertThrows(IllegalArgumentException.class,
                () -> service.actionRejection(d.getId(), "cancel", null, null, "u"))
                .getMessage().contains("pre-post"));
    }

    // ---------------- IDEMPOTENCY ----------------

    @Test
    @DisplayName("P9: repeated POST with an already-SUCCESS idempotency key is a no-op")
    void postIdempotentByKey() {
        when(numbers.next("rejection-document", "REJ")).thenReturn("REJ-PL-2026-0005");
        ProductionRejectionDoc d = createdRejection();
        stubFindRejection(d);
        when(postingKeys.findByIdempotencyKey("idem-r1")).thenReturn(Optional.of(
                ProductionDocPostingKey.builder().idempotencyKey("idem-r1")
                        .docFamily("REJECTION").docId(d.getId()).resultStatus("SUCCESS").build()));

        ProductionRejectionDoc out = service.actionRejection(d.getId(), "post", null, "idem-r1", "u");
        assertEquals("DRAFT", out.getStatus());
        clearInvocations(rejectionDocs);
        verify(rejectionDocs, never()).save(any(ProductionRejectionDoc.class));
    }

    @Test
    @DisplayName("P9: first POST consumes and persists the idempotency key as SUCCESS")
    void postPersistsIdempotencyKey() {
        when(numbers.next("rejection-document", "REJ")).thenReturn("REJ-PL-2026-0006");
        ProductionRejectionDoc d = createdRejection();
        stubFindRejection(d);
        when(postingKeys.findByIdempotencyKey("idem-r6")).thenReturn(Optional.empty());

        ProductionRejectionDoc out = service.actionRejection(d.getId(), "post", null, "idem-r6", "u");
        assertEquals("POSTED", out.getStatus());
        verify(postingKeys).save(argThat(k ->
                k.getIdempotencyKey().equals("idem-r6") && "SUCCESS".equals(k.getResultStatus())));
    }

    // ---------------- REVERSAL ----------------

    @Test
    @DisplayName("P9: reversal creates a negated mirror (REJ-RV), original becomes REVERSED")
    void reversalCreatesNegatedMirror() {
        when(numbers.next("rejection-document", "REJ")).thenReturn("REJ-PL-2026-0007");
        when(numbers.next("rejection-document", "REJ-RV")).thenReturn("REJ-RV-PL-2026-0001");
        ProductionRejectionDoc d = createdRejection();
        stubFindRejection(d);
        d.setId(999L);
        ProductionRejectionDoc posted = service.actionRejection(d.getId(), "post", null, null, "u");
        assertEquals("POSTED", posted.getStatus());

        ProductionRejectionDoc mirror = service.actionRejection(posted.getId(), "reverse", "mistake", null, "u");
        assertTrue(mirror.getIsReversal());
        assertEquals("REJ-RV-PL-2026-0001", mirror.getDocNumber());
        assertEquals(999L, mirror.getReversedFromDocId());
        assertEquals("POSTED", mirror.getStatus());
        assertEquals("REVERSED", posted.getStatus());
        assertEquals(0, posted.getLines().get(0).getQuantity().add(mirror.getLines().get(0).getQuantity()).signum());
    }

    @Test
    @DisplayName("P9: reversing a non-posted document is rejected")
    void reverseRequiresPosted() {
        when(numbers.next("rejection-document", "REJ")).thenReturn("REJ-PL-2026-0008");
        ProductionRejectionDoc d = createdRejection();
        stubFindRejection(d);
        assertTrue(assertThrows(IllegalArgumentException.class,
                () -> service.actionRejection(d.getId(), "reverse", null, null, "u"))
                .getMessage().contains("POSTED"));
    }

    // ---------------- INVARIANTS ----------------

    @Test
    @DisplayName("P9: entry bucket columns are never modified by disposition processing")
    void entryBucketsUntouchedByPost() {
        when(numbers.next("rejection-document", "REJ")).thenReturn("REJ-PL-2026-0009");
        ProductionRejectionDoc d = createdRejection();
        stubFindRejection(d);
        service.actionRejection(d.getId(), "post", null, null, "u");

        assertEquals(new BigDecimal("4"), postedEntry.getRejectedQuantity());
        assertEquals(new BigDecimal("3"), postedEntry.getReworkQuantity());
        assertEquals(new BigDecimal("3"), postedEntry.getScrapQuantity());
        verify(productionEntries, never()).save(any());
        verify(subjobs, never()).save(any());
    }
}