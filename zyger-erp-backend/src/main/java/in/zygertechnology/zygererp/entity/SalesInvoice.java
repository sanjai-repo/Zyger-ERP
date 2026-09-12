package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Entity @Table(name="sales_invoice") @Getter @Setter @DocKey("sales-invoice")
public class SalesInvoice extends BaseDoc implements DocEntity {

    @Column(name="customer", length=200) String customer;
    @Column(name="customer_code", length=60) String customerCode;
    @Column(name="customer_po_number", length=60) String customerPoNumber;
    @Column(name="sales_order_no", length=60) String salesOrderNo;
    @Column(name="sales_order_number", length=60) String salesOrderNumber;
    @Column(name="dc_no", length=60) String dcNo;
    @Column(name="sales_dc_number", length=60) String salesDcNumber;
    @Column(name="pi_number", length=60) String piNumber;
    @Column(name="billing_address", length=500) String billingAddress;
    @Column(name="shipping_address", length=500) String shippingAddress;
    @Column(length=30) String currency;
    @Column(name="payment_terms", length=200) String paymentTerms;
    @Column(name="due_date") LocalDate dueDate;
    @Column(name="tax_details", length=200) String taxDetails;
    @Column(name="transport_details", length=200) String transportDetails;
    @Column(name="eway_bill_reference", length=60) String ewayBillReference;

    @Column(name="total_amount") BigDecimal totalAmount;
    @Column(name="tax_amount") BigDecimal taxAmount;

    @OneToMany(mappedBy="doc", cascade=CascadeType.ALL, orphanRemoval=true, fetch=FetchType.EAGER)
    List<SalesInvoiceItem> lines = new ArrayList<>();
}
