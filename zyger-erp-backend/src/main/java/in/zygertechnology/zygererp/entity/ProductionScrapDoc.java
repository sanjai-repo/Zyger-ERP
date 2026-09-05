package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * P9 — First-class Scrap document (NUM-PROD-SCRAP, {@code SC-...}). Records the
 * disposition of an already-reported {@code scrap_quantity} with a strict disposition
 * (SCRAP / HOLD_MRB — never FREE per D-C1). RECORDING-ONLY: performs no stock movement
 * (inventory stock-status handling awaits a separate Inventory ADR).
 */
@Entity
@Table(name = "production_scrap_doc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProductionScrapDoc extends ProductionDispositionDocBase {

    @Column(name = "scrap_date")
    private LocalDate scrapDate;

    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("lineNo ASC")
    private List<ProductionScrapLine> lines = new ArrayList<>();

    public void setLines(List<ProductionScrapLine> lines) {
        this.lines = new ArrayList<>();
        if (lines != null) {
            int n = 1;
            for (ProductionScrapLine l : lines) {
                if (l == null) {
                    continue;
                }
                l.setDoc(this);
                if (l.getLineNo() == null) {
                    l.setLineNo(n);
                }
                this.lines.add(l);
                n++;
            }
        }
    }
}