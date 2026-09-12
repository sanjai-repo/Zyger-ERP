package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "work_order_status_history") @Getter @Setter
public class WorkOrderStatusHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", insertable = false, updatable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    WorkOrder workOrder;

    @Column(name = "work_order_id", nullable = false) Long workOrderId;

    @Column(name = "wo_number", length = 30) String woNumber;

    @Column(name = "from_status", length = 20) String fromStatus;

    @Column(name = "to_status", length = 20) String toStatus;

    @Column(length = 500) String reason;

    @Column(name = "created_by", length = 60) String createdBy;

    @Column(name = "created_at", nullable = false) Instant createdAt = Instant.now();
}
