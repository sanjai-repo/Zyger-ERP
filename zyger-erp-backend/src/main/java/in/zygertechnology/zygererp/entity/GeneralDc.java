package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="general_dc") @Getter @Setter @DocKey("general-dc")
public class GeneralDc extends BaseDoc implements DocEntity {
    String party;
    String sourceLocation;
    String vehicleNo;
    String transporter;
    String linkedDocumentNo;
    java.time.LocalDate referenceDate;
    String lrNo;
    String modeOfTransport;
    String preparedBy;
    String financialYear;

    // Type-specific fields for General DC
    String dcAgainst; // Sale/Sample/Approval/Replacement/Others
    String salesOrderNo;
    @Column(length = 1000) String billingAddress;
    @Column(length = 1000) String shippingAddress;
    String gstin;
    Boolean taxApplicable = false;
    String paymentTerms;
    Boolean convertToInvoiceLater = false;
    Boolean invoiced = false;
    String invoiceNo;

    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<GeneralDcLine> lines = new java.util.ArrayList<>();

    public String getParty() { return party; }
    public String getSourceLocation() { return sourceLocation; }
    public String getVehicleNo() { return vehicleNo; }
    public String getTransporter() { return transporter; }
    public String getLinkedDocumentNo() { return linkedDocumentNo; }
    public java.time.LocalDate getReferenceDate() { return referenceDate; }
    public String getLrNo() { return lrNo; }
    public String getModeOfTransport() { return modeOfTransport; }
    public String getPreparedBy() { return preparedBy; }
    public String getFinancialYear() { return financialYear; }
    public String getDcAgainst() { return dcAgainst; }
    public String getSalesOrderNo() { return salesOrderNo; }
    public String getBillingAddress() { return billingAddress; }
    public String getShippingAddress() { return shippingAddress; }
    public String getGstin() { return gstin; }
    public Boolean getTaxApplicable() { return taxApplicable; }
    public String getPaymentTerms() { return paymentTerms; }
    public Boolean getConvertToInvoiceLater() { return convertToInvoiceLater; }
    public Boolean getInvoiced() { return invoiced; }
    public String getInvoiceNo() { return invoiceNo; }
    public java.util.List<GeneralDcLine> getLines() { return lines; }
}

