package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.math.BigDecimal;

@Entity @Table(name = "shop_floor_entry") @Getter @Setter @DocKey("shop-floor-entry")
public class ShopFloorEntry extends BaseDoc implements DocEntity {
    @Column(name = "work_order_no", nullable = false, length = 60) String workOrderNo;
    @Column(name = "job_card_number", length = 60) String jobCardNumber;
    @Column(name = "operation_sequence") Integer operationSequence;
    @Column(name = "operation_code", length = 60) String operationCode;
    @Column(name = "operator_code", length = 60) String operatorCode;
    @Column(name = "machine_code", length = 60) String machineCode;
    @Column(name = "shift_code", length = 60) String shiftCode;
    @Column(name = "start_time") Instant startTime;
    @Column(name = "end_time") Instant endTime;
    @Column(name = "good_quantity") BigDecimal goodQuantity;
    @Column(name = "scrap_quantity") BigDecimal scrapQuantity;
    @Column(name = "rework_quantity") BigDecimal reworkQuantity;
    @Column(name = "inspection_result", length = 30) String inspectionResult;

    @Column(name = "plant_id") Long plantId;
    @Column(name = "is_backdated") Boolean isBackdated = false;
    @Column(name = "backdated_reason", length = 500) String backdatedReason;
    @Column(name = "is_overproduction") Boolean isOverproduction = false;
    @Column(name = "override_approved_by", length = 100) String overrideApprovedBy;
    @Column(name = "override_reason", length = 500) String overrideReason;
    @Column(name = "override_approved_at") Instant overrideApprovedAt;
    @Column(name = "client_offline_id", unique = true, length = 100) String clientOfflineId;
    @Column(name = "corrects_entry_id") Long correctsEntryId;
    @Column(name = "quality_status", length = 30) String qualityStatus;
    @Column(name = "quantity_reconciled") Boolean quantityReconciled = false;

    @Override public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}
