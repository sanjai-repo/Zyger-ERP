package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "tool_master")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ToolMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60) String code;
    @Column(length = 200) String name;
    @Column(name = "tool_type", length = 60) String toolType;
    @Column(length = 200) String specification;
    @Column(length = 200) String location;
    @Column(name = "max_life") Integer maxLife;
    @Column(length = 30) String status;
    @Column(length = 100) String material;
    @Column(length = 100) String shape;
    @Column(length = 100) String dimension;
    @Column(name = "machine_compatible", length = 200) String machineCompatible;
    @Column(precision = 10, scale = 4) BigDecimal diameter;
    @Column(name = "flute_length", precision = 10, scale = 4) BigDecimal fluteLength;
    @Column(name = "overall_length", precision = 10, scale = 4) BigDecimal overallLength;
    @Column(name = "holder_type", length = 100) String holderType;
    @Column(name = "tool_life_count", precision = 12, scale = 2) BigDecimal toolLifeCount;
    @Column(name = "tool_life_unit", length = 30) @Builder.Default String toolLifeUnit = "PIECES";
    @Column(name = "current_usage", precision = 12, scale = 2) @Builder.Default BigDecimal currentUsage = BigDecimal.ZERO;
    @Column(name = "supplier_code", length = 60) String supplierCode;
    @Column(name = "unit_cost", precision = 12, scale = 2) BigDecimal unitCost;
    @Column(name = "reorder_level", precision = 12, scale = 2) BigDecimal reorderLevel;
    @Column(name = "current_status", length = 30) @Builder.Default String currentStatus = "AVAILABLE";
    @Column(name = "store_code", length = 60) String storeCode;
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @Version Long version;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}
