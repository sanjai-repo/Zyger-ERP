package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "production_entry_operator")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ProductionEntryOperator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_entry_id")
    @JsonIgnore
    private ProductionEntry productionEntry;

    @Column(name = "operator_code", nullable = false, length = 60)
    private String operatorCode;

    @Column(name = "operator_name", length = 200)
    private String operatorName;

    @Column(name = "is_primary")
    private Boolean isPrimary;

    @Column(name = "hours_worked", precision = 14, scale = 2)
    private BigDecimal hoursWorked;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    public void onPrePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (isPrimary == null) isPrimary = false;
        if (hoursWorked == null) hoursWorked = BigDecimal.ZERO;
    }
}
