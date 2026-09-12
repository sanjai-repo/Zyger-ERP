package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "reject_reason_master", uniqueConstraints = @UniqueConstraint(columnNames = {"plant_id", "code"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class RejectReasonMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Builder.Default
    @Column(name = "plant_id") Long plantId = 1L;
    @Column(length = 60, nullable = false) String code;
    @Column(length = 200) String description;
    @Builder.Default Boolean active = Boolean.TRUE;
}
