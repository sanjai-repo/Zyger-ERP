package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="transfer_dc") @Getter @Setter @DocKey("transfer-dc")
public class TransferDc extends BaseDoc implements DocEntity {
    String party;
    String sourceLocation;
    String destinationLocation;
    String vehicleNo;
    String transporter;
    String linkedDocumentNo;
    java.time.LocalDate referenceDate;
    String lrNo;
    String modeOfTransport;
    String preparedBy;
    String financialYear;

    // Type-specific fields for Transfer DC
    String transferType; // Inter-Branch/Inter-Godown/Inter-Plant
    String transferRequestNo;
    Boolean approvalRequired = false;
    String approvedBy;
    Boolean inTransitTracking = false;
    Boolean receiptConfirmed = false;
    String receiptConfirmedBy;
    java.time.Instant receiptConfirmedAt;

    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<TransferDcLine> lines = new java.util.ArrayList<>();

    public String getParty() { return party; }
    public String getSourceLocation() { return sourceLocation; }
    public String getDestinationLocation() { return destinationLocation; }
    public String getVehicleNo() { return vehicleNo; }
    public String getTransporter() { return transporter; }
    public String getLinkedDocumentNo() { return linkedDocumentNo; }
    public java.time.LocalDate getReferenceDate() { return referenceDate; }
    public String getLrNo() { return lrNo; }
    public String getModeOfTransport() { return modeOfTransport; }
    public String getPreparedBy() { return preparedBy; }
    public String getFinancialYear() { return financialYear; }
    public String getTransferType() { return transferType; }
    public String getTransferRequestNo() { return transferRequestNo; }
    public Boolean getApprovalRequired() { return approvalRequired; }
    public String getApprovedBy() { return approvedBy; }
    public Boolean getInTransitTracking() { return inTransitTracking; }
    public Boolean getReceiptConfirmed() { return receiptConfirmed; }
    public String getReceiptConfirmedBy() { return receiptConfirmedBy; }
    public java.time.Instant getReceiptConfirmedAt() { return receiptConfirmedAt; }
    public java.util.List<TransferDcLine> getLines() { return lines; }
}

