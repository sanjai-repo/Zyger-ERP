package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="supplier_enquiry") @Getter @Setter @DocKey("supplier-enquiry")
public class SupplierEnquiry extends BaseDoc implements DocEntity {
    @Column(name = "purchase_request_number", length = 60) String purchaseRequestNumber;
    String supplier;
    @Column(name = "supplier_code", length = 60) String supplierCode;
    @Column(name = "contact_person", length = 120) String contactPerson;
    String phone;
    String email;
    String buyer;
    @Column(name = "required_date") LocalDate requiredDate;
    @Column(name = "valid_until") LocalDate validUntil;
    @Column(name = "quotation_validity_date") LocalDate quotationValidityDate;
    @Column(length = 30) String currency;
    @Column(name = "payment_terms", length = 200) String paymentTerms;
    @Column(name = "delivery_terms", length = 200) String deliveryTerms;
    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<SupplierEnquiryItem> lines = new ArrayList<>();
    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    List<SupplierEnquirySupplier> suppliers = new ArrayList<>();
}
