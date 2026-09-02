package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import in.zygertechnology.zygererp.config.AuditEntityListener;

@Entity
@Table(name = "item_bom_component", indexes = {
        @Index(name = "idx_bom_parent", columnList = "parent_item_code"),
        @Index(name = "idx_bom_comp", columnList = "component_item_code")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditEntityListener.class)
public class ItemBomComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "parent_item_code", length = 60, nullable = false)
    private String parentItemCode;

    @Column(name = "component_item_code", length = 60, nullable = false)
    private String componentItemCode;

    @Column(name = "component_name", length = 200)
    private String componentName;

    @Column(name = "qty_per_parent", precision = 12, scale = 4, nullable = false)
    @Builder.Default
    private BigDecimal qtyPerParent = BigDecimal.ONE;

    @Column(name = "component_uom", length = 20)
    private String componentUom;

    @Column(name = "scrap_wastage_pct", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal scrapWastagePct = BigDecimal.ZERO;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "optional_alternate", length = 30)
    @Builder.Default
    private String optionalAlternate = "MANDATORY";
}
