package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.math.BigDecimal;

@Entity @Table(name = "work_order_material") @Getter @Setter
public class WorkOrderMaterial extends BaseLine implements LineEntity {
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    WorkOrder doc;

    @Column(name = "line_no") Integer lineNo;
    @Column(name = "component_item_code", nullable = false, length = 60) String componentItemCode;
    @Column(name = "component_revision", length = 30) String componentRevision;
    String description;
    @Column(name = "required_quantity") BigDecimal requiredQuantity;
    @Column(name = "issued_quantity") BigDecimal issuedQuantity;
    @Column(name = "returned_quantity") BigDecimal returnedQuantity;
    @Column(name = "shortage_quantity") BigDecimal shortageQuantity;
    @Column(name = "required_date") LocalDate requiredDate;
    @Column(name = "issue_method", length = 30) String issueMethod;
    @Column(name = "alternate_item", length = 60) String alternateItem;
    @Column(name = "substitute_group", length = 60) String substituteGroup;
    @Column(name = "batch_number", length = 60) String batchNumber;
    @Column(name = "reservation_status", length = 30) String reservationStatus;
    @Column(name = "issue_status", length = 30) String issueStatus;
    @Column(length = 60) String warehouse;
    @Column(length = 20) String uom;
    @Column(name = "balance_qty") BigDecimal balanceQty;

    @Override public String getItemCode() { return componentItemCode; }
    @Override public BigDecimal getQty() { return requiredQuantity == null ? BigDecimal.ZERO : requiredQuantity; }
}
