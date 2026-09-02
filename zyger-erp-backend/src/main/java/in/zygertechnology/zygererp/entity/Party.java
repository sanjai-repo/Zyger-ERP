package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name="party_master")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Party {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "approval_status", length = 30) @Builder.Default String approvalStatus = "APPROVED";
    @Column(length = 20) String kind;
    @Column(length = 60) String code;
    @Column(length = 120) String name;
    @Column(name = "legal_name", length = 200) String legalName;
    @Column(length = 200) String address;
    @Column(length = 60) String gstNumber;
    @Column(length = 60) String contactPerson;
    @Column(length = 60) String phone;
    @Column(length = 120) String email;
    @Column(length = 200) String paymentTerms;
    @Column(length = 60) String state;
    @Column(length = 60) String country;
    @Column(length = 100) String city;
    @Column(length = 20) String pincode;
    @Column(length = 60) String mobile;
    @Column(length = 200) String tanNumber;
    @Builder.Default
    @Column(name = "msme_registered") Boolean msmeRegistered = false;
    @Column(name = "msme_number", length = 60) String msmeNumber;
    @Column(name = "transport_mode", length = 60) String transportMode;

    // ---- Supplier-specific (existing) ----
    @Column(name = "supplier_type", length = 60) String supplierType;
    @Column(name = "vendor_type", length = 60) String vendorType;
    @Column(name = "material_group", length = 100) String materialGroup;
    @Builder.Default
    @Column(name = "inspection_required") Boolean inspectionRequiredParty = false;
    @Column(name = "lead_time_days") Integer leadTimeDays;
    @Column(name = "min_order_value") BigDecimal minOrderValue;
    @Column(name = "payment_terms_code", length = 30) String paymentTermsCode;
    @Column(name = "delivery_terms", length = 200) String deliveryTerms;
    @Column(name = "bank_account_no", length = 50) String bankAccountNo;
    @Column(name = "bank_name", length = 200) String bankName;
    @Column(name = "bank_ifsc", length = 30) String bankIfsc;
    @Column(name = "bank_branch", length = 200) String bankBranch;
    @Column(name = "credit_days") Integer creditDays;
    @Column(name = "credit_limit", precision = 14, scale = 2) BigDecimal creditLimit;
    @Column(name = "quality_rating", length = 30) String qualityRating;
    @Column(name = "on_time_delivery", length = 30) String onTimeDelivery;
    @Column(name = "total_business", precision = 14, scale = 2) BigDecimal totalBusiness;
    @Column(name = "blacklist_status", length = 30) String blacklistStatus;
    @Builder.Default
    @Column(name = "blacklisted") Boolean blacklisted = false;
    @Column(name = "mccm_code", length = 30) String mccmCode;
    @Column(name = "total_machine") Integer totalMachine;
    @Column(name = "annual_capacity", length = 100) String annualCapacity;
    @Column(length = 500) String certifications;
    @Column(name = "turnaround_time") Integer turnaroundTime;

    // ---- Customer-specific: Basic info ----
    @Column(name = "display_name", length = 200) String displayName;
    @Column(name = "customer_type", length = 60) String customerType;
    @Column(name = "customer_category", length = 60) String customerCategory;
    @Column(name = "customer_status", length = 30) @Builder.Default String customerStatus = "Active";
    @Column(name = "customer_rating", length = 10) String customerRating;
    @Column(name = "customer_priority", length = 20) String customerPriority;
    @Column(name = "onboarding_date") LocalDate onboardingDate;
    @Column(name = "salesperson", length = 100) String salesperson;
    @Column(name = "customer_group", length = 60) String customerGroup;

    // ---- Customer-specific: Company details ----
    @Column(name = "company_reg_no", length = 100) String companyRegNo;
    @Column(name = "cin", length = 60) String cin;
    @Column(name = "pan", length = 30) String pan;
    @Column(name = "website", length = 200) String website;
    @Column(name = "industry", length = 100) String industry;
    @Column(name = "business_type", length = 30) String businessType;
    @Column(name = "business_nature", length = 60) String businessNature;
    @Column(name = "established_date") LocalDate establishedDate;
    @Column(name = "number_of_employees") Integer numberOfEmployees;
    @Column(name = "annual_turnover", precision = 14, scale = 2) BigDecimal annualTurnover;
    @Column(name = "remarks", columnDefinition = "TEXT") String remarks;

    // ---- Customer-specific: GST & Tax ----
    @Column(name = "gst_registration_status", length = 30) String gstRegistrationStatus;
    @Column(name = "gstin", length = 30) String gstin;
    @Column(name = "gst_registration_type", length = 60) String gstRegistrationType;
    @Column(name = "gst_effective_date") LocalDate gstEffectiveDate;
    @Column(name = "gst_expiry_date") LocalDate gstExpiryDate;
    @Column(name = "gst_state", length = 60) String gstState;
    @Column(name = "taxpayer_type", length = 60) String taxpayerType;
    @Builder.Default
    @Column(name = "e_invoice_applicable") Boolean eInvoiceApplicable = false;
    @Builder.Default
    @Column(name = "e_way_bill_applicable") Boolean eWayBillApplicable = false;
    @Builder.Default
    @Column(name = "tds_applicable") Boolean tdsApplicable = false;
    @Builder.Default
    @Column(name = "tcs_applicable") Boolean tcsApplicable = false;
    @Builder.Default
    @Column(name = "tax_exemption") Boolean taxExemption = false;
    @Column(name = "tax_exemption_number", length = 60) String taxExemptionNumber;
    @Column(name = "tax_exemption_from") LocalDate taxExemptionFrom;
    @Column(name = "tax_exemption_to") LocalDate taxExemptionTo;
    @Column(name = "pan_number", length = 30) String panNumber;
    @Column(name = "pan_holder_name", length = 120) String panHolderName;
    @Column(name = "pan_status", length = 30) String panStatus;
    @Column(name = "default_tax_category", length = 60) String defaultTaxCategory;
    @Column(name = "default_gst_rate", precision = 5, scale = 2) BigDecimal defaultGstRate;
    @Column(name = "tds_section", length = 60) String tdsSection;
    @Column(name = "tds_rate", precision = 5, scale = 2) BigDecimal tdsRate;
    @Column(name = "tcs_rate", precision = 5, scale = 2) BigDecimal tcsRate;
    @Builder.Default
    @Column(name = "reverse_charge_applicable") Boolean reverseChargeApplicable = false;

    // ---- Customer-specific: Payment & Commercial ----
    @Column(name = "currency", length = 10) @Builder.Default String currency = "INR";
    @Column(name = "payment_terms2", length = 60) String paymentTerms2;
    @Column(name = "credit_limit2", precision = 14, scale = 2) BigDecimal creditLimit2;
    @Column(name = "credit_days2") Integer creditDays2;
    @Column(name = "payment_method", length = 60) String paymentMethod;
    @Column(name = "price_list", length = 60) String priceList;
    @Column(name = "discount", precision = 5, scale = 2) BigDecimal discount;
    @Column(name = "sales_territory", length = 100) String salesTerritory;
    @Column(name = "incoterms", length = 60) String incoterms;
    @Column(name = "freight_terms", length = 60) String freightTerms;
    @Column(name = "insurance_terms", length = 200) String insuranceTerms;
    @Column(name = "delivery_terms2", length = 200) String deliveryTerms2;
    @Column(name = "billing_cycle", length = 30) String billingCycle;
    @Builder.Default
    @Column(name = "credit_hold") Boolean creditHold = false;
    @Column(name = "credit_hold_reason", length = 200) String creditHoldReason;
    @Builder.Default
    @Column(name = "advance_required") Boolean advanceRequired = false;
    @Column(name = "advance_percentage", precision = 5, scale = 2) BigDecimal advancePercentage;

    // ---- JSON columns for complex nested data ----
    @Column(name = "contacts_json", columnDefinition = "TEXT") @Builder.Default String contactsJson = "[]";
    @Column(name = "addresses_json", columnDefinition = "TEXT") @Builder.Default String addressesJson = "[]";
    @Column(name = "delivery_addresses_json", columnDefinition = "TEXT") @Builder.Default String deliveryAddressesJson = "[]";
    @Column(name = "bank_accounts_json", columnDefinition = "TEXT") @Builder.Default String bankAccountsJson = "[]";
    @Column(name = "documents_json", columnDefinition = "TEXT") @Builder.Default String documentsJson = "[]";

    // ---- Billing / Shipping Address ----
    @Column(name = "billing_address", columnDefinition = "TEXT") String billingAddress;
    @Column(name = "shipping_address", columnDefinition = "TEXT") String shippingAddress;

    // ---- Audit fields ----
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @Version Long version;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
    @PrePersist void prePersist() {
        if (active == null) active = Boolean.TRUE;
        if (createdAt == null) createdAt = Instant.now();
        if (createdBy == null || createdBy.isBlank()) createdBy = "system";
    }
}
