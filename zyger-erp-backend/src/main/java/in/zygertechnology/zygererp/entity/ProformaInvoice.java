package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Entity @Table(name="proforma_invoice") @Getter @Setter @DocKey("proforma-invoice")
public class ProformaInvoice extends BaseDoc implements DocEntity {

    @Column(name="customer", length=200) String customer;
    @Column(name="customer_code", length=60) String customerCode;
    @Column(name="customer_po_number", length=60) String customerPoNumber;
    @Column(name="sales_order_no", length=60) String salesOrderNo;
    @Column(name="sales_order_number", length=60) String salesOrderNumber;
    @Column(name="billing_address", length=500) String billingAddress;
    @Column(name="shipping_address", length=500) String shippingAddress;
    @Column(length=30) String currency;
    @Column(name="payment_terms", length=200) String paymentTerms;
    @Column(name="delivery_terms", length=200) String deliveryTerms;
    @Column(name="validity_date") LocalDate validityDate;
    @Column(name="expected_delivery_date") LocalDate expectedDeliveryDate;
    @Column(name="sales_person", length=100) String salesPerson;

    @Column(name="total_amount") BigDecimal totalAmount;

    @OneToMany(mappedBy="doc", cascade=CascadeType.ALL, orphanRemoval=true, fetch=FetchType.EAGER)
    List<ProformaInvoiceItem> lines = new ArrayList<>();
}
