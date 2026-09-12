package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "production_log_sheet")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ProductionLogSheet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "log_number", unique = true, length = 60)
    private String logNumber;

    @Column(name = "log_date")
    private Instant logDate;

    @Column(name = "work_order_number", length = 60)
    private String workOrderNumber;

    @Column(name = "job_card_number", length = 60)
    private String jobCardNumber;

    @Column(name = "machine_code", length = 60)
    private String machineCode;

    @Column(name = "operator_code", length = 60)
    private String operatorCode;

    @Column(name = "shift_code", length = 60)
    private String shiftCode;

    @Column(name = "subjob_number", length = 60) String subjobNumber;

    @Column(name = "plant_id") Long plantId;

    @Column(name = "supervisor_verified_by", length = 100) String supervisorVerifiedBy;
    @Column(name = "supervisor_verified_at") Instant supervisorVerifiedAt;

    @Column(length = 30)
    private String status;

    @Column(length = 500)
    private String remarks;

    @OneToMany(mappedBy = "logSheet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<ProductionLogActivity> activities = new ArrayList<>();

    @Version
    private Long version;

    @Column(name = "created_by", length = 60)
    private String createdBy;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_by", length = 60)
    private String updatedBy;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
