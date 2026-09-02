package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name="sales_dc") @Getter @Setter @DocKey("sales-dc")
public class SalesDc extends BaseDoc implements DocEntity {

    @Column(name="customer", length=200) String customer;
    String party;
    @Column(name="customer_code", length=60) String customerCode;
    @Column(name="sales_order_no", length=60) String salesOrderNo;
    @Column(name="sales_order_number", length=60) String salesOrderNumber;
    @Column(name="customer_po_number", length=60) String customerPoNumber;
    @Column(name="pi_reference", length=60) String piReference;
    @Column(name="source_location", length=200) String sourceLocation;
    @Column(name="delivery_address", length=500) String deliveryAddress;
    @Column(name="transporter", length=200) String transporter;
    @Column(name="vehicle_no", length=60) String vehicleNo;
    @Column(name="lr_number", length=60) String lrNumber;
    @Column(name="lr_no", length=60) String lrNo;
    @Column(name="lr_date") LocalDate lrDate;
    @Column(name="driver_details", length=200) String driverDetails;
    @Column(name="dispatch_date") LocalDate dispatchDate;
    @Column(name="eway_bill_reference", length=60) String ewayBillReference;
    @Column(name="contact_person", length=200) String contactPerson;
    @Column(name="linked_document_no", length=60) String linkedDocumentNo;
    @Column(name="attachment_file_name", length=200) String attachmentFileName;

    @OneToMany(mappedBy="doc", cascade=CascadeType.ALL, orphanRemoval=true, fetch=FetchType.EAGER)
    List<SalesDcLine> lines = new ArrayList<>();
}
