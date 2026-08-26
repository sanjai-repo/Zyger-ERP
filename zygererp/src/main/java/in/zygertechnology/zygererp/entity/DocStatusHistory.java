package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * FRS v10.1: Generic status history for any planning document (BOM, Route Sheet, Work Order, ECR, Cost Estimation).
 * Replaces the WO-only WorkOrderStatusHistory table for new documents.
 */
@Entity @Table(name = "doc_status_history") @Getter @Setter
public class DocStatusHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "doc_type", nullable = false, length = 40) String docType;

    @Column(name = "doc_id", nullable = false) Long docId;

    @Column(name = "doc_number", length = 60) String docNumber;

    @Column(name = "from_status", length = 30) String fromStatus;

    @Column(name = "to_status", length = 30) String toStatus;

    @Column(length = 500) String reason;

    @Column(name = "created_by", length = 60) String createdBy;

    @Column(name = "created_at", nullable = false) Instant createdAt = Instant.now();
}
