package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "route_operation_tool") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class RouteOperationTool {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "route_operation_id", nullable = false)
    @JsonIgnore
    RouteOperation routeOperation;

    @Column(name = "tool_code", length = 60, nullable = false) String toolCode;
    @Column(name = "tool_description", length = 200) String toolDescription;
    @Column(name = "tool_type", length = 30) String toolType;
    @Column(name = "quantity_required", precision = 10, scale = 2) java.math.BigDecimal quantityRequired;
    @Column(name = "setup_time_min") java.math.BigDecimal setupTimeMin;
    @Column(length = 300) String remarks;
}
