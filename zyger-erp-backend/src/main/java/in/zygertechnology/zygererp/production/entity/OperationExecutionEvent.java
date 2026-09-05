package in.zygertechnology.zygererp.production.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * PHASE 2 — Isolated production operation execution event entity.
 *
 * <p>Mapped to the NEW isolated table {@code prod_operation_execution_event}
 * (migration V6), deliberately separate from the committed
 * {@code prod_operation_event} infrastructure (V4 + {@code ProdOperationEvent})
 * to avoid any conflict. No legacy tables, no {@code StockService}.</p>
 *
 * <p>Includes mandatory FRS audit/base fields: id (UUID), companyId, plantId,
 * status (default "DRAFT"), createdBy, createdAt, and {@code version} for
 * optimistic locking.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "prod_operation_execution_event")
public class OperationExecutionEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "company_id", length = 60)
    private String companyId;

    @Column(name = "plant_id", length = 60)
    private String plantId;

    @Column(name = "status", length = 30, nullable = false)
    private String status;

    @Column(name = "created_by", length = 60)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    // --- ProductionEntryDTO mapped fields --------------------------------

    @Column(name = "work_order_number", length = 60)
    private String workOrderNumber;

    @Column(name = "route_sheet_no", length = 60)
    private String routeSheetNo;

    @Column(name = "operation_id", length = 60)
    private String operationId;

    @Column(name = "machine_id", length = 60)
    private String machineId;

    @Column(name = "operator_id", length = 60)
    private String operatorId;

    @Column(name = "shift_id", length = 60)
    private String shiftId;

    @Column(name = "actual_start_date_time")
    private LocalDateTime actualStartDateTime;

    @Column(name = "actual_end_date_time")
    private LocalDateTime actualEndDateTime;

    @Column(name = "processed_qty", precision = 18, scale = 4)
    private BigDecimal processedQty;

    @Column(name = "accepted_qty", precision = 18, scale = 4)
    private BigDecimal acceptedQty;

    @Column(name = "rejected_qty", precision = 18, scale = 4)
    private BigDecimal rejectedQty;

    @Column(name = "rework_qty", precision = 18, scale = 4)
    private BigDecimal reworkQty;

    @Column(name = "scrap_qty", precision = 18, scale = 4)
    private BigDecimal scrapQty;

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = "DRAFT";
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (version == null) {
            version = 0L;
        }
    }
}
