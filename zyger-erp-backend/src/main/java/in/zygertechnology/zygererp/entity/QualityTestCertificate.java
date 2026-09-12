package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Test Certificate (plan §17–19) — INWARD (supplier), INTERNAL (own tests),
 * OUTWARD (supplied to customer).
 */
@Entity
@Table(name = "quality_test_certificate", indexes = {
        @Index(name = "idx_qtc_doc", columnList = "doc_no"),
        @Index(name = "idx_qtc_type", columnList = "certificate_type"),
        @Index(name = "idx_qtc_item", columnList = "item_code"),
        @Index(name = "idx_qtc_status", columnList = "status")
})
@Getter
@Setter
@DocKey("quality-test-certificate")
public class QualityTestCertificate extends BaseDoc implements DocEntity {

    /** INWARD | INTERNAL | OUTWARD (FRS §6.3) */
    @Column(name = "certificate_type", length = 20)
    String certificateType = "INTERNAL";
    @Column(name = "certificate_number", length = 60)
    String certificateNumber;
    @Column(name = "certificate_date")
    LocalDate certificateDate;
    @Column(name = "expiry_date")
    LocalDate expiryDate;

    // inward: supplier; outward: customer
    @Column(length = 60)
    String partyCode;
    @Column(length = 120)
    String partyName;

    @Column(name = "purchase_order_number", length = 60)
    String purchaseOrderNumber;
    @Column(name = "inward_number", length = 60)
    String inwardNumber;
    @Column(name = "grn_number", length = 60)
    String grnNumber;

    @Column(name = "job_order_number", length = 60)
    String jobOrderNumber;
    @Column(name = "sales_order_number", length = 60)
    String salesOrderNumber;
    @Column(name = "dc_number", length = 60)
    String dcNumber;
    @Column(name = "invoice_number", length = 60)
    String invoiceNumber;

    @Column(name = "inspection_id")
    Long inspectionId;

    /** Outward certificate links (FRS §6.3): sales order / delivery challan / invoice references */
    @Column(name = "sales_order_ref", length = 30)
    String salesOrderRef;
    @Column(name = "dc_ref", length = 30)
    String dcRef;
    @Column(name = "invoice_ref", length = 30)
    String invoiceRef;

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
    @Column(name = "lot_number", length = 60)
    String lotNumber;
    @Column(name = "heat_number", length = 60)
    String heatNumber;

    @Column(length = 30)
    String uom;
    @Column(name = "test_type", length = 60)
    String testType;
    @Column(name = "specification_reference", length = 1024)
    String specificationReference;

    /** PASS | FAIL | PENDING */
    @Column(name = "overall_result", length = 20)
    String overallResult = "PENDING";

    @Column(name = "verified_by", length = 60)
    String verifiedBy;
    @Column(name = "verification_date")
    LocalDate verificationDate;

    @Column(name = "prepared_by", length = 60)
    String preparedBy;
    @Column(name = "approved_by", length = 60)
    String approvedBy;
    @Column(name = "approval_date")
    LocalDate approvalDate;

    @OneToMany(mappedBy = "certificate", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<QualityTestCertificateLine> lines = new ArrayList<>();

    @Override
    public List<? extends LineEntity> getLines() {
        return lines;
    }
}
