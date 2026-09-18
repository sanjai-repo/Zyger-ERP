package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.ProductionBOM;
import in.zygertechnology.zygererp.entity.ProductionBOMLine;
import in.zygertechnology.zygererp.repo.ProductionBOMRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Shared BOM explosion engine (Planning FRS §23). Replaces the inline per-run BOM walker in
 * PlanningMasterController so MRP, FG Possible and Cost Estimation all use one definition.
 *
 * <p>Correctness notes vs the previous inline walker:
 * <ul>
 *   <li><b>Scrap adjustment</b> — effective qty = quantityPer × (1 + scrap%) applied at every level.</li>
 *   <li><b>Phantom awareness</b> — a phantom line ({@link ProductionBOMLine#getIsPhantom()}) with a child
 *       BOM contributes no demand of its own; its child's requirements are exploded through it.</li>
 *   <li><b>Per-tree cycle guard</b> — the visited set follows the BST path (added on entry, removed on
 *       exit) instead of a run-wide set keyed by component, so a sub-assembly referenced by two parents
 *       in the same tree accrues demand from both.</li>
 *   <li><b>Multi-level</b> — non-phantom sub-assemblies are recorded as demand <em>and</em> their children
 *       exploded below them, matching the previous MRP depth-5 behaviour.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class BomExplosionService {

    private final ProductionBOMRepository productionBoms;

    @Getter
    public static class Requirement {
        private final String componentItemCode;
        /** scrap-adjusted qty required per unit of the immediate parent */
        private final BigDecimal effectiveQtyPer;
        /** scrap-adjusted qty required per single unit of the root finished item */
        private final BigDecimal perRootQty;
        private final int level;
        private final boolean phantom;
        private final Long sourceBomId;

        public Requirement(String componentItemCode, BigDecimal effectiveQtyPer,
                           BigDecimal perRootQty, int level, boolean phantom, Long sourceBomId) {
            this.componentItemCode = componentItemCode;
            this.effectiveQtyPer = effectiveQtyPer;
            this.perRootQty = perRootQty;
            this.level = level;
            this.phantom = phantom;
            this.sourceBomId = sourceBomId;
        }
    }

    /** Default maximum explosion depth, matching the legacy MRP walker. */
    private static final int DEFAULT_MAX_DEPTH = 5;

    public List<Requirement> requirementsPerRootUnit(ProductionBOM bom) {
        return requirementsPerRootUnit(bom, DEFAULT_MAX_DEPTH);
    }

    /**
     * Multi-level, phantom-aware explosion of {@code bom}, each requirement scaled per single unit
     * of {@code bom}'s finished item.
     */
    public List<Requirement> requirementsPerRootUnit(ProductionBOM bom, int maxDepth) {
        List<Requirement> out = new ArrayList<>();
        walk(bom, BigDecimal.ONE, 0, maxDepth, new HashSet<>(), out);
        return out;
    }

    private void walk(ProductionBOM bom, BigDecimal multiplier, int level, int maxDepth,
                      Set<Long> path, List<Requirement> out) {
        if (bom == null || level > maxDepth) return;
        if (!path.add(bom.getId())) return; // cycle guard
        try {
            for (ProductionBOMLine line : bom.getLines()) {
                if (Boolean.FALSE.equals(line.getIsActive())) continue;
                BigDecimal qtyPer = line.getQuantityPer() == null ? BigDecimal.ONE : line.getQuantityPer();
                BigDecimal scrapPct = line.getScrapPercentage() == null ? BigDecimal.ZERO : line.getScrapPercentage();
                BigDecimal effectiveQtyPer = lineEffectiveQtyPer(line, qtyPer, scrapPct);
                BigDecimal perRoot = multiplier.multiply(effectiveQtyPer);

                boolean phantom = Boolean.TRUE.equals(line.getIsPhantom());
                Long childBomId = line.getChildBomId();
                ProductionBOM childBom = childBomId != null ? productionBoms.findById(childBomId).orElse(null) : null;

                if (phantom) {
                    // Explode straight through the phantom to its child BOM's components.
                    if (childBom != null) {
                        walk(childBom, perRoot, level + 1, maxDepth, path, out);
                    } else {
                        // Phantom flagged with no child BOM — nothing to blow through, so the
                        // otherwise-invisible component would otherwise be lost; keep demand.
                        out.add(new Requirement(line.getComponentItemCode(), effectiveQtyPer, perRoot, level, true, bom.getId()));
                    }
                } else {
                    out.add(new Requirement(line.getComponentItemCode(), effectiveQtyPer, perRoot, level, false, bom.getId()));
                    if (childBom != null) {
                        walk(childBom, perRoot, level + 1, maxDepth, path, out);
                    }
                }
            }
        } finally {
            path.remove(bom.getId());
        }
    }

    static BigDecimal lineEffectiveQtyPer(ProductionBOMLine line, BigDecimal qtyPer, BigDecimal scrapPct) {
        return qtyPer.multiply(BigDecimal.ONE.add(
                scrapPct.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP)));
    }
}