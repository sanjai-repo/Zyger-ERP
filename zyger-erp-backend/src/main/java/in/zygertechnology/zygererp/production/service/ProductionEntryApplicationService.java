package in.zygertechnology.zygererp.production.service;

import in.zygertechnology.zygererp.production.dto.ProductionEntryDTO;
import in.zygertechnology.zygererp.production.entity.OperationExecutionEvent;
import in.zygertechnology.zygererp.production.repository.OperationExecutionEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

/**
 * PHASE 2 — Application service for the isolated production operation event.
 *
 * Maps {@link ProductionEntryDTO} to {@link OperationExecutionEvent} and
 * persists to the new {@code prod_operation_execution_event} table. Does NOT
 * touch legacy tables or {@code StockService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductionEntryApplicationService {

    private final OperationExecutionEventRepository repository;

    @Transactional
    public OperationExecutionEvent createEntry(ProductionEntryDTO dto) {
        validate(dto);
        OperationExecutionEvent event = OperationExecutionEvent.builder()
                .workOrderNumber(dto.getWorkOrderNumber())
                .routeSheetNo(dto.getRouteSheetNo())
                .operationId(dto.getOperationId())
                .machineId(dto.getMachineId())
                .operatorId(dto.getOperatorId())
                .shiftId(dto.getShiftId())
                .actualStartDateTime(toLocalDateTime(dto.getActualStartDateTime()))
                .actualEndDateTime(toLocalDateTime(dto.getActualEndDateTime()))
                .processedQty(dto.getProcessedQty())
                .acceptedQty(dto.getAcceptedQty())
                .rejectedQty(dto.getRejectedQty())
                .reworkQty(dto.getReworkQty())
                .scrapQty(dto.getScrapQty())
                .status("DRAFT")
                .createdAt(LocalDateTime.now())
                .version(0L)
                .build();

        OperationExecutionEvent saved = repository.save(event);
        log.info("PHASE 2 persisted OperationExecutionEvent id={} status=DRAFT", saved.getId());
        return saved;
    }

    private LocalDateTime toLocalDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(
                    "Invalid date/time value '" + value + "' (expected ISO-8601 like 2026-01-05T08:30:00)");
        }
    }

    /**
     * Input guard for the entry stub. Mirrors the quantity/allocation rules of the
     * committed {@code ProductionEntryValidationService} (V-04, V-05, V-07, V-11):
     * no negative quantities, a positive processed quantity, allocation that never
     * exceeds processed, and a non-decreasing start→end window. A stub must never
     * persist {@code prod_operation_execution_event} rows with negative quantities.
     */
    private static void validate(ProductionEntryDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Production entry payload is required");
        }
        if (isBlank(dto.getWorkOrderNumber())) {
            throw new IllegalArgumentException("Work order number is mandatory");
        }
        if (isBlank(dto.getOperationId())) {
            throw new IllegalArgumentException("Operation is mandatory");
        }
        BigDecimal processed = requireNonNegative(dto.getProcessedQty(), "Processed quantity");
        if (processed == null || processed.signum() <= 0) {
            throw new IllegalArgumentException("Processed quantity must be greater than zero");
        }
        BigDecimal accepted = requireNonNegative(dto.getAcceptedQty(), "Accepted quantity");
        BigDecimal rejected = requireNonNegative(dto.getRejectedQty(), "Rejected quantity");
        BigDecimal rework = requireNonNegative(dto.getReworkQty(), "Rework quantity");
        BigDecimal scrap = requireNonNegative(dto.getScrapQty(), "Scrap quantity");

        BigDecimal allocated = orZero(accepted).add(orZero(rejected)).add(orZero(rework)).add(orZero(scrap));
        if (allocated.compareTo(processed) > 0) {
            throw new IllegalArgumentException(
                    "Accepted, rejected and rework quantities cannot exceed process quantity");
        }

        LocalDateTime start = safeDateTime(dto.getActualStartDateTime());
        LocalDateTime end = safeDateTime(dto.getActualEndDateTime());
        if (start != null && end != null && end.isBefore(start)) {
            throw new IllegalArgumentException("End time cannot be earlier than start time");
        }
    }

    private static LocalDateTime safeDateTime(String value) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(
                    "Invalid date/time value '" + value + "' (expected ISO-8601 like 2026-01-05T08:30:00)");
        }
    }

    private static BigDecimal requireNonNegative(BigDecimal qty, String field) {
        if (qty == null) {
            return null;
        }
        if (qty.signum() < 0) {
            throw new IllegalArgumentException(field + " cannot be negative");
        }
        return qty;
    }

    private static BigDecimal orZero(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
