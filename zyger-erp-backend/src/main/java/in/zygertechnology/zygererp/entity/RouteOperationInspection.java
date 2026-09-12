package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "route_operation_inspection")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteOperationInspection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_operation_id", nullable = false)
    @JsonIgnore
    RouteOperation routeOperation;

    @Column(name = "parameter_name", nullable = false, length = 200)
    String parameterName;

    @Column(name = "parameter_type", length = 30)
    String parameterType;

    @Column(name = "nominal_value", length = 100)
    String nominalValue;

    @Column(name = "tolerance_plus", length = 100)
    String tolerancePlus;

    @Column(name = "tolerance_minus", length = 100)
    String toleranceMinus;

    @Column(name = "inspection_method", length = 100)
    String inspectionMethod;

    @Column(name = "tool_gauge", length = 100)
    String toolGauge;

    @Column(length = 50)
    String frequency;

    @Column(name = "is_mandatory")
    @Builder.Default Boolean isMandatory = true;

    @Column(name = "sort_order")
    @Builder.Default Integer sortOrder = 0;

    @Column(length = 500)
    String remarks;
}
