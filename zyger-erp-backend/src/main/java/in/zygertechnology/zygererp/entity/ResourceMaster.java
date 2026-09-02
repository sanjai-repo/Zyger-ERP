package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "resource_master")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ResourceMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Version Long version;

    @Column(name = "resource_code", unique = true, nullable = false, length = 60)
    String resourceCode;

    @Column(name = "resource_name", nullable = false, length = 200)
    String resourceName;

    /** FRS §4.3: Machine, Labour, Tool, Vendor */
    @Column(name = "resource_type", nullable = false, length = 30)
    String resourceType;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default BigDecimal capacity = BigDecimal.ONE;

    /** FRS §4.3: Pieces/Hour, Kg/Hour, Hours, Pieces/Day */
    @Column(name = "capacity_uom", nullable = false, length = 30)
    @Builder.Default String capacityUom = "Pieces/Hour";

    @Column(length = 100)
    String department;

    /** FRS §4.3: Active, Inactive */
    @Column(nullable = false, length = 20)
    @Builder.Default String status = "Active";

    @Builder.Default Boolean active = Boolean.TRUE;

    @Column(name = "hourly_rate", precision = 12, scale = 2)
    BigDecimal hourlyRate;

    @Column(length = 500)
    String description;

    @Column(name = "plant_id")
    @Builder.Default Long plantId = 1L;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;

    public boolean isActive() { return Boolean.TRUE.equals(active); }
}
