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
@Table(name = "prod_consumption")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProductionConsumption {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "consumption_no", unique = true, length = 60)
    String consumptionNo;

    @Column(name = "job_card_id")
    Long jobCardId;

    @Column(name = "job_card_number", length = 60)
    String jobCardNumber;

    @Column(name = "work_order_number", length = 60)
    String workOrderNumber;

    @Column(name = "material_request_no", length = 60)
    String materialRequestNo;

    @Column(name = "consumption_date")
    LocalDate consumptionDate;

    @Column(length = 30)
    @Builder.Default String status = "DRAFT";

    @Column(name = "posted_at")
    Instant postedAt;

    @Column(length = 500)
    String remarks;

    @Version Long version;

    @Column(name = "created_by", length = 60)
    String createdBy;

    @Column(name = "created_at")
    Instant createdAt;

    @Column(name = "updated_by", length = 60)
    String updatedBy;

    @Column(name = "updated_at")
    Instant updatedAt;

    @OneToMany(mappedBy = "consumption", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    List<ProductionConsumptionLine> lines = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (consumptionDate == null) consumptionDate = LocalDate.now();
    }
}