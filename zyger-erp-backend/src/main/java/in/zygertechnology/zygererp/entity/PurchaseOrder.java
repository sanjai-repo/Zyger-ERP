package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="purchase_order") @Getter @Setter @DocKey("purchase-order")
public class PurchaseOrder extends BaseDoc implements DocEntity {
    String supplier;
    @Column(name = "supplier_code", length = 60) String supplierCode;
    @Column(name = "contact_person", length = 120) String contactPerson;
    String phone;
    String email;
    String buyer;
    String department;
    @Column(name = "purchase_request_number", length = 60) String purchaseRequestNumber;
    @Column(name = "reference_quotation", length = 60) String referenceQuotation;
    @Column(name = "quotation_number", length = 60) String quotationNumber;
    @Column(length = 30) String currency;
    @Column(name = "payment_terms", length = 200) String paymentTerms;
    @Column(name = "delivery_terms", length = 200) String deliveryTerms;
    @Column(name = "delivery_location", length = 200) String deliveryLocation;
    @Column(name = "expected_delivery_date") LocalDate expectedDeliveryDate;
    @Column(name = "freight_terms", length = 100) String freightTerms;
    @Column(name = "tax_details", length = 200) String taxDetails;
    @Column(name = "billing_address", length = 500) String billingAddress;
    @Column(name = "shipping_address", length = 500) String shippingAddress;
    @Column(name = "attachment_file_name", length = 200) String attachmentFileName;
    @Column(name = "email_sent_at") Instant emailSentAt;
    @Column(name = "email_status", length = 30) String emailStatus;
    @Column(name = "email_error", length = 500) String emailError;
    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<PurchaseOrderItem> lines = new ArrayList<>();
    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<PurchaseOrderSchedule> schedules = new ArrayList<>();
}
