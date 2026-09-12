package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "pm_checklist_template_item")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PmChecklistTemplateItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "template_id") PmChecklistTemplate template;
    @Column(name = "activity_id") Long activityId;
    @Column(name = "activity_name", length = 200) String activityName;
    @Column(name = "is_mandatory") @Builder.Default Boolean isMandatory = true;
    @Column(name = "sort_order") @Builder.Default Integer sortOrder = 0;
}
