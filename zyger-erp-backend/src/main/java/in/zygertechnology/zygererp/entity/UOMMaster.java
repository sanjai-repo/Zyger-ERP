package in.zygertechnology.zygererp.entity;

import in.zygertechnology.zygererp.config.AuditEntityListener;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "uom_master")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UOMMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 30) String code;
    @Column(length = 100) String name;
    @Column(length = 20) String symbol;
    @Column(name = "base_uom", length = 30) String baseUom;
    @Column(name = "conversion_factor", precision = 12, scale = 4) BigDecimal conversionFactor;
    @Column(length = 500) String description;
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @Version Long version;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}
