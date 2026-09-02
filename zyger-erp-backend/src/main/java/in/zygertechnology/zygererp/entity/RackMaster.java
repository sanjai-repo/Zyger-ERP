package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "rack_master")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class RackMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60) String code;
    @Column(length = 200) String name;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id") StoreMaster store;
    @Column(length = 200) String location;
    @Column(precision = 12, scale = 2) BigDecimal capacity;
    @Column(name = "capacity_unit", length = 30) String capacityUnit;
    @Column(length = 500) String remarks;
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @Version Long version;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}
