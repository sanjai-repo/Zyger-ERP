package in.zygertechnology.zygererp.production.dto;

import lombok.Data;

import java.math.BigDecimal;

/**
 * PHASE 1 — Operation-level Production Entry DTO (Task 4).
 *
 * Mirrors the frontend {@code ProductionEntryDTO} (DEC-PROD-001 operation-event
 * model). Safe API-layer DTO only: references no entity, repository, or
 * {@code StockService}. Fields externalized as boxes to avoid any wrapper-type
 * ambiguity in JSON mapping.
 */
@Data
public class ProductionEntryDTO {

    private String id;
    private String workOrderNumber;
    private String routeSheetNo;
    private String operationId;
    private String machineId;
    private String operatorId;
    private String shiftId;
    private String actualStartDateTime;
    private String actualEndDateTime;
    private BigDecimal processedQty;
    private BigDecimal acceptedQty;
    private BigDecimal rejectedQty;
    private BigDecimal reworkQty;
    private BigDecimal scrapQty;
}
