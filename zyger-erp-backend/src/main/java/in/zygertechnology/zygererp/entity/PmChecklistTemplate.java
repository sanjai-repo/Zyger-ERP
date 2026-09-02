package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pm_checklist_template")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PmChecklistTemplate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(length = 200, nullable = false) String name;
    @Column(name = "machine_type", length = 60) String machineType;
    @Builder.Default Boolean active = true;
    String createdBy; Instant createdAt; String updatedBy; Instant updatedAt;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default List<PmChecklistTemplateItem> items = new ArrayList<>();
}
