package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * P9 — First-class Rework document (NUM-PROD-ENTRY-REWORK, {@code PER-...}). Records the
 * disposition of an already-reported {@code rework_quantity} with source/target operation
 * linkage (CLAR-PROD-005 rework as rework-route subjobs) and FR-PROD-ENTRY-002 linkage
 * (NCR + authorization reference). RECORDING-ONLY; no new rework-routing model.
 */
@Entity
@Table(name = "production_rework_doc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProductionReworkDoc extends ProductionDispositionDocBase {

    @Column(name = "rework_date")
    private LocalDate reworkDate;

    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("lineNo ASC")
    private List<ProductionReworkLine> lines = new ArrayList<>();

    public void setLines(List<ProductionReworkLine> lines) {
        this.lines = new ArrayList<>();
        if (lines != null) {
            int n = 1;
            for (ProductionReworkLine l : lines) {
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