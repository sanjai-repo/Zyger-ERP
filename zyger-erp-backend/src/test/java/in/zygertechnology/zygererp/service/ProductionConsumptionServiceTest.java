package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.DocEntity;
import in.zygertechnology.zygererp.entity.JobCard;
import in.zygertechnology.zygererp.entity.ProductionConsumption;
import in.zygertechnology.zygererp.entity.ProductionConsumptionLine;
import in.zygertechnology.zygererp.entity.StockAllotment;
import in.zygertechnology.zygererp.repo.JobCardRepository;
import in.zygertechnology.zygererp.repo.ProductionConsumptionLineRepository;
import in.zygertechnology.zygererp.repo.ProductionConsumptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductionConsumptionServiceTest {

    @Mock private ProductionConsumptionRepository consumptions;
    @Mock private ProductionConsumptionLineRepository consumptionLines;
    @Mock private JobCardRepository jobCards;
    @Mock private DocNumberService numbers;
    @Mock private StockService stockService;
    @Mock private DocumentFacade documents;

    private ProductionConsumptionService service;
    private final WorkflowStateMachine stateMachine = new WorkflowStateMachine();

    @BeforeEach
    void setUp() {
        service = new ProductionConsumptionService(
                consumptions, consumptionLines, jobCards, numbers, stockService, stateMachine, documents);
    }

    @Test
    @DisplayName("Creating a valid draft assigns number and binds lines")
    void testCreateAssignsNumber() {
        JobCard jc = JobCard.builder().id(5L).jobCardNumber("JC-5").workOrderNumber("WO-1").status("IN_PROGRESS").build();
        when(jobCards.findById(5L)).thenReturn(Optional.of(jc));
        when(numbers.next("production-consumption")).thenReturn("PC-2026-0001");
        when(consumptions.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProductionConsumption saved = service.save(completion().id(null).jobCardId(5L).build(), "operator");

        assertEquals("PC-2026-0001", saved.getConsumptionNo());
        assertEquals("JC-5", saved.getJobCardNumber());
        assertEquals("DRAFT", saved.getStatus());
        assertEquals(1, saved.getLines().size());
    }

    @Test
    @DisplayName("Zero/negative consumed quantity is rejected")
    void testCreateRejectsZeroConsumed() {
        JobCard jc = JobCard.builder().id(5L).status("RELEASED").build();
        when(jobCards.findById(5L)).thenReturn(Optional.of(jc));
        ProductionConsumption c = completion().jobCardId(5L).build();
        c.getLines().get(0).setConsumedQty(BigDecimal.ZERO);
        assertThrows(IllegalArgumentException.class, () -> service.save(c, "operator"));
    }

    @Test
    @DisplayName("Consumed quantity exceeding issued quantity is rejected")
    void testRejectsOverConsumption() {
        JobCard jc = JobCard.builder().id(5L).status("RELEASED").build();
        when(jobCards.findById(5L)).thenReturn(Optional.of(jc));
        ProductionConsumption c = completion().jobCardId(5L).build();
        c.getLines().get(0).setIssuedQty(BigDecimal.TEN);
        c.getLines().get(0).setConsumedQty(BigDecimal.valueOf(20));
        assertThrows(IllegalArgumentException.class, () -> service.save(c, "operator"));
    }

    @Test
    @DisplayName("Creating a consumption requires a job card")
    void testCreateRejectsNoJobCard() {
        assertThrows(IllegalArgumentException.class, () -> service.save(completion().jobCardId(null).build(), "operator"));
    }

    @Test
    @DisplayName("POST releases the reservation allotment, then performs the single physical OUT")
    void testPostDelegatesToStockService() {
        ProductionConsumption submitted = completion()
                .id(1L).consumptionNo("PC-2026-0001").status("SUBMITTED")
                .materialRequestNo("PM-2026-0001").build();
        when(consumptions.findById(1L)).thenReturn(Optional.of(submitted));
        when(consumptions.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StockAllotment allotment = new StockAllotment();
        allotment.setId(50L);
        allotment.setDocNo("SA-2026-0001");
        allotment.setStatus("APPROVED");
        allotment.setReferenceNo("PM-2026-0001");
        when(documents.findAll("stock-allotment")).thenReturn(List.of(allotment));

        ProductionConsumption result = service.action(1L, "POST", "operator");

        // Step 1: reservation posted (Effect.NONE — clears reservation, no physical movement)
        verify(documents, times(1)).action(eq("stock-allotment"), eq(50L), eq("post"), anyString(), eq("operator"));
        // Step 2: single physical OUT (one per line; per-line key ensures later lines
        // on the same consumption are not dropped by StockService's (docNo, docType) dedupe)
        verify(stockService, times(1)).recordStockOut(eq("PC-2026-0001-L1"), eq("production-consumption"),
                eq("PRODUCTION_CONSUMPTION"), eq("RM-001"), any(), any(), isNull(),
                eq(BigDecimal.valueOf(8)), any(), eq("operator"), eq(false));
        assertEquals("POSTED", result.getStatus());
        assertNotNull(result.getPostedAt());
    }

    @Test
    @DisplayName("POST records one distinct physical OUT per line (multi-line consumption not collapsed by doc-level idempotency)")
    void testPostOneOutPerLineWithDistinctKeys() {
        ProductionConsumptionLine line1 = ProductionConsumptionLine.builder()
                .id(11L).itemCode("RM-001").consumedQty(BigDecimal.valueOf(5))
                .location("MAIN").build();
        ProductionConsumptionLine line2 = ProductionConsumptionLine.builder()
                .id(12L).itemCode("RM-002").consumedQty(BigDecimal.valueOf(3))
                .location("MAIN").build();
        ProductionConsumption submitted = completion()
                .id(1L).consumptionNo("PC-2026-0001").status("SUBMITTED")
                .materialRequestNo(null).lines(List.of(line1, line2)).build();
        when(consumptions.findById(1L)).thenReturn(Optional.of(submitted));
        when(consumptions.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.action(1L, "POST", "operator");

        // Two OUT rows, each with a per-line idempotency key (StockService dedupes on
        // (docNo, docType); a shared doc number would silently drop the second line).
        verify(stockService, times(1)).recordStockOut(eq("PC-2026-0001-11"), eq("production-consumption"),
                eq("PRODUCTION_CONSUMPTION"), eq("RM-001"), any(), any(), isNull(),
                eq(BigDecimal.valueOf(5)), any(), eq("operator"), eq(false));
        verify(stockService, times(1)).recordStockOut(eq("PC-2026-0001-12"), eq("production-consumption"),
                eq("PRODUCTION_CONSUMPTION"), eq("RM-002"), any(), any(), isNull(),
                eq(BigDecimal.valueOf(3)), any(), eq("operator"), eq(false));
    }

    @Test
    @DisplayName("POST without a material request reference skips the release step (no allotment to clear)")
    void testPostSkipsReleaseWhenNoMaterialRequest() {
        ProductionConsumption submitted = completion()
                .id(1L).consumptionNo("PC-2026-0001").status("SUBMITTED")
                .materialRequestNo(null).build();
        when(consumptions.findById(1L)).thenReturn(Optional.of(submitted));
        when(consumptions.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.action(1L, "POST", "operator");

        verify(documents, never()).action(anyString(), anyLong(), anyString(), anyString(), anyString());
        verify(stockService, times(1)).recordStockOut(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    @DisplayName("INVALID POST transition is rejected via state machine; no release, no movement")
    void testPostRejectsNonSubmitted() {
        ProductionConsumption draft = completion().id(1L).consumptionNo("PC-2026-0001").status("DRAFT")
                .materialRequestNo("PM-2026-0001").build();
        when(consumptions.findById(1L)).thenReturn(Optional.of(draft));
        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "POST", "operator"));
        verify(documents, never()).action(anyString(), anyLong(), anyString(), anyString(), anyString());
        verify(stockService, never()).recordStockOut(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    @DisplayName("Repeated POST on an already POSTED consumption is blocked (no double movement)")
    void testRepeatedPostGuard() {
        ProductionConsumption posted = completion().id(1L).status("POSTED").build();
        when(consumptions.findById(1L)).thenReturn(Optional.of(posted));
        assertThrows(IllegalArgumentException.class, () -> service.action(1L, "POST", "operator"));
        verify(stockService, never()).recordStockOut(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    @DisplayName("Delete only allowed for DRAFT")
    void testDeleteOnlyDraft() {
        ProductionConsumption c = completion().id(2L).status("POSTED").build();
        when(consumptions.findById(2L)).thenReturn(Optional.of(c));
        assertThrows(IllegalStateException.class, () -> service.delete(2L));
        verify(consumptions, never()).delete(any());
    }

    private static ProductionConsumption.ProductionConsumptionBuilder completion() {
        ProductionConsumptionLine line = ProductionConsumptionLine.builder()
                .itemCode("RM-001").issuedQty(BigDecimal.valueOf(10))
                .consumedQty(BigDecimal.valueOf(8)).location("MAIN")
                .build();
        List<ProductionConsumptionLine> lines = new ArrayList<>();
        lines.add(line);
        return ProductionConsumption.builder().lines(lines);
    }
}