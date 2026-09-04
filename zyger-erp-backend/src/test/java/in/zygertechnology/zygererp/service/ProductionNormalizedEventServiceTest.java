package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.config.ProductionNormalizedOpsProperties;
import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.ProdExecutionSessionRepository;
import in.zygertechnology.zygererp.repo.ProdOperationEventRepository;
import in.zygertechnology.zygererp.repo.ProdOutputEventRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * P3 — ProductionNormalizedEventService unit tests (gate: projection consistency,
 * quantity reconciliation, feature flag ON/OFF, event uniqueness/idempotency,
 * reverse preservation, retry/double-submit idempotency, WIP never negative).
 *
 * <p>All rule-critical behaviors are exercised against mocks so they run fast and
 * deterministically. NOTE: a {@link org.springframework.dao.DataIntegrityViolationException}
 * from a duplicate natural key must be ABSORBED (never rolls back the authoritative
 * write), while genuine projection errors must propagate (P3-02 atomicity).</p>
 */
@ExtendWith(MockitoExtension.class)
class ProductionNormalizedEventServiceTest {

    @Mock
    private ProductionNormalizedOpsProperties properties;
    @Mock
    private ProdExecutionSessionRepository sessionRepo;
    @Mock
    private ProdOperationEventRepository operationRepo;
    @Mock
    private ProdOutputEventRepository outputRepo;

    private ProductionNormalizedEventService svc() {
        return new ProductionNormalizedEventService(properties, sessionRepo, operationRepo, outputRepo,
                new ProductionInputAuthorityResolver());
    }

    private ProductionEntry entry() {
        return ProductionEntry.builder()
                .entryNumber("PE-100")
                .jobCardNumber("JC-1")
                .workOrderNumber("WO-1")
                .subjobNumber("SUB-1")
                .partCode("P-1")
                .partDescription("Part One")
                .operationCode("OP-10")
                .operationSequence(5)
                .machineCode("M-1")
                .operatorCode("O-1")
                .processQty(new BigDecimal("100.0000"))
                .goodQuantity(new BigDecimal("85.0000"))
                .rejectedQuantity(new BigDecimal("5.0000"))
                .reworkQuantity(new BigDecimal("6.0000"))
                .scrapQuantity(new BigDecimal("2.0000"))
                .status("DRAFT")
                .startTime(Instant.parse("2026-09-01T08:00:00Z"))
                .createdAt(Instant.parse("2026-09-01T08:00:00Z"))
                .build();
    }

    private ProdExecutionSession seededSession(String entryNumber) {
        return ProdExecutionSession.builder().id(1L).entryNumber(entryNumber).build();
    }

    @Test
    @DisplayName("flag OFF -> project() is a strict no-op (P3-07)")
    void flagOffIsNoOp() {
        when(properties.isEnabled()).thenReturn(false);
        ProductionNormalizedEventService s = svc();
        ProductionEntry e = entry();
        s.project(e, ProductionNormalizedEventService.EventKind.CREATE, "u1");
        s.project(e, ProductionNormalizedEventService.EventKind.POST, "u1");
        s.project(e, ProductionNormalizedEventService.EventKind.REVERSE, "u1");
        verifyNoInteractions(sessionRepo, operationRepo, outputRepo);
    }

    @Test
    @DisplayName("CREATE projects an OPEN session + IN_PROGRESS operation, no premature outputs")
    void createProjection() {
        when(properties.isEnabled()).thenReturn(true);
        when(sessionRepo.findByEntryNumber("PE-100")).thenReturn(Optional.empty());
        ProdExecutionSession saved = new ProdExecutionSession();
        saved.setId(7L);
        when(sessionRepo.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        when(operationRepo.findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(operationRepo.saveAndFlush(any())).thenAnswer(i -> {
            ProdOperationEvent op = i.getArgument(0);
            op.setId(9L);
            return op;
        });

        ProductionNormalizedEventService s = svc();
        s.project(entry(), ProductionNormalizedEventService.EventKind.CREATE, "u1");

        // session captured with OPEN status
        org.mockito.ArgumentCaptor<ProdExecutionSession> sc = org.mockito.ArgumentCaptor.forClass(ProdExecutionSession.class);
        verify(sessionRepo).saveAndFlush(sc.capture());
        assertEquals("OPEN", sc.getValue().getSessionStatus());
        assertEquals(0, new BigDecimal("100.0000").compareTo(sc.getValue().getAvailableInput()));
        // WIP = input - outputs = 100 - (85+5+6+2) = 2
        assertEquals(0, new BigDecimal("2.0000").compareTo(sc.getValue().getWip()));

        // operation captured
        org.mockito.ArgumentCaptor<ProdOperationEvent> oc = org.mockito.ArgumentCaptor.forClass(ProdOperationEvent.class);
        verify(operationRepo).saveAndFlush(oc.capture());
        assertEquals("IN_PROGRESS", oc.getValue().getOperationStatus());
        assertEquals("OP-10", oc.getValue().getOperationCode());
        assertEquals(Integer.valueOf(5), oc.getValue().getSeq());

        // NO output events on CREATE
        verifyNoInteractions(outputRepo);
    }

    @Test
    @DisplayName("POST finalizes session COMPLETED + operation COMPLETED + 4 output events from good/reject/rework/scrap")
    void postProjectionMapsOutputs() {
        when(properties.isEnabled()).thenReturn(true);
        ProdExecutionSession existing = new ProdExecutionSession();
        existing.setId(7L);
        existing.setEntryNumber("PE-100");
        when(sessionRepo.findByEntryNumber("PE-100")).thenReturn(Optional.of(existing));

        ProdOperationEvent op = new ProdOperationEvent();
        op.setId(9L);
        when(operationRepo.findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(operationRepo.saveAndFlush(any())).thenAnswer(i -> {
            ProdOperationEvent o = i.getArgument(0);
            o.setId(9L);
            return o;
        });

        when(outputRepo.findBySessionIdAndOperationEventIdAndOutputTypeAndItemCodeAndLocation(any(), any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(outputRepo.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        ProductionNormalizedEventService s = svc();
        s.project(entry(), ProductionNormalizedEventService.EventKind.POST, "u1");

        // updated session status COMPLETED
        assertEquals("COMPLETED", existing.getSessionStatus());
        assertEquals(0, new BigDecimal("2.0000").compareTo(existing.getWip()));

        // operation status COMPLETED
        org.mockito.ArgumentCaptor<ProdOperationEvent> oc = org.mockito.ArgumentCaptor.forClass(ProdOperationEvent.class);
        verify(operationRepo).saveAndFlush(oc.capture());
        assertEquals("COMPLETED", oc.getValue().getOperationStatus());

        // exactly 4 output rows: ACCEPTED 85, REJECTED 5, REWORK 6, SCRAP 2
        assertEquals(4, mockingDetails(outputRepo).getInvocations().stream()
                .filter(i -> i.getMethod().getName().equals("saveAndFlush")).count());
    }

    @Test
    @DisplayName("re-emission by natural key is idempotent — no duplicate output rows (P3-03, retry/double-submit)")
    void reEmissionIsIdempotentForOutputs() {
        when(properties.isEnabled()).thenReturn(true);
        ProdExecutionSession existing = new ProdExecutionSession();
        existing.setId(7L);
        when(sessionRepo.findByEntryNumber("PE-100")).thenReturn(Optional.of(existing));
        ProdOperationEvent op = new ProdOperationEvent();
        op.setId(9L);
        when(operationRepo.findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(7L, "SUB-1", "OP-10", 5))
                .thenReturn(Optional.of(op));
        // every output already projected -> putOutput skips insert
        when(outputRepo.findBySessionIdAndOperationEventIdAndOutputTypeAndItemCodeAndLocation(
                eq(7L), eq(9L), anyString(), eq("P-1"), eq("STORE"))).thenReturn(Optional.of(new ProdOutputEvent()));

        ProductionNormalizedEventService s = svc();
        s.project(entry(), ProductionNormalizedEventService.EventKind.POST, "u1");

        // second retry with identical natural key
        s.project(entry(), ProductionNormalizedEventService.EventKind.POST, "u1");

        verify(outputRepo, never()).saveAndFlush(any());
        verify(operationRepo, times(2)).save(any());
        verify(sessionRepo, times(2)).save(any());
    }

    @Test
    @DisplayName("DataIntegrityViolation (duplicate natural key) is absorbed, never thrown (P3-03)")
    void duplicateNaturalKeyAbsorbed() {
        when(properties.isEnabled()).thenReturn(true);
        ProdExecutionSession winner = new ProdExecutionSession();
        winner.setId(7L);
        // first find: empty -> tries to insert -> concurrent writer won -> unique violation
        // re-find on catch: the winning (concurrent) row is now present
        when(sessionRepo.findByEntryNumber("PE-100")).thenReturn(Optional.empty(), Optional.of(winner));
        when(sessionRepo.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("dup"));

        ProductionNormalizedEventService s = svc();
        assertDoesNotThrow(() -> s.project(entry(), ProductionNormalizedEventService.EventKind.POST, "u1"));
        assertEquals(7L, winner.getId());
    }

    @Test
    @DisplayName("REVERSE preserves original history and creates a negated CANCELLED/REVERSED mirror (P3-06)")
    void reverseCreatesMirrorAndPreservesOriginal() {
        when(properties.isEnabled()).thenReturn(true);
        // The reversal entry has its own entry_number and negated quantities.
        ProductionEntry reversal = ProductionEntry.builder()
                .entryNumber("PE-REV-200")
                .jobCardNumber("JC-1")
                .workOrderNumber("WO-1")
                .subjobNumber("SUB-1")
                .partCode("P-1")
                .operationCode("OP-10")
                .operationSequence(5)
                .processQty(new BigDecimal("-100.0000"))
                .goodQuantity(new BigDecimal("-85.0000"))
                .rejectedQuantity(new BigDecimal("-5.0000"))
                .reworkQuantity(new BigDecimal("-6.0000"))
                .scrapQuantity(new BigDecimal("-2.0000"))
                .status("POSTED")
                .isReversal(true)
                .reversedFromEntryId(1L)
                .build();

        ProdExecutionSession existing = new ProdExecutionSession();
        existing.setId(21L);
        when(sessionRepo.findByEntryNumber("PE-REV-200")).thenReturn(Optional.of(existing));
        ProdOperationEvent op = new ProdOperationEvent();
        op.setId(31L);
        when(operationRepo.findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(operationRepo.saveAndFlush(any())).thenAnswer(i -> {
            ProdOperationEvent o = i.getArgument(0);
            o.setId(31L);
            return o;
        });
        when(outputRepo.findBySessionIdAndOperationEventIdAndOutputTypeAndItemCodeAndLocation(any(), any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(outputRepo.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        ProductionNormalizedEventService s = svc();
        s.project(reversal, ProductionNormalizedEventService.EventKind.REVERSE, "u1");

        // mirror session status CANCELLED; negated accepted output preserved; original untouched
        assertEquals("CANCELLED", existing.getSessionStatus());
        assertEquals(0, new BigDecimal("-85.0000").compareTo(existing.getAcceptedOutput()));

        org.mockito.ArgumentCaptor<ProdOperationEvent> oc = org.mockito.ArgumentCaptor.forClass(ProdOperationEvent.class);
        verify(operationRepo).saveAndFlush(oc.capture());
        assertEquals("REVERSED", oc.getValue().getOperationStatus());
    }

    @Test
    @DisplayName("quantity reconciliation mapping: available_input=processQty (NOT good), outputs, wip never negative (P3-04)")
    void quantityReconciliationMapping() {
        when(properties.isEnabled()).thenReturn(true);
        ProdExecutionSession existing = new ProdExecutionSession();
        existing.setId(7L);
        when(sessionRepo.findByEntryNumber("PE-100")).thenReturn(Optional.of(existing));
        ProdOperationEvent op = new ProdOperationEvent();
        op.setId(9L);
        when(operationRepo.findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(any(), any(), any(), any()))
                .thenReturn(Optional.of(op));
        when(outputRepo.findBySessionIdAndOperationEventIdAndOutputTypeAndItemCodeAndLocation(any(), any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(outputRepo.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        // produced_quantity is an ALIAS of process_qty: authoritative input is processQty.
        ProductionEntry e = entry();
        e.setProducedQuantity(new BigDecimal("100.0000")); // alias
        ProductionNormalizedEventService s = svc();
        s.project(e, ProductionNormalizedEventService.EventKind.POST, "u1");

        assertNotEquals(e.getGoodQuantity(), existing.getAvailableInput(), "input MUST NOT be good quantity");
        assertEquals(0, new BigDecimal("100.0000").compareTo(existing.getAvailableInput()));
        // wip = 100 - 98 = 2 (>= 0)
        assertEquals(0, new BigDecimal("2.0000").compareTo(existing.getWip()));
        assertTrue(existing.getWip().signum() >= 0);
    }

    @Test
    @DisplayName("flag OFF -> read-only lookups return empty (P3-07)")
    void flagOffReadsEmpty() {
        when(properties.isEnabled()).thenReturn(false);
        ProductionNormalizedEventService s = svc();
        assertTrue(s.findSessionByEntryNumber("PE-100").isEmpty());
        assertTrue(s.findSessionsByJobCard("JC-1").isEmpty());
        verifyNoInteractions(sessionRepo);
    }
}