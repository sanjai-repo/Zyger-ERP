package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;

/**
 * Customer Complaint (plan §22).
 */
@Entity
@Table(name = "quality_customer_complaint", indexes = {
        @Index(name = "idx_qcc_doc", columnList = "doc_no"),
        @Index(name = "idx_qcc_customer", columnList = "customer_code"),
        @Index(name = "idx_qcc_status", columnList = "status"),
        @Index(name = "idx_qcc_item", columnList = "item_code")
})
@Getter
@Setter
@DocKey("quality-customer-complaint")
public class QualityCustomerComplaint extends BaseDoc implements DocEntity {

    @Column(name = "complaint_number", length = 60)
    String complaintNumber;
    @Column(name = "complaint_date")
    LocalDate complaintDate;

    @Column(name = "customer_code", length = 60)
    String customerCode;
    @Column(name = "customer_name", length = 120)
    String customerName;
    @Column(name = "customer_po", length = 60)
    String customerPo;
    @Column(name = "sales_order_number", length = 60)
    String salesOrderNumber;
    @Column(name = "dispatch_reference", length = 60)
    String dispatchReference;
    @Column(name = "invoice_number", length = 60)
    String invoiceNumber;

    @Column(length = 60)
    String itemCode;
    @Column(name = "customer_part_number", length = 60)
    String customerPartNumber;
    @Column(name = "drawing_number", length = 60)
    String drawingNumber;
    @Column(name = "drawing_revision", length = 30)
    String drawingRevision;
    @Column(name = "batch_number", length = 60)
    String batchNumber;
    @Column(name = "serial_number", length = 60)
    String serialNumber;

    @Column(name = "quantity_complained")
    BigDecimal quantityComplained;
    @Column(length = 30)
    String uom;

    @Column(name = "complaint_type", length = 60)
    String complaintType;
    @Column(name = "complaint_description", length = 2048)
    String complaintDescription;
    @Column(length = 30)
    String severity;
    @Column(name = "received_channel", length = 60)
    String receivedChannel;

    @Column(name = "responsible_person", length = 60)
    String responsiblePerson;
    @Column(name = "initial_response_date")
    LocalDate initialResponseDate;

    @Column(name = "containment_action", length = 1024)
    String containmentAction;
    @Column(name = "root_cause", length = 1024)
    String rootCause;
    @Column(name = "corrective_action", length = 1024)
    String correctiveAction;
    @Column(name = "customer_response", length = 1024)
    String customerResponse;

    @Column(name = "capa_id")
    Long capaId;
    @Column(name = "eight_d_id")
    Long eightDId;

    /** OPEN | UNDER_REVIEW | INVESTIGATION | ACTION_PLANNED | ACTION_IMPLEMENTED | RESPONSE_SENT | CLOSED | REOPENED */
    @Column(name = "complaint_status", length = 30)
    String complaintStatus = "OPEN";

    @Column(name = "closed_at")
    Instant closedAt;

    @Override
    public java.util.List<? extends LineEntity> getLines() { return java.util.List.of(); }
}
