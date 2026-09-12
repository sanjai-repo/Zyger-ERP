package in.zygertechnology.zygererp.production.service;

import in.zygertechnology.zygererp.production.dto.ProductionEntryDTO;
import in.zygertechnology.zygererp.production.entity.OperationExecutionEvent;
import in.zygertechnology.zygererp.production.repository.OperationExecutionEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Guard-rail tests for the isolated production entry stub. The stub persists no
 * legacy-table / stock rows, but must never write negative quantities into the
 * new {@code prod_operation_execution_event} table (quantity-integrity invariant).
 */
@ExtendWith(MockitoExtension.class)
class ProductionEntryApplicationServiceTest {

    @Mock
    private OperationExecutionEventRepository repository;

    private ProductionEntryApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ProductionEntryApplicationService(repository);
    }

    private ProductionEntryDTO valid() {
        ProductionEntryDTO dto = new ProductionEntryDTO();
        dto.setWorkOrderNumber("WO-2026-0001");
        dto.setOperationId("TURNING");
        dto.setProcessedQty(new BigDecimal("100"));
        dto.setAcceptedQty(new BigDecimal("100"));
        dto.setRejectedQty(BigDecimal.ZERO);
        dto.setReworkQty(BigDecimal.ZERO);
        dto.setScrapQty(BigDecimal.ZERO);
        return dto;
    }

    @Test
    @DisplayName("Valid entry maps and persists with DRAFT status and version 0")
    void validEntryPersists() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        OperationExecutionEvent saved = service.createEntry(valid());

        verify(repository, times(1)).save(any());
        assertEquals("DRAFT", saved.getStatus());
        assertEquals("TURNING", saved.getOperationId());
        assertEquals(0, new BigDecimal("100").compareTo(saved.getProcessedQty()));
    }

    @Test
    @DisplayName("Null payload is rejected")
    void nullPayloadRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.createEntry(null));
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Missing work order number is rejected")
    void missingWorkOrderRejected() {
        ProductionEntryDTO dto = valid();
        dto.setWorkOrderNumber(null);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.createEntry(dto));
        assertTrue(ex.getMessage().contains("Work order number is mandatory"));
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Missing operation is rejected")
    void missingOperationRejected() {
        ProductionEntryDTO dto = valid();
        dto.setOperationId("  ");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.createEntry(dto));
        assertTrue(ex.getMessage().contains("Operation is mandatory"));
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Zero or null processed quantity is rejected")
    void zeroProcessedRejected() {
        ProductionEntryDTO zero = valid();
        zero.setProcessedQty(BigDecimal.ZERO);
        assertThrows(IllegalArgumentException.class, () -> service.createEntry(zero));

        ProductionEntryDTO nullQty = valid();
        nullQty.setProcessedQty(null);
        assertThrows(IllegalArgumentException.class, () -> service.createEntry(nullQty));
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Negative quantities are rejected on every output field")
    void negativeQuantitiesRejected() {
        ProductionEntryDTO dto;
        dto = valid(); dto.setAcceptedQty(new BigDecimal("-1"));
        assertNegated(dto, "Accepted quantity");
        dto = valid(); dto.setRejectedQty(new BigDecimal("-1"));
        assertNegated(dto, "Rejected quantity");
        dto = valid(); dto.setReworkQty(new BigDecimal("-0.01"));
        assertNegated(dto, "Rework quantity");
        dto = valid(); dto.setScrapQty(new BigDecimal("-1"));
        assertNegated(dto, "Scrap quantity");
        dto = valid(); dto.setProcessedQty(new BigDecimal("-100"));
        assertNegated(dto, "Processed quantity");
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Allocation exceeding processed quantity is rejected")
    void allocationExceedsProcessedRejected() {
        ProductionEntryDTO dto = valid();
        dto.setAcceptedQty(new BigDecimal("30"));
        dto.setRejectedQty(new BigDecimal("10"));
        dto.setReworkQty(new BigDecimal("20"));
        dto.setScrapQty(new BigDecimal("50"));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.createEntry(dto));
        assertTrue(ex.getMessage().contains("cannot exceed process quantity"));
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("End time before start time is rejected")
    void endBeforeStartRejected() {
        ProductionEntryDTO dto = valid();
        dto.setActualStartDateTime("2026-01-05T10:00:00");
        dto.setActualEndDateTime("2026-01-05T09:30:00");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.createEntry(dto));
        assertTrue(ex.getMessage().contains("End time cannot be earlier than start time"));
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Malformed date/time is rejected with a clear message (not a generic 500)")
    void malformedDateRejected() {
        ProductionEntryDTO dto = valid();
        dto.setActualStartDateTime("not-a-date");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.createEntry(dto));
        assertTrue(ex.getMessage().contains("expected ISO-8601"));
        verifyNoInteractions(repository);
    }

    private void assertNegated(ProductionEntryDTO dto, String fieldPart) {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.createEntry(dto));
        assertTrue(ex.getMessage().contains(fieldPart), ex.getMessage());
    }
}