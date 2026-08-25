package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "dispatch_plan")
@Getter
@Setter
@EntityListeners(AuditEntityListener.class)
public class DispatchPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "dispatch_number", unique = true, length = 60)
    String dispatchNumber;

    @Column(name = "dispatch_date")
    Instant dispatchDate;

    @Column(name = "customer_id")
    Long customerId;

    @Column(name = "customer_name", length = 200)
    String customerName;

    @Column(name = "delivery_address", length = 500)
    String deliveryAddress;

    @Column(name = "transport_mode", length = 50)
    String transportMode;

    @Column(name = "transporter_name", length = 200)
    String transporterName;

    @Column(name = "vehicle_number", length = 30)
    String vehicleNumber;

    @Column(name = "lr_number", length = 50)
    String lrNumber;

    @Column(name = "eway_bill_number", length = 50)
    String ewayBillNumber;
    @Column(name = "delivery_address_id")
    Long deliveryAddressId;
    @Column(name = "customer_po_number", length = 60)
    String customerPoNumber;

    String status;

    @Column(name = "total_items")
    Integer totalItems;

    @Column(name = "total_qty", precision = 38, scale = 2)
    BigDecimal totalQty;

    @Column(name = "total_weight", precision = 8, scale = 2)
    BigDecimal totalWeight;

    /** FRS §3.6: QC gate status */
    @Column(name = "qc_status", length = 30)
    String qcStatus;
    /** FRS §3.6: packing status */
    @Column(name = "packing_status", length = 30)
    String packingStatus;
    /** FRS §3.6: delivery priority */
    @Column(name = "delivery_priority", length = 20)
    String deliveryPriority;
    /** FRS §3.6: sales order reference */
    @Column(name = "sales_order_ref", length = 60)
    String salesOrderRef;

    @Column(length = 500)
    String remarks;

    @Version
    Long version;

    String createdBy;

    Instant createdAt;

    Instant updatedAt;

    String updatedBy;
}
