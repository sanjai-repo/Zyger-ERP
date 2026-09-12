package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * P8 — Additional (co/by-product) output of a {@link ProductionEntry}
 * (FR-PROD-ENTRY-003, BK-013). One row per (entry, output_type, item_code, location)
 * — the deterministic natural key enforced by UNIQUE in V7.
 *
 * <p>RECORDING-ONLY (Capability A): these rows are authoritative production facts that
 * feed production history/audit and the derived {@code prod_output_event} projection.
 * They NEVER invoke {@code StockService}, and they NEVER enter the committed WIP /
 * pending / produced reconciliation, which is defined by CLAR-002 over the PRIMARY stage
 * quantities (good/rejected/rework/scrap) only.
 */
@Entity
@Table(name = "production_entry_output",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_production_entry_output_key",
                columnNames = {"production_entry_id", "output_type", "item_code", "location"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionEntryOutput {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_entry_id", nullable = false)
    @JsonIgnore
    private ProductionEntry productionEntry;

    @Column(name = "output_type", nullable = false, length = 30)
    private String outputType;

    @Column(name = "item_code", nullable = false, length = 60)
    private String itemCode;

    @Column(name = "item_name", length = 200)
    private String itemName;

    @Column(length = 20)
    private String uom;

    @Column(nullable = false, length = 60)
    @Builder.Default
    private String location = "STORE";

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(precision = 14, scale = 4)
    private BigDecimal weight;

    @Column(name = "destination_stage_code", length = 60)
    private String destinationStageCode;

    @Column(length = 255)
    private String remarks;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    public void onPrePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (location == null || location.isBlank()) location = "STORE";
    }
}