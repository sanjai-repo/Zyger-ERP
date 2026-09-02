package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "spare_part_master")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class SparePartMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", nullable = false)
    PlantMaster plant;

    @Column(length = 60, unique = true, nullable = false)
    String code;

    @Column(length = 200, nullable = false)
    String name;

    @Column(columnDefinition = "TEXT")
    String description;

    @Column(length = 30)
    @Builder.Default String uom = "NOS";

    @Column(name = "reorder_level")
    @Builder.Default BigDecimal reorderLevel = BigDecimal.ZERO;

    @Column(name = "item_id")
    Long itemId;

    @Column(name = "item_code", length = 60)
    String itemCode;

    @Column(name = "unit_cost")
    @Builder.Default BigDecimal unitCost = BigDecimal.ZERO;

    @Builder.Default Boolean active = Boolean.TRUE;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;

    @PrePersist void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
