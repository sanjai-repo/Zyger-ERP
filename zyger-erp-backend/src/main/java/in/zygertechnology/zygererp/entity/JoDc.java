package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="jo_dc") @Getter @Setter @DocKey("jo-dc")
public class JoDc extends BaseDoc implements DocEntity {
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

    // Type-specific fields for JO DC
    String jobOrderNo;
    String challanPurpose; // 'Sending for Job Work' / 'Receiving after Job Work'
    String processName;
    java.time.LocalDate expectedReturnDate;
    Boolean jobWorkRateApplicable = false;
    String gstOnJobWork; // 'Nil' / 'Applicable'

    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<JoDcLine> lines = new java.util.ArrayList<>();

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
    public String getJobOrderNo() { return jobOrderNo; }
    public String getChallanPurpose() { return challanPurpose; }
    public String getProcessName() { return processName; }
    public java.time.LocalDate getExpectedReturnDate() { return expectedReturnDate; }
    public Boolean getJobWorkRateApplicable() { return jobWorkRateApplicable; }
    public String getGstOnJobWork() { return gstOnJobWork; }
    public java.util.List<JoDcLine> getLines() { return lines; }
}

