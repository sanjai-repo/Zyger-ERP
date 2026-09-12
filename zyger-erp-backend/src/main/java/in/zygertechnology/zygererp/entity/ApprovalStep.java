package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.time.Instant;

@Entity
@Table(name = "approval_step")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ApprovalStep {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Builder.Default
    @Column(name = "plant_id") Long plantId = 1L;
    @Column(name = "doc_type", length = 60, nullable = false) String docType;
    @Column(name = "doc_id", nullable = false) Long docId;
    @Column(name = "step_no", nullable = false) Integer stepNo;
    @Column(name = "role_required", length = 60, nullable = false) String roleRequired;
    @Column(name = "approver_user_id") Long approverUserId;
    @Column(length = 20, nullable = false) @Builder.Default String status = "PENDING";
    @Column(name = "decided_at") Instant decidedAt;
    @Column(length = 500) String comments;
}
