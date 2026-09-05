package in.zygertechnology.zygererp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * P9 — First-class Rejection/Defect Record document (NUM-PROD-REJ, {@code REJ-...}).
 * Classifies an already-reported {@code rejected_quantity} per R1: lines carry a
 * disposition of REWORKABLE / SCRAP / HOLD_MRB (BR-PROD-REJ-001).
 */
@Entity
@Table(name = "production_rejection_doc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProductionRejectionDoc extends ProductionDispositionDocBase {

    @Column(name = "inspection_date")
    private LocalDate inspectionDate;

    @Column(length = 80)
    private String inspector;

    @Column(name = "ncr_number", length = 80)
    private String ncrNumber;

    @OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("lineNo ASC")
    private List<ProductionRejectionLine> lines = new ArrayList<>();

    public void setLines(List<ProductionRejectionLine> lines) {
        this.lines = new ArrayList<>();
        if (lines != null) {
            int n = 1;
            for (ProductionRejectionLine l : lines) {
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