package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.StockAllotment;
import in.zygertechnology.zygererp.entity.DocEntity;
import in.zygertechnology.zygererp.entity.JobCard;
import in.zygertechnology.zygererp.entity.ProdReqMaterial;
import in.zygertechnology.zygererp.entity.ProdReqMaterialLine;
import in.zygertechnology.zygererp.repo.JobCardRepository;
import in.zygertechnology.zygererp.repo.ProdReqMaterialLineRepository;
import in.zygertechnology.zygererp.repo.ProdReqMaterialRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductionMaterialRequestServiceTest {

    @Mock private ProdReqMaterialRepository requests;
    @Mock private ProdReqMaterialLineRepository requestLines;
    @Mock private JobCardRepository jobCards;
    @Mock private DocNumberService numbers;
    @Mock private WorkflowStateMachine stateMachine;
    @Mock private DocumentFacade documents;
    @Mock private EntityManager em;

    private ProductionMaterialRequestService service;
    private final WorkflowStateMachine realStateMachine = new WorkflowStateMachine();

    private JobCard releasedJobCard;
    private ProdReqMaterial draft;

    @BeforeEach
    void setUp() {
        service = new ProductionMaterialRequestService(
                requests, requestLines, jobCards, numbers, realStateMachine, documents);
        ReflectionTestUtils.setField(service, "em", em);
        releasedJobCard = JobCard.builder()
                .id(10L).jobCardNumber("JC-100").workOrderNumber("WO-99")
                .status("RELEASED").build();
        ProdReqMaterialLine line = ProdReqMaterialLine.builder()
                .itemCode("RM-001").requiredQty(BigDecimal.valueOf(10))
                .issuedQty(BigDecimal.ZERO).storeCode("MAIN").uom("KG")
                .build();
        List<ProdReqMaterialLine> lines = new ArrayList<>();
        lines.add(line);
        draft = ProdReqMaterial.builder()
                .jobCardId(10L).reqDate(java.time.LocalDate.now())
                .lines(lines).build();
    }

    @Test
    @DisplayName("Creating a valid draft assigns authoritative number + binds lines")
    void testCreateAssignsNumber() {
        when(jobCards.findById(10L)).thenReturn(Optional.of(releasedJobCard));
        when(numbers.next("material-request")).thenReturn("PM-2026-0001");
        when(requests.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProdReqMaterial saved = service.save(draft, "operator");
        assertEquals("PM-2026-0001", saved.getReqNo());
        assertEquals("JC-100", saved.getJobCardNumber());
        assertEquals("DRAFT", saved.getStatus());
        assertEquals(1, saved.getLines().size());
        assertSame(saved, saved.getLines().get(0).getRequest());
    }

    @Test
    @DisplayName("Creation requires at least one line")
    void testCreateRejectsNoLines() {
        assertThrows(IllegalArgumentException.class,
                () -> service.save(ProdReqMaterial.builder().jobCardId(10L).build(), "operator"));
    }

    @Test
    @DisplayName("Creation requires a job card production reference")
    void testCreateRejectsNoJobCard() {
        assertThrows(IllegalArgumentException.class,
                () -> service.save(ProdReqMaterial.builder().lines(List.of(lineByQty(5))).build(), "operator"));
    }

    @Test
    @DisplayName("Creation requires a released/in-progress job card")
    void testCreateRejectsUnreleasedJobCard() {
        JobCard pending = JobCard.builder().id(11L).status("PENDING").build();
        when(jobCards.findById(11L)).thenReturn(Optional.of(pending));
        ProdReqMaterial m = ProdReqMaterial.builder().jobCardId(11L)
                .lines(List.of(lineByQty(5))).build();
        assertThrows(IllegalStateException.class, () -> service.save(m, "operator"));
    }

    @Test
    @DisplayName("Creating a draft with non-positive required quantity is rejected")
    void testCreateRejectsZeroRequiredQty() {
        when(jobCards.findById(10L)).thenReturn(Optional.of(releasedJobCard));
        ProdReqMaterialLine bad = ProdReqMaterialLine.builder()
                .itemCode("RM-X").requiredQty(BigDecimal.ZERO).build();
        ProdReqMaterial m = ProdReqMaterial.builder().jobCardId(10L).lines(List.of(bad)).build();
        assertThrows(IllegalArgumentException.class, () -> service.save(m, "operator"));
    }

    @Test
    @DisplayName("Editing a non-DRAFT request is rejected")
    void testEditRejectsNonDraft() {
        ProdReqMaterial existing = ProdReqMaterial.builder().id(7L).reqNo("PM-2026-0001").status("SUBMITTED").build();
        when(requests.findById(7L)).thenReturn(Optional.of(existing));
        ProdReqMaterial edit = ProdReqMaterial.builder().id(7L)
                .jobCardId(10L).lines(List.of(lineByQty(3))).build();
        assertThrows(IllegalStateException.class, () -> service.save(edit, "operator"));
    }

    @Test
    @DisplayName("ISSUE creates an approved reservation allotment (Effect.NONE) — NO physical stock deduction")
    void testIssueDelegatesToAllotment() {
        ProdReqMaterial approved = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0005").jobCardId(10L).status("APPROVED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1")))
                .build();
        when(requests.findById(1L)).thenReturn(Optional.of(approved));
        when(requests.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Mock: no existing reservation
        stubReservationExists("PM-2026-0005", 0L);
        // Mock: allotment creation
        DocEntity allotment = mock(DocEntity.class);
        when(allotment.getId()).thenReturn(99L);
        when(documents.create(eq("stock-allotment"), any(), eq("operator"))).thenReturn(allotment);

        ProdReqMaterial result = service.action(1L, "ISSUE", "operator");

        // Verify allotment was created and approved (reservation, NO physical OUT)
        verify(documents, times(1)).create(eq("stock-allotment"), any(), eq("operator"));
        verify(documents, times(1)).action(eq("stock-allotment"), eq(99L), eq("approve"), anyString(), eq("operator"));
        assertEquals("ISSUED", result.getStatus());
        assertNotNull(result.getIssuedAt());
    }

    @Test
    @DisplayName("ISSUE is rejected when the reservation check fails (fail-closed on database error)")
    void testIssueFailsClosedWhenReservationCheckErrors() {
        ProdReqMaterial approved = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0005").jobCardId(10L).status("APPROVED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1")))
                .build();
        when(requests.findById(1L)).thenReturn(Optional.of(approved));
        // DB failure on the reservation existence query
        TypedQuery<Long> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Long.class))).thenReturn(query);
        when(query.setParameter(eq("reqNo"), eq("PM-2026-0005"))).thenReturn(query);
        when(query.getSingleResult()).thenThrow(new jakarta.persistence.PersistenceException("connection lost"));

        // Must propagate — a DB error is NOT "no reservation exists"
        assertThrows(jakarta.persistence.PersistenceException.class, () -> service.action(1L, "ISSUE", "operator"));
        // No allotment created, no approve, no status advance (transaction rolls back)
        verify(documents, never()).create(anyString(), any(), anyString());
        verify(documents, never()).action(anyString(), anyLong(), anyString(), anyString(), anyString());
        verify(requests, never()).save(argThat(x -> "ISSUED".equals(x.getStatus())));
    }

    @Test
    @DisplayName("Duplicate ISSUE on already-ISSUED request is rejected by state machine (no duplicate allotment)")
    void testDuplicateIssueRejectedByStateMachine() {
        ProdReqMaterial issued = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0005").jobCardId(10L).status("ISSUED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1"))).build();
        when(requests.findById(1L)).thenReturn(Optional.of(issued));
        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "ISSUE", "operator"));
        verify(documents, never()).create(anyString(), any(), anyString());
        verify(documents, never()).action(anyString(), anyLong(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("ISSUE skips allotment creation when reservation already exists (belt-and-suspenders idempotency)")
    void testReservationExistsSkipsCreation() {
        ProdReqMaterial approved = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0005").jobCardId(10L).status("APPROVED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1")))
                .build();
        when(requests.findById(1L)).thenReturn(Optional.of(approved));
        when(requests.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Mock: existing APPROVED reservation already present
        stubReservationExists("PM-2026-0005", 1L);

        ProdReqMaterial result = service.action(1L, "ISSUE", "operator");

        // Must NOT create a new allotment
        verify(documents, never()).create(anyString(), any(), anyString());
        verify(documents, never()).action(anyString(), anyLong(), anyString(), anyString(), anyString());
        assertEquals("ISSUED", result.getStatus());
    }

    @Test
    @DisplayName("Issue is rejected when issued qty exceeds required qty")
    void testIssueRejectsOverIssue() {
        ProdReqMaterial approved = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0005").jobCardId(10L).status("APPROVED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.valueOf(20), null)))
                .build();
        approved.getLines().get(0).setRequiredQty(BigDecimal.TEN);
        when(requests.findById(1L)).thenReturn(Optional.of(approved));
        stubReservationExists("PM-2026-0005", 0L);
        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "ISSUE", "operator"));
        verify(documents, never()).create(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Issue is rejected when no line has a positive issued quantity (no empty reservation)")
    void testIssueRejectsZeroIssuedAllLines() {
        ProdReqMaterial approved = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0005").jobCardId(10L).status("APPROVED")
                .lines(List.of(lineByQty(10)))
                .build();
        when(requests.findById(1L)).thenReturn(Optional.of(approved));
        stubReservationExists("PM-2026-0005", 0L);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.action(1L, "ISSUE", "operator"));
        assertTrue(ex.getMessage().contains("at least one line"));
        verify(documents, never()).create(anyString(), any(), anyString());
        verify(documents, never()).action(anyString(), anyLong(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("INVALID transition is rejected via state machine; no allotment created")
    void testInvalidTransitionRejected() {
        ProdReqMaterial issued = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0005").jobCardId(10L).status("ISSUED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1"))).build();
        when(requests.findById(1L)).thenReturn(Optional.of(issued));
        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "ISSUE", "operator"));
        verify(documents, never()).create(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Delete only allowed for DRAFT")
    void testDeleteOnlyDraft() {
        ProdReqMaterial posted = ProdReqMaterial.builder().id(2L).status("ISSUED").build();
        when(requests.findById(2L)).thenReturn(Optional.of(posted));
        assertThrows(IllegalStateException.class, () -> service.delete(2L));
        verify(requests, never()).delete(any());
    }

    // ── P6.4 (D2) cancel/close reservation-release tests ───────────────────

    @Test
    @DisplayName("D2: CANCEL before ISSUE (from APPROVED) — no reservation exists, no release action")
    void testCancelBeforeIssueNoReservation() {
        ProdReqMaterial approved = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0006").jobCardId(10L).status("APPROVED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1"))).build();
        when(requests.findById(1L)).thenReturn(Optional.of(approved));
        when(documents.findAll("stock-allotment")).thenReturn(new ArrayList<>());
        when(requests.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProdReqMaterial result = service.action(1L, "CANCEL", "operator");

        assertEquals("CANCELLED", result.getStatus());
        verify(documents, never()).action(eq("stock-allotment"), anyLong(), eq("post"), anyString(), anyString());
    }

    @Test
    @DisplayName("D2: CANCEL after ISSUE with APPROVED reservation — release posts allotment, no create, no physical OUT")
    void testCancelAfterIssueReleasesReservation() {
        ProdReqMaterial issued = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0006").jobCardId(10L).status("ISSUED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1"))).build();
        StockAllotment sa = new StockAllotment();
        sa.setId(50L);
        sa.setStatus("APPROVED");
        sa.setReferenceNo("PM-2026-0006");
        when(requests.findById(1L)).thenReturn(Optional.of(issued));
        when(documents.findAll("stock-allotment")).thenReturn(new java.util.ArrayList<>(List.of(sa)));
        when(requests.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProdReqMaterial result = service.action(1L, "CANCEL", "operator");

        assertEquals("CANCELLED", result.getStatus());
        // Reservation released via existing allotment post (P6.2 mechanism — Effect.NONE)
        verify(documents, times(1)).action(eq("stock-allotment"), eq(50L), eq("post"), anyString(), eq("operator"));
        // No new allotment creation on cancel
        verify(documents, never()).create(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("D2: CLOSE after ISSUE with remaining reservation — reservation released once")
    void testCloseReleasesRemainingReservation() {
        ProdReqMaterial issued = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0006").jobCardId(10L).status("ISSUED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1"))).build();
        StockAllotment sa = new StockAllotment();
        sa.setId(50L);
        sa.setStatus("APPROVED");
        sa.setReferenceNo("PM-2026-0006");
        when(requests.findById(1L)).thenReturn(Optional.of(issued));
        when(documents.findAll("stock-allotment")).thenReturn(new java.util.ArrayList<>(List.of(sa)));
        when(requests.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProdReqMaterial result = service.action(1L, "CLOSE", "operator");

        assertEquals("CLOSED", result.getStatus());
        verify(documents, times(1)).action(eq("stock-allotment"), eq(50L), eq("post"), anyString(), eq("operator"));
        verify(documents, never()).create(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("D2: CLOSE when reservation already released (fully consumed) — no duplicate release action")
    void testCloseFullyConsumedNoDuplicateRelease() {
        ProdReqMaterial issued = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0006").jobCardId(10L).status("ISSUED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1"))).build();
        // Only non-matching (POSTED or different reference) allotments exist
        StockAllotment posted = new StockAllotment();
        posted.setId(60L);
        posted.setStatus("POSTED");
        posted.setReferenceNo("PM-2026-0006");
        StockAllotment other = new StockAllotment();
        other.setId(61L);
        other.setStatus("APPROVED");
        other.setReferenceNo("PM-2026-OTHER");
        when(requests.findById(1L)).thenReturn(Optional.of(issued));
        when(documents.findAll("stock-allotment")).thenReturn(new java.util.ArrayList<>(List.of(posted, other)));
        when(requests.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProdReqMaterial result = service.action(1L, "CLOSE", "operator");

        assertEquals("CLOSED", result.getStatus());
        verify(documents, never()).action(eq("stock-allotment"), anyLong(), eq("post"), anyString(), anyString());
    }

    @Test
    @DisplayName("D2: repeated CLOSE on already-CLOSED request is rejected by state machine (no double release)")
    void testDuplicateCloseRejectedByStateMachine() {
        ProdReqMaterial closed = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0006").jobCardId(10L).status("CLOSED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1"))).build();
        when(requests.findById(1L)).thenReturn(Optional.of(closed));
        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "CLOSE", "operator"));
        verify(documents, never()).action(eq("stock-allotment"), anyLong(), eq("post"), anyString(), anyString());
    }

    @Test
    @DisplayName("D2: reservation release failure rolls back the lifecycle transition (no status change, no partial release)")
    void testReservationReleaseFailureRollsBackTransition() {
        ProdReqMaterial issued = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0006").jobCardId(10L).status("ISSUED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1"))).build();
        StockAllotment sa = new StockAllotment();
        sa.setId(50L);
        sa.setStatus("APPROVED");
        sa.setReferenceNo("PM-2026-0006");
        when(requests.findById(1L)).thenReturn(Optional.of(issued));
        when(documents.findAll("stock-allotment")).thenReturn(new java.util.ArrayList<>(List.of(sa)));
        // Posting the allotment fails (e.g. already posted / requireStatus violation)
        when(documents.action(eq("stock-allotment"), eq(50L), eq("post"), anyString(), anyString()))
                .thenThrow(new IllegalStateException("Action not allowed in status"));

        assertThrows(IllegalStateException.class, () -> service.action(1L, "CLOSE", "operator"));
        // Status must remain ISSUED — the transition never reached save
        assertEquals("ISSUED", issued.getStatus());
        verify(requests, never()).save(argThat(x -> "CLOSED".equals(x.getStatus())));
    }

    @Test
    @DisplayName("D2: CLOSE does not create any physical inventory OUT (allotment post only, Effect.NONE)")
    void testCloseDoesNotCreatePhysicalOut() {
        ProdReqMaterial issued = ProdReqMaterial.builder()
                .id(1L).reqNo("PM-2026-0006").jobCardId(10L).status("ISSUED")
                .lines(List.of(lineWithIssued("RM-001", BigDecimal.TEN, "B1"))).build();
        when(requests.findById(1L)).thenReturn(Optional.of(issued));
        when(documents.findAll("stock-allotment")).thenReturn(new ArrayList<>());
        when(requests.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.action(1L, "CLOSE", "operator");

        // No StockLedger writes are ever attempted by the request service
        verify(documents, never()).action(eq("stock-allotment"), anyLong(), eq("post"), anyString(), anyString());
        verify(requests, atLeastOnce()).save(any());
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private void stubReservationExists(String reqNo, Long count) {
        TypedQuery<Long> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Long.class))).thenReturn(query);
        when(query.setParameter(eq("reqNo"), eq(reqNo))).thenReturn(query);
        when(query.getSingleResult()).thenReturn(count);
    }

    private static ProdReqMaterialLine lineByQty(int qty) {
        return ProdReqMaterialLine.builder()
                .itemCode("RM-001").requiredQty(BigDecimal.valueOf(qty))
                .issuedQty(BigDecimal.ZERO).build();
    }

    private static ProdReqMaterialLine lineWithIssued(String item, BigDecimal issued, String batch) {
        return ProdReqMaterialLine.builder()
                .itemCode(item).requiredQty(BigDecimal.valueOf(100))
                .issuedQty(issued).batchNumber(batch).storeCode("MAIN")
                .build();
    }
}
