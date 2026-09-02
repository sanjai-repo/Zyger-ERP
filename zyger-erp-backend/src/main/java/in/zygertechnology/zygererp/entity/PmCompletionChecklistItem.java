package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "pm_completion_checklist_item", indexes = {
    @Index(name = "idx_pmci_completion", columnList = "completion_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PmCompletionChecklistItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "completion_id", nullable = false) Long completionId;
    @Column(name = "activity_id") Long activityId;
    @Column(name = "activity_name", length = 200) String activityName;
    @Column(name = "is_mandatory") @Builder.Default Boolean isMandatory = true;
    @Column(length = 20) String result;  // OK, NOT_OK, NA
    @Column(name = "measured_value", length = 100) String measuredValue;
    @Column(length = 500) String remarks;
    @Column(name = "sort_order") @Builder.Default Integer sortOrder = 0;
}
