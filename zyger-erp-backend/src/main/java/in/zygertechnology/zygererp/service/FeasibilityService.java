package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.ItemMaster;
import in.zygertechnology.zygererp.entity.ProductionBOM;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import in.zygertechnology.zygererp.repo.ItemRepository;
import in.zygertechnology.zygererp.repo.ProductionBOMRepository;
import in.zygertechnology.zygererp.repo.StockBalanceRepository;

/**
 * Feasibility ("FG Possible") engine (Planning FRS §16). Shared by the /fg-possible/check endpoint,
 * the FG Possible persistence screens and Production Entry (Phase 3).
 *
 * <p>Fixes vs the previous inline check:
 * <ul>
 *   <li>MAX/MIN are now computed across <b>all</b> BOM lines, not just the SHORT ones — previously a
 *       fully-stocked BOM returned the caller's target qty (or 0) instead of the true producible qty,
 *       and the "short only" reduction made the max-mode depend on data ordering.</li>
 *   <li>WIP ({@code material_reservation} rows not yet released), open-PO supplier qty and the required
 *       qty per item of finished good are now surfaced on every breakdown row.</li>
 *   <li>{@code includeWip} / {@code includeOpenPo} flags from the request are honoured instead of ignored.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class FeasibilityService {

    private final ProductionBOMRepository productionBoms;
    private final StockBalanceRepository stockBalances;
    private final ItemRepository items;
    private final BomExplosionService bomExplosionService;
    private final EntityManager em;

    /** Stock picture for a component under the requested aggregation flags. */
    public record StockView(BigDecimal available, BigDecimal wip, BigDecimal supplierQty, BigDecimal totalStock) {
        public static StockView of(BigDecimal available, BigDecimal wip, BigDecimal supplierQty) {
            BigDecimal avail = available == null ? BigDecimal.ZERO : available;
            BigDecimal w = wip == null ? BigDecimal.ZERO : wip;
            BigDecimal s = supplierQty == null ? BigDecimal.ZERO : supplierQty;
            return new StockView(avail, w, s, avail.add(w).add(s));
        }
    }

    public Map<String, Object> checkFeasibility(String itemCode, BigDecimal targetQty,
                                                boolean includeWip, boolean includeOpenPo) {
        List<ProductionBOM> boms = productionBoms.findByItemCode(itemCode);
        ProductionBOM bom = boms.stream()
                .filter(b -> !"REJECTED".equals(b.getStatus()) && !"OBSOLETE".equals(b.getStatus()))
                .findFirst()
                .orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();
        if (bom == null) {
            result.put("maxProducibleQty", BigDecimal.ZERO);
            result.put("limitingComponent", "No BOM found");
            result.put("minPossibleQty", BigDecimal.ZERO);
            result.put("minPossibleLimitingComponent", "No BOM found");
            result.put("isFeasible", false);
            result.put("breakdown", List.of());
            return result;
        }

        List<BomExplosionService.Requirement> requirements = bomExplosionService.requirementsPerRootUnit(bom);

        BigDecimal maxProducible = null;
        BigDecimal minProducible = null;
        String limitingComponent = "None";
        String minPossibleLimitingComponent = "None";

        List<Map<String, Object>> breakdown = new ArrayList<>();
        for (BomExplosionService.Requirement req : requirements) {
            String compCode = req.getComponentItemCode();
            BigDecimal perRoot = req.getPerRootQty();

            StockView stock = stockView(compCode, includeWip, includeOpenPo);
            Optional<ItemMaster> compItem = items.findByCode(compCode);
            BigDecimal safetyStock = compItem.map(ItemMaster::getSafetyStock).orElse(BigDecimal.ZERO);
            if (safetyStock == null) safetyStock = BigDecimal.ZERO;
            BigDecimal availableAboveSafety = stock.available().subtract(safetyStock).max(BigDecimal.ZERO);

            BigDecimal requiredForTarget = targetQty != null ? perRoot.multiply(targetQty) : perRoot;

            BigDecimal canProduce = perRoot.compareTo(BigDecimal.ZERO) > 0
                    ? stock.available().divide(perRoot, 0, RoundingMode.FLOOR) : BigDecimal.ZERO;
            BigDecimal canProduceMin = perRoot.compareTo(BigDecimal.ZERO) > 0
                    ? availableAboveSafety.divide(perRoot, 0, RoundingMode.FLOOR) : BigDecimal.ZERO;

            // MIN across every line — fixes the legacy "SHORT-only" reduction.
            if (maxProducible == null || canProduce.compareTo(maxProducible) < 0) {
                maxProducible = canProduce;
                limitingComponent = compCode;
            }
            if (minProducible == null || canProduceMin.compareTo(minProducible) < 0) {
                minProducible = canProduceMin;
                minPossibleLimitingComponent = compCode;
            }

            boolean ok = requiredForTarget.compareTo(BigDecimal.ZERO) >= 0
                    && stock.available().compareTo(requiredForTarget) >= 0;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("componentCode", compCode);
            row.put("componentDescription", compItem.map(ItemMaster::getDescription).orElse(""));
            row.put("uom", compItem.map(ItemMaster::getUom).orElse(""));
            row.put("qtyPerUnit", perRoot);
            row.put("requiredQty", requiredForTarget);
            row.put("availableQty", stock.available());
            row.put("wipQty", stock.wip());
            row.put("supplierQty", stock.supplierQty());
            row.put("totalStock", stock.totalStock());
            row.put("safetyStock", safetyStock);
            row.put("availableAboveSafety", availableAboveSafety);
            row.put("producibleQty", canProduce);
            row.put("status", ok ? "OK" : "SHORT");
            breakdown.add(row);
        }

        if (maxProducible == null) maxProducible = BigDecimal.ZERO;
        if (minProducible == null) minProducible = BigDecimal.ZERO;
        boolean feasible = maxProducible.compareTo(BigDecimal.ZERO) > 0
                && (targetQty == null || maxProducible.compareTo(targetQty) >= 0);

        result.put("maxProducibleQty", maxProducible);
        result.put("limitingComponent", limitingComponent);
        result.put("minPossibleQty", minProducible);
        result.put("minPossibleLimitingComponent", minPossibleLimitingComponent);
        result.put("isFeasible", feasible);
        result.put("breakdown", breakdown);
        return result;
    }

    /** Free stock + (optionally) active WIP reservations + (optionally) open purchase-order qty. */
    @Transactional(readOnly = true)
    public StockView stockView(String itemCode, boolean includeWip, boolean includeOpenPo) {
        BigDecimal available = stockBalances.sumAvailableByItem(itemCode, null);
        BigDecimal wip = BigDecimal.ZERO;
        BigDecimal openPo = BigDecimal.ZERO;
        try {
            if (includeWip) {
                wip = em.createQuery(
                                "select coalesce(sum(mr.reservedQty),0) from MaterialReservation mr " +
                                "where mr.itemCode = :c and mr.status = 'RESERVED' and mr.releasedDate is null",
                                BigDecimal.class)
                        .setParameter("c", itemCode).getSingleResult();
            }
        } catch (RuntimeException ignored) {
            wip = BigDecimal.ZERO;
        }
        try {
            if (includeOpenPo) {
                openPo = em.createQuery(
                                "select coalesce(sum(l.orderQty),0) from PurchaseOrder po join po.lines l " +
                                "where l.itemName = :c and po.status not in ('CLOSED','CANCELLED','REJECTED')",
                                BigDecimal.class)
                        .setParameter("c", itemCode).getSingleResult();
            }
        } catch (RuntimeException ignored) {
            openPo = BigDecimal.ZERO;
        }
        return StockView.of(available, wip, openPo);
    }
}