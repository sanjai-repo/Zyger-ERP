package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "vendor_master")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VendorMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 60, unique = true, nullable = false) String code;
    @Column(length = 200, nullable = false) String name;
    @Column(length = 120) String contactPerson;
    @Column(length = 40) String contactPhone;
    @Column(length = 120) String email;
    @Column(length = 100) String serviceCategory;
    @Builder.Default Boolean active = true;
    String createdBy; Instant createdAt; String updatedBy; Instant updatedAt;
}