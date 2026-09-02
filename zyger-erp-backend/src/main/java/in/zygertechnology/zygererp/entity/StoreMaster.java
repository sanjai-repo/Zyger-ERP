package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "store_master")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class StoreMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60) String code;
    @Column(length = 200) String name;
    @Column(length = 500) String description;
    @Column(name = "store_type", length = 60) String storeType;
    @Column(length = 60) String department;
    @Column(name = "location_ref", length = 60) String locationRef;
    @Column(name = "is_qc_hold") @Builder.Default Boolean isQcHold = Boolean.FALSE;
    @Column(name = "is_wip") @Builder.Default Boolean isWip = Boolean.FALSE;
    @Column(name = "is_finished") @Builder.Default Boolean isFinished = Boolean.FALSE;
    @Column(name = "is_raw") @Builder.Default Boolean isRaw = Boolean.FALSE;
    @Column(name = "is_scrap") @Builder.Default Boolean isScrap = Boolean.FALSE;
    @Column(name = "is_dispatch") @Builder.Default Boolean isDispatch = Boolean.FALSE;
    @Column(name = "bin_location", length = 100) String binLocation;
    @Column(precision = 12, scale = 2) BigDecimal capacity;
    @Column(length = 500) String remarks;
    @Builder.Default Boolean active = Boolean.TRUE;
    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;
    @Version Long version;

    public boolean isActive() { return Boolean.TRUE.equals(active); }
    public boolean isQcHold() { return Boolean.TRUE.equals(isQcHold); }
    public boolean isWip() { return Boolean.TRUE.equals(isWip); }
    public boolean isFinished() { return Boolean.TRUE.equals(isFinished); }
    public boolean isRaw() { return Boolean.TRUE.equals(isRaw); }
    public boolean isScrap() { return Boolean.TRUE.equals(isScrap); }
    public boolean isDispatch() { return Boolean.TRUE.equals(isDispatch); }
}
