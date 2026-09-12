package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prod_req_material")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProdReqMaterial {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "req_no", unique = true, length = 60)
    String reqNo;

    @Column(name = "job_card_id")
    Long jobCardId;

    @Column(name = "job_card_number", length = 60)
    String jobCardNumber;

    @Column(name = "work_order_number", length = 60)
    String workOrderNumber;

    @Column(name = "req_date")
    LocalDate reqDate;

    @Column(length = 30)
    @Builder.Default String status = "DRAFT";

    @Column(name = "requested_by", length = 60)
    String requestedBy;

    @Column(length = 500)
    String remarks;

    @Column(name = "issued_at")
    Instant issuedAt;

    @Column(name = "closed_at")
    Instant closedAt;

    @Version Long version;

    @Column(name = "created_by", length = 60)
    String createdBy;

    @Column(name = "created_at")
    Instant createdAt;

    @Column(name = "updated_by", length = 60)
    String updatedBy;

    @Column(name = "updated_at")
    Instant updatedAt;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    List<ProdReqMaterialLine> lines = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (reqDate == null) reqDate = LocalDate.now();
    }
}