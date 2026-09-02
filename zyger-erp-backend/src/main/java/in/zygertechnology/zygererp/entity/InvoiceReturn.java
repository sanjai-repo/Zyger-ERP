package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name="invoice_return") @Getter @Setter @DocKey("invoice-return")
public class InvoiceReturn extends BaseDoc implements DocEntity {

    @Column(name="customer", length=200) String customer;
    @Column(name="customer_code", length=60) String customerCode;
    @Column(name="invoice_no", length=60) String invoiceNo;
    @Column(name="original_invoice_number", length=60) String originalInvoiceNumber;
    @Column(name="original_invoice_date") LocalDate originalInvoiceDate;
    @Column(name="return_date") LocalDate returnDate;
    @Column(name="sales_order_number", length=60) String salesOrderNumber;
    @Column(name="customer_po_number", length=60) String customerPoNumber;
    @Column(name="reason", length=200) String reason;
    @Column(name="return_reason", length=200) String returnReason;
    @Column(name="customer_remarks", length=500) String customerRemarks;
    @Column(name="transport_details", length=200) String transportDetails;
    @Column(name="quality_inspection_reference", length=60) String qualityInspectionReference;
    @Column(length=30) String disposition;

    @OneToMany(mappedBy="doc", cascade=CascadeType.ALL, orphanRemoval=true, fetch=FetchType.EAGER)
    List<InvoiceReturnLine> lines = new ArrayList<>();
}
