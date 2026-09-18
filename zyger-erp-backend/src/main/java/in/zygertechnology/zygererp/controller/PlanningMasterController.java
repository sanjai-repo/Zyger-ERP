package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import in.zygertechnology.zygererp.service.BomExplosionService;
import in.zygertechnology.zygererp.service.DocNumberService;
import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.FeasibilityService;
import in.zygertechnology.zygererp.service.PlanningService;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.Principal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequirePermission(module = "PLANNING", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class PlanningMasterController {

    private final MaterialPlanRepository materialPlans;
    private final MaterialPlanLineRepository materialPlanLines;
    private final DispatchPlanRepository dispatchPlans;
    private final DispatchPlanLineRepository dispatchPlanLines;
    private final MachineLoadPlanRepository machineLoadPlans;
    private final MachineLoadLineRepository machineLoadLines;
    private final EngineeringChangeRepository engineeringChanges;
    private final GapAnalysisRunRepository gapAnalysisRuns;
    private final GapAnalysisResultRepository gapAnalysisResults;
    private final CostEstimationRepository costEstimations;
    private final CostEstimationLineRepository costEstimationLines;
    private final WorkOrderRepository workOrders;
    private final ProductionBOMRepository productionBoms;
    private final RouteSheetRepository routeSheets;
    private final ItemRepository items;
    private final WorkCenterRepository workCenters;
    private final MachineMasterRepository machines;
    private final DocNumberService numbers;
    private final StockBalanceRepository stockBalances;
    private final jakarta.persistence.EntityManager em;
    private final in.zygertechnology.zygererp.repository.ApprovalStepRepository approvalSteps;
    private final in.zygertechnology.zygererp.repository.EscalationRuleRepository escalationRules;
    private final in.zygertechnology.zygererp.service.NotificationService notificationService;
    private final MaterialReservationRepository materialReservations;
    private final MachineOperatingHoursRepository machineOperatingHours;
    private final FgPossibleRepository fgPossibles;
    private final CostComponentTypeRepository costComponentTypes;
    private final RouteOperationInspectionRepository routeOpInspections;
    private final EcrRiskLineRepository ecrRiskLines;
    private final FeasibilityService feasibilityService;
    private final BomExplosionService bomExplosionService;
    private final DocumentFacade documentFacade;
    private final PlanningService planningService;

    private String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    // ===========================
    // ---- Material Planning ----
    // ===========================

    @GetMapping("/api/v1/planning/material-plans")
    public List<MaterialPlan> listMaterialPlans() { return materialPlans.findAll(); }

    @PostMapping("/api/v1/planning/material-plans")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public MaterialPlan createMaterialPlan(@RequestBody MaterialPlan p, Principal principal) {
        p.setId(null);
        p.setPlanNumber(numbers.next("material-plan", "MP"));
        if (p.getPlanDate() == null) p.setPlanDate(Instant.now());
        if (p.getStatus() == null) p.setStatus("DRAFT");
        p.setCreatedBy(principalName(principal));
        p.setCreatedAt(Instant.now());
        return materialPlans.save(p);
    }

    @GetMapping("/api/v1/planning/material-plans/{id}")
    public MaterialPlan getMaterialPlan(@PathVariable Long id) {
        return materialPlans.findById(id).orElseThrow(() -> new RuntimeException("Material Plan not found"));
    }

    @PutMapping("/api/v1/planning/material-plans/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public MaterialPlan updateMaterialPlan(@PathVariable Long id, @RequestBody MaterialPlan p, Principal principal) {
        MaterialPlan e = materialPlans.findById(id).orElseThrow(() -> new RuntimeException("Material Plan not found"));
        p.setId(id);
        p.setPlanNumber(e.getPlanNumber());
        p.setCreatedAt(e.getCreatedAt());
        p.setCreatedBy(e.getCreatedBy());
        p.setUpdatedAt(Instant.now());
        p.setUpdatedBy(principalName(principal));
        return materialPlans.save(p);
    }

    @DeleteMapping("/api/v1/planning/material-plans/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteMaterialPlan(@PathVariable Long id) {
        MaterialPlan e = materialPlans.findById(id).orElseThrow(() -> new RuntimeException("Material Plan not found"));
        if (!"DRAFT".equals(e.getStatus())) throw new RuntimeException("Only DRAFT plans can be deleted");
        materialPlanLines.findByPlanId(id).forEach(l -> materialPlanLines.deleteById(l.getId()));
        materialPlans.deleteById(id);
    }

    @GetMapping("/api/v1/planning/material-plans/{id}/lines")
    public List<MaterialPlanLine> getMaterialPlanLines(@PathVariable Long id) {
        return materialPlanLines.findByPlanId(id);
    }

    @PostMapping("/api/v1/planning/material-plans/{id}/lines")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public MaterialPlanLine addMaterialPlanLine(@PathVariable Long id, @RequestBody MaterialPlanLine line, Principal principal) {
        MaterialPlan plan = materialPlans.findById(id).orElseThrow(() -> new RuntimeException("Material Plan not found"));
        line.setId(null);
        line.setPlan(plan);
        if (line.getGrossRequirement() == null) line.setGrossRequirement(BigDecimal.ZERO);
        if (line.getOnHandStock() == null) line.setOnHandStock(BigDecimal.ZERO);
        if (line.getOnOrderQty() == null) line.setOnOrderQty(BigDecimal.ZERO);
        if (line.getWipQty() == null) line.setWipQty(BigDecimal.ZERO);
        if (line.getSafetyStock() == null) line.setSafetyStock(BigDecimal.ZERO);
        if (line.getNetRequirement() == null) {
            line.setNetRequirement(
                line.getGrossRequirement()
                    .subtract(line.getOnHandStock())
                    .subtract(line.getOnOrderQty())
                    .subtract(line.getWipQty())
                    .add(line.getSafetyStock())
            );
        }
        if (line.getRecommendedOrderQty() == null) line.setRecommendedOrderQty(line.getNetRequirement().max(BigDecimal.ZERO));
        line.setCreatedAt(Instant.now());
        return materialPlanLines.save(line);
    }

    @PutMapping("/api/v1/planning/material-plans/lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public MaterialPlanLine updateMaterialPlanLine(@PathVariable Long lineId, @RequestBody MaterialPlanLine line, Principal principal) {
        MaterialPlanLine e = materialPlanLines.findById(lineId).orElseThrow(() -> new RuntimeException("Material Plan Line not found"));
        line.setId(lineId);
        line.setPlan(e.getPlan());
        line.setCreatedAt(e.getCreatedAt());
        line.setUpdatedAt(Instant.now());
        return materialPlanLines.save(line);
    }

    @DeleteMapping("/api/v1/planning/material-plans/lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteMaterialPlanLine(@PathVariable Long lineId) { materialPlanLines.deleteById(lineId); }

    private static final Set<String> MANUFACTURING_ITEM_TYPES = Set.of("SEMI_FG", "FG", "SFG", "MANUFACTURING");
    private static final Set<String> PURCHASE_ITEM_TYPES = Set.of("RAW_MATERIAL", "PURCHASABLE");

    /** FRS §5: all demand-source planning types known to the MRP engine. Unknown values fail loudly. */
    private static final Set<String> VALID_PLANNING_TYPES = Set.of(
        "ALL", "SALES_WORK_ORDER", "INVENTORY_WORK_ORDER",
        "MIN_STOCK_MANUFACTURING_ITEM", "MIN_STOCK_PURCHASE_ITEM",
        "FIXED_SALES_ORDER", "SCHEDULE_SALES_ORDER", "MANUAL");

    /** One demand record fed into the BOM explosion — a work order, a fixed SO line, or a schedule line. */
    private record Demand(String itemCode, BigDecimal qty, String sourceRef, Long bomId) {}

    // ---- MRP Run ----
    @PostMapping("/api/v1/planning/material-plans/{id}/run")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public MaterialPlan runMRP(@PathVariable Long id) {
        MaterialPlan plan = materialPlans.findById(id).orElseThrow(() -> new RuntimeException("Material Plan not found"));
        materialPlanLines.findByPlanId(id).forEach(l -> materialPlanLines.deleteById(l.getId()));

        String planningType = plan.getPlanningType() == null || plan.getPlanningType().isBlank() ? "ALL" : plan.getPlanningType();
        if (!VALID_PLANNING_TYPES.contains(planningType)) {
            throw new RuntimeException("Unknown planningType '" + planningType + "'. Supported: "
                + String.join(", ", VALID_PLANNING_TYPES));
        }
        boolean withoutStock = "RUN_WITHOUT_STOCK".equals(plan.getRunMode());

        // FRS §5: MANUAL means the plan carries only user-entered lines — skip auto-explosion entirely.
        if ("MANUAL".equals(planningType)) {
            plan.setStatus("COMPLETE");
            plan.setUpdatedAt(Instant.now());
            return materialPlans.save(plan);
        }

        List<WorkOrder> allActiveWOs = new ArrayList<>(workOrders.findByStatus("RELEASED"));
        allActiveWOs.addAll(workOrders.findByStatus("IN_PROCESS"));

        // FRS §5: Planning Type selects the demand source this run explodes. Unlike the legacy
        // implementation everything travels as a Demand — SO-driven runs have no Work Order at all.
        List<Demand> demands = new ArrayList<>();
        switch (planningType) {
            case "SALES_WORK_ORDER" -> demands.addAll(woDemands(allActiveWOs, true));
            case "INVENTORY_WORK_ORDER" -> demands.addAll(woDemands(allActiveWOs, false));
            case "ALL" -> demands.addAll(woDemands(allActiveWOs, null));
            case "FIXED_SALES_ORDER" -> demands.addAll(fixedSalesOrderDemands());
            case "SCHEDULE_SALES_ORDER" -> demands.addAll(scheduleSalesOrderDemands());
            case "MIN_STOCK_MANUFACTURING_ITEM", "MIN_STOCK_PURCHASE_ITEM" -> { /* handled below, no WO explosion */ }
            default -> throw new RuntimeException("Unknown planningType '" + planningType + "'");
        }

        Map<String, BigDecimal> grossByItem = new LinkedHashMap<>();
        Map<String, Integer> maxLevelByItem = new LinkedHashMap<>();
        Map<String, String> sourceWoByItem = new LinkedHashMap<>();

        for (Demand demand : demands) {
            if (demand.itemCode() == null || demand.itemCode().isBlank()) continue;
            ProductionBOM bom = null;
            if (demand.bomId() != null) {
                bom = productionBoms.findById(demand.bomId()).orElse(null);
            } else {
                bom = usableBomForItem(demand.itemCode());
            }
            if (bom == null) {
                // Purchased / no-BOM demand — the finished item itself is the requirement.
                grossByItem.merge(demand.itemCode(), demand.qty(), BigDecimal::add);
                maxLevelByItem.putIfAbsent(demand.itemCode(), 0);
                sourceWoByItem.putIfAbsent(demand.itemCode(), demand.sourceRef());
                continue;
            }
            for (BomExplosionService.Requirement req : bomExplosionService.requirementsPerRootUnit(bom)) {
                BigDecimal gross = req.getPerRootQty().multiply(demand.qty());
                grossByItem.merge(req.getComponentItemCode(), gross, BigDecimal::add);
                maxLevelByItem.merge(req.getComponentItemCode(), req.getLevel(), Math::max);
                sourceWoByItem.putIfAbsent(req.getComponentItemCode(), demand.sourceRef());
            }
        }

        // FRS §5: Min Stock planning types trigger demand from the item master's reorder point,
        // not from any Work Order — one demand line per item currently below its reorder point.
        if ("MIN_STOCK_MANUFACTURING_ITEM".equals(planningType) || "MIN_STOCK_PURCHASE_ITEM".equals(planningType)) {
            Set<String> eligibleTypes = "MIN_STOCK_MANUFACTURING_ITEM".equals(planningType)
                ? MANUFACTURING_ITEM_TYPES : PURCHASE_ITEM_TYPES;
            for (ItemMaster item : items.findAll()) {
                String t = item.getItemType() == null ? "" : item.getItemType().trim().toUpperCase();
                if (!eligibleTypes.contains(t)) continue;
                BigDecimal reorderPoint = item.getReorderPoint() != null ? item.getReorderPoint() : item.getMinStockLevel();
                if (reorderPoint == null) continue;
                BigDecimal onHand = stockBalances.sumAvailableByItem(item.getCode(), null);
                if (onHand == null) onHand = BigDecimal.ZERO;
                if (onHand.compareTo(reorderPoint) >= 0) continue; // not below reorder point — no demand
                BigDecimal reorderQty = item.getReorderQty() != null && item.getReorderQty().compareTo(BigDecimal.ZERO) > 0
                    ? item.getReorderQty() : reorderPoint.subtract(onHand);
                grossByItem.merge(item.getCode(), reorderQty, BigDecimal::add);
                maxLevelByItem.putIfAbsent(item.getCode(), 0);
                sourceWoByItem.putIfAbsent(item.getCode(), "MIN-STOCK");
            }
        }

        for (Map.Entry<String, BigDecimal> entry : grossByItem.entrySet()) {
            String itemCode = entry.getKey();
            BigDecimal gross = entry.getValue();
            Optional<ItemMaster> itemOpt = items.findByCode(itemCode);
            BigDecimal safetyStock = itemOpt.map(ItemMaster::getSafetyStock).orElse(BigDecimal.ZERO);
            if (safetyStock == null) safetyStock = BigDecimal.ZERO;

            BigDecimal onHand = stockBalances.sumAvailableByItem(itemCode, null);
            if (onHand == null) onHand = BigDecimal.ZERO;

            BigDecimal onOrder = allActiveWOs.stream()
                .filter(wo -> wo.getItemCode() != null && wo.getItemCode().equals(itemCode))
                .map(wo -> wo.getOrderQuantity() == null ? BigDecimal.ZERO : wo.getOrderQuantity())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Genuine work-in-process from reservations still open (not yet released back to stock).
            BigDecimal wip = feasibilityService.stockView(itemCode, true, false).wip();

            // FRS §5 Run Mode: "Run MRP W/o Stock" is gross requirement, ignoring on-hand/on-order/
            // safety stock entirely — a distinct code path, not just a stock-qty override, since it
            // also changes what counts as a shortfall.
            BigDecimal net;
            if (withoutStock) {
                onHand = BigDecimal.ZERO;
                onOrder = BigDecimal.ZERO;
                safetyStock = BigDecimal.ZERO;
                wip = BigDecimal.ZERO;
                net = gross;
            } else {
                BigDecimal available = onHand.add(onOrder).add(wip);
                net = gross.subtract(available).add(safetyStock).max(BigDecimal.ZERO);
            }

            MaterialPlanLine line = new MaterialPlanLine();
            line.setPlan(plan);
            line.setItemCode(itemCode);
            itemOpt.ifPresent(item -> {
                line.setItemDescription(item.getDescription());
                line.setUom(item.getUom());
                line.setLeadTimeDays(item.getLeadTimeDays());
            });
            line.setBomLevel(maxLevelByItem.getOrDefault(itemCode, 0));
            line.setGrossRequirement(gross);
            line.setOnHandStock(onHand);
            line.setOnOrderQty(onOrder);
            line.setWipQty(wip);
            line.setSafetyStock(safetyStock);
            line.setNetRequirement(net);
            line.setRecommendedOrderQty(net.max(BigDecimal.ZERO));
            line.setSourceWoNumber(sourceWoByItem.getOrDefault(itemCode, ""));
            line.setOrderType(resolveOrderType(itemCode, itemOpt.map(ItemMaster::getItemType).orElse(null), allActiveWOs));
            line.setActionStatus("PENDING");
            materialPlanLines.save(line);
        }

        plan.setStatus("COMPLETE");
        plan.setUpdatedAt(Instant.now());
        return materialPlans.save(plan);
    }

    private ProductionBOM usableBomForItem(String itemCode) {
        return productionBoms.findByItemCodeAndIsActiveTrue(itemCode).stream()
            .filter(b -> !"REJECTED".equals(b.getStatus()) && !"OBSOLETE".equals(b.getStatus()))
            .findFirst()
            .orElse(null);
    }

    private List<Demand> woDemands(List<WorkOrder> wos, Boolean salesOnly) {
        List<Demand> out = new ArrayList<>();
        for (WorkOrder wo : wos) {
            if (salesOnly != null && salesOnly != (wo.getSalesOrderId() != null)) continue;
            if (wo.getItemCode() == null || wo.getItemCode().isBlank()) continue;
            BigDecimal qty = wo.getOrderQuantity() == null ? BigDecimal.ONE : wo.getOrderQuantity();
            out.add(new Demand(wo.getItemCode(), qty, wo.getWoNumber() != null ? wo.getWoNumber() : wo.getDocNo(), wo.getBomId()));
        }
        return out;
    }

    /** FRS §5.1: Fixed sales orders — each line's pending qty (order qty minus qty committed to WOs). */
    private List<Demand> fixedSalesOrderDemands() {
        List<Demand> out = new ArrayList<>();
        List<SalesOrder> orders = em.createQuery(
                "select so from SalesOrder so where so.status not in ('DRAFT','REJECTED','CANCELLED','CLOSED')",
                SalesOrder.class).getResultList();
        for (SalesOrder so : orders) {
            boolean fixed = so.getSoType() == null || "FIXED".equalsIgnoreCase(so.getSoType());
            if (!fixed) continue;
            if (so.getLines() == null) continue;
            for (SalesOrderItem line : so.getLines()) {
                BigDecimal pending = line.getPendingQty() != null && line.getPendingQty().signum() > 0
                    ? line.getPendingQty() : line.getOrderQty();
                if (pending == null || pending.signum() <= 0) continue;
                String item = line.getItemCode() != null ? line.getItemCode() : line.getItemName();
                if (item == null || item.isBlank()) continue;
                Long bomId = productionBoms.findByItemCodeAndSalesOrderIdAndIsActiveTrue(item, so.getId()).stream()
                    .filter(b -> !"REJECTED".equals(b.getStatus()) && !"OBSOLETE".equals(b.getStatus()))
                    .findFirst().map(ProductionBOM::getId).orElse(null);
                out.add(new Demand(item, pending, so.getDocNo(), bomId));
            }
        }
        return out;
    }

    /** FRS §5.1: Open schedule lines — the outstanding delivery-lot quantities on each schedule. */
    private List<Demand> scheduleSalesOrderDemands() {
        List<Demand> out = new ArrayList<>();
        List<SalesOrderSchedule> schedules = em.createQuery(
                "select s from SalesOrderSchedule s join fetch s.doc where s.pendingQty is not null and s.pendingQty > 0",
                SalesOrderSchedule.class).getResultList();
        for (SalesOrderSchedule s : schedules) {
            String status = s.getStatus();
            if (status != null && ("CLOSED".equalsIgnoreCase(status) || "CANCELLED".equalsIgnoreCase(status))) continue;
            if (s.getItemCode() == null || s.getItemCode().isBlank()) continue;
            SalesOrder so = s.getDoc();
            Long bomId = null;
            if (so != null) {
                bomId = productionBoms.findByItemCodeAndSalesOrderIdAndIsActiveTrue(s.getItemCode(), so.getId()).stream()
                    .filter(b -> !"REJECTED".equals(b.getStatus()) && !"OBSOLETE".equals(b.getStatus()))
                    .findFirst().map(ProductionBOM::getId).orElse(null);
            }
            String source = so != null && so.getDocNo() != null ? so.getDocNo() + "/" + (s.getScheduleNumber() != null ? s.getScheduleNumber() : s.getId()) : s.getId().toString();
            out.add(new Demand(s.getItemCode(), s.getPendingQty(), source, bomId));
        }
        return out;
    }

    /** Manufacturing item types (or items with an active WO) plan as PRODUCTION; the rest purchase. */
    private String resolveOrderType(String itemCode, String itemType, List<WorkOrder> allActiveWOs) {
        String t = itemType == null ? "" : itemType.trim().toUpperCase();
        if (MANUFACTURING_ITEM_TYPES.contains(t)) return "PRODUCTION";
        if (PURCHASE_ITEM_TYPES.contains(t)) return "PURCHASE";
        boolean hasWo = allActiveWOs.stream().anyMatch(wo -> itemCode.equals(wo.getItemCode()));
        return hasWo ? "PRODUCTION" : "PURCHASE";
    }

    // ===========================
    // ---- FG Possible ----------
    // ===========================

    @PostMapping("/api/v1/planning/fg-possible/check")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public Map<String, Object> checkFgPossible(@RequestBody Map<String, Object> body) {
        String itemCode = (String) body.get("itemCode");
        if (itemCode == null || itemCode.isBlank()) throw new RuntimeException("itemCode is required");

        BigDecimal targetQty = body.containsKey("quantity") && body.get("quantity") != null
            ? new BigDecimal(body.get("quantity").toString()) : null;
        boolean includeWip = Boolean.TRUE.equals(body.get("includeWip"));
        boolean includeOpenPo = Boolean.TRUE.equals(body.get("includeOpenPo"));

        return feasibilityService.checkFeasibility(itemCode, targetQty, includeWip, includeOpenPo);
    }

    // ---- Material Plan Spawn ----
    @PostMapping("/api/v1/planning/material-plans/{id}/spawn")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public Map<String, Object> spawnMaterialPlan(@PathVariable Long id, Principal principal) {
        MaterialPlan plan = materialPlans.findById(id).orElseThrow(() -> new RuntimeException("Material Plan not found"));
        String planNumber = plan.getPlanNumber();
        String user = principalName(principal);
        List<Map<String, Object>> spawned = new ArrayList<>();

        for (MaterialPlanLine line : materialPlanLines.findByPlanId(id)) {
            BigDecimal net = line.getNetRequirement() == null ? BigDecimal.ZERO : line.getNetRequirement();
            if (net.signum() <= 0) continue;
            if (line.getActionStatus() != null
                && ("SPAWNED".equals(line.getActionStatus()) || "DONE".equals(line.getActionStatus()))) continue;

            String orderType = line.getOrderType() == null ? "" : line.getOrderType().trim().toUpperCase();
            String reference;
            switch (orderType) {
                case "PRODUCTION" -> { reference = spawnWorkOrder(line, planNumber, user); }
                case "SUBCONTRACT" -> { reference = spawnJobOrder(line, planNumber, user); }
                case "PURCHASE" -> { reference = spawnPurchaseRequest(line, planNumber, user); }
                default -> { continue; }
            }

            line.setActionStatus("SPAWNED");
            materialPlanLines.save(line);

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("lineId", line.getId());
            m.put("itemCode", line.getItemCode());
            m.put("orderType", orderType);
            m.put("reference", reference);
            spawned.add(m);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("planId", id);
        result.put("spawnedCount", spawned.size());
        result.put("spawned", spawned);
        return result;
    }

    private BigDecimal spawnQty(MaterialPlanLine line) {
        BigDecimal recommended = line.getRecommendedOrderQty() == null ? BigDecimal.ZERO : line.getRecommendedOrderQty();
        BigDecimal net = line.getNetRequirement() == null ? BigDecimal.ZERO : line.getNetRequirement();
        BigDecimal qty = recommended.signum() > 0 ? recommended : net;
        return qty.signum() > 0 ? qty : BigDecimal.ZERO;
    }

    private String localDateString(Instant instant) {
        if (instant == null) return null;
        return instant.atZone(ZoneId.systemDefault()).toLocalDate().toString();
    }

    private String spawnPurchaseRequest(MaterialPlanLine line, String planNumber, String user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("requestType", "MRP");
        body.put("source", "Material Plan " + planNumber);
        body.put("referenceType", "material-plan");
        body.put("referenceNumber", planNumber);
        body.put("requestedBy", user);
        body.put("priority", "NORMAL");
        body.put("requiredDate", localDateString(line.getRequiredDate()));
        List<Map<String, Object>> lines = new ArrayList<>();
        Map<String, Object> l = new LinkedHashMap<>();
        l.put("itemName", line.getItemCode());
        l.put("itemType", "RAW_MATERIAL");
        l.put("requiredQty", spawnQty(line));
        if (line.getUom() != null) l.put("uom", line.getUom());
        if (line.getItemDescription() != null && !line.getItemDescription().isBlank()) {
            l.put("specification", line.getItemDescription());
        }
        if (line.getRequiredDate() != null) l.put("requiredDate", localDateString(line.getRequiredDate()));
        l.put("productionReference", planNumber);
        lines.add(l);
        body.put("lines", lines);
        DocEntity e = documentFacade.create("purchase-request", body, user);
        return e.getDocNo();
    }

    private String spawnWorkOrder(MaterialPlanLine line, String planNumber, String user) {
        BigDecimal qty = spawnQty(line);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("itemCode", line.getItemCode());
        if (line.getItemDescription() != null) body.put("itemDescription", line.getItemDescription());
        body.put("orderQuantity", qty);
        body.put("productionQty", qty);
        body.put("pendingQty", qty);
        if (line.getUom() != null) body.put("uom", line.getUom());
        body.put("sourceType", "Material Plan");
        body.put("sourceDocNo", planNumber);
        body.put("priority", "MEDIUM");
        body.put("remarks", "MRP spawn from material plan " + planNumber);
        ProductionBOM bom = usableBomForItem(line.getItemCode());
        if (bom != null) {
            body.put("bomId", bom.getId());
            body.put("bomCode", bom.getBomNumber() != null ? bom.getBomNumber() : bom.getDocNo());
            if (bom.getBomVersion() != null) body.put("bomRevision", bom.getBomVersion());
        }
        if (line.getRequiredDate() != null) body.put("dueDate", localDateString(line.getRequiredDate()));
        DocEntity e = documentFacade.create("work-order", body, user);
        return e.getDocNo();
    }

    private String spawnJobOrder(MaterialPlanLine line, String planNumber, String user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("jobWorkType", "SUBCONTRACT");
        body.put("processName", line.getRemarks() != null && !line.getRemarks().isBlank()
            ? line.getRemarks() : "Subcontract processing");
        if (line.getRequiredDate() != null) body.put("requiredDate", localDateString(line.getRequiredDate()));
        List<Map<String, Object>> lines = new ArrayList<>();
        Map<String, Object> l = new LinkedHashMap<>();
        l.put("itemName", line.getItemCode());
        if (line.getItemDescription() != null && !line.getItemDescription().isBlank()) {
            l.put("description", line.getItemDescription());
        }
        l.put("orderQty", spawnQty(line));
        if (line.getUom() != null) l.put("uom", line.getUom());
        l.put("productionReference", planNumber);
        lines.add(l);
        body.put("lines", lines);
        DocEntity e = documentFacade.create("job-order", body, user);
        return e.getDocNo();
    }

    // ===========================
    // ---- Dispatch Plan --------
    // ===========================

    @GetMapping("/api/v1/planning/dispatch-plans")
    public List<DispatchPlan> listDispatchPlans() { return dispatchPlans.findAll(); }

    @PostMapping("/api/v1/planning/dispatch-plans")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public DispatchPlan createDispatchPlan(@RequestBody DispatchPlan p, Principal principal) {
        p.setId(null);
        p.setDispatchNumber(numbers.next("dispatch-plan", "DP"));
        if (p.getDispatchDate() == null) p.setDispatchDate(Instant.now());
        if (p.getStatus() == null) p.setStatus("DRAFT");
        p.setCreatedBy(principalName(principal));
        p.setCreatedAt(Instant.now());
        return dispatchPlans.save(p);
    }

    @GetMapping("/api/v1/planning/dispatch-plans/{id}")
    public DispatchPlan getDispatchPlan(@PathVariable Long id) {
        return dispatchPlans.findById(id).orElseThrow(() -> new RuntimeException("Dispatch Plan not found"));
    }

    @PutMapping("/api/v1/planning/dispatch-plans/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public DispatchPlan updateDispatchPlan(@PathVariable Long id, @RequestBody DispatchPlan p, Principal principal) {
        DispatchPlan e = dispatchPlans.findById(id).orElseThrow(() -> new RuntimeException("Dispatch Plan not found"));
        p.setId(id);
        p.setDispatchNumber(e.getDispatchNumber());
        p.setCreatedAt(e.getCreatedAt());
        p.setCreatedBy(e.getCreatedBy());
        p.setUpdatedAt(Instant.now());
        p.setUpdatedBy(principalName(principal));
        return dispatchPlans.save(p);
    }

    @DeleteMapping("/api/v1/planning/dispatch-plans/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteDispatchPlan(@PathVariable Long id) {
        dispatchPlanLines.findByDispatchPlanId(id).forEach(l -> dispatchPlanLines.deleteById(l.getId()));
        dispatchPlans.deleteById(id);
    }

    @GetMapping("/api/v1/planning/dispatch-plans/{id}/lines")
    public List<DispatchPlanLine> getDispatchPlanLines(@PathVariable Long id) {
        return dispatchPlanLines.findByDispatchPlanId(id);
    }

    @PostMapping("/api/v1/planning/dispatch-plans/{id}/lines")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public DispatchPlanLine addDispatchPlanLine(@PathVariable Long id, @RequestBody DispatchPlanLine line, Principal principal) {
        DispatchPlan plan = dispatchPlans.findById(id).orElseThrow(() -> new RuntimeException("Dispatch Plan not found"));
        line.setId(null);
        line.setDispatchPlan(plan);
        line.setCreatedAt(Instant.now());
        return dispatchPlanLines.save(line);
    }

    @PutMapping("/api/v1/planning/dispatch-plans/lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public DispatchPlanLine updateDispatchPlanLine(@PathVariable Long lineId, @RequestBody DispatchPlanLine line, Principal principal) {
        DispatchPlanLine e = dispatchPlanLines.findById(lineId).orElseThrow(() -> new RuntimeException("Dispatch Plan Line not found"));
        line.setId(lineId);
        line.setDispatchPlan(e.getDispatchPlan());
        line.setCreatedAt(e.getCreatedAt());
        line.setUpdatedAt(Instant.now());
        return dispatchPlanLines.save(line);
    }

    @DeleteMapping("/api/v1/planning/dispatch-plans/lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteDispatchPlanLine(@PathVariable Long lineId) { dispatchPlanLines.deleteById(lineId); }

    // ===========================
    // ---- Machine Load Plan ----
    // ===========================

    @GetMapping("/api/v1/planning/machine-load-plans")
    public List<MachineLoadPlan> listMachineLoadPlans() { return machineLoadPlans.findAll(); }

    @PostMapping("/api/v1/planning/machine-load-plans")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public MachineLoadPlan createMachineLoadPlan(@RequestBody MachineLoadPlan p, Principal principal) {
        p.setId(null);
        p.setPlanNumber(numbers.next("machine-load-plan", "MLP"));
        if (p.getStatus() == null) p.setStatus("DRAFT");
        p.setCreatedBy(principalName(principal));
        p.setCreatedAt(Instant.now());
        return machineLoadPlans.save(p);
    }

    @GetMapping("/api/v1/planning/machine-load-plans/{id}")
    public MachineLoadPlan getMachineLoadPlan(@PathVariable Long id) {
        return machineLoadPlans.findById(id).orElseThrow(() -> new RuntimeException("Machine Load Plan not found"));
    }

    @PutMapping("/api/v1/planning/machine-load-plans/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public MachineLoadPlan updateMachineLoadPlan(@PathVariable Long id, @RequestBody MachineLoadPlan p, Principal principal) {
        MachineLoadPlan e = machineLoadPlans.findById(id).orElseThrow(() -> new RuntimeException("Machine Load Plan not found"));
        p.setId(id);
        p.setPlanNumber(e.getPlanNumber());
        p.setCreatedAt(e.getCreatedAt());
        p.setCreatedBy(e.getCreatedBy());
        p.setUpdatedAt(Instant.now());
        p.setUpdatedBy(principalName(principal));
        return machineLoadPlans.save(p);
    }

    @DeleteMapping("/api/v1/planning/machine-load-plans/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteMachineLoadPlan(@PathVariable Long id) {
        machineLoadLines.findByLoadPlanId(id).forEach(l -> machineLoadLines.deleteById(l.getId()));
        machineLoadPlans.deleteById(id);
    }

    @GetMapping("/api/v1/planning/machine-load-plans/{id}/lines")
    public List<MachineLoadLine> getMachineLoadPlanLines(@PathVariable Long id) {
        return machineLoadLines.findByLoadPlanId(id);
    }

    @PostMapping("/api/v1/planning/machine-load-plans/{id}/lines")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public MachineLoadLine addMachineLoadLine(@PathVariable Long id, @RequestBody MachineLoadLine line, Principal principal) {
        MachineLoadPlan plan = machineLoadPlans.findById(id).orElseThrow(() -> new RuntimeException("Machine Load Plan not found"));
        line.setId(null);
        line.setLoadPlan(plan);
        line.setCreatedBy(principalName(principal));
        line.setCreatedAt(Instant.now());
        scheduleMachineLoadLine(line, plan, null);
        return machineLoadLines.save(line);
    }

    /** FRS §19: in-place line scheduling/reschedule update (machine/shift/date + start time).
     * The sequenced row's Start must not precede the previous process' planned/actual End. */
    @PutMapping("/api/v1/planning/machine-load-lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public MachineLoadLine updateMachineLoadLine(@PathVariable Long lineId, @RequestBody MachineLoadLine line, Principal principal) {
        MachineLoadLine e = machineLoadLines.findById(lineId).orElseThrow(() -> new RuntimeException("Machine Load Line not found"));
        MachineLoadPlan plan = e.getLoadPlan();
        e.setMachineCode(blankToNull(line.getMachineCode()) != null ? line.getMachineCode() : e.getMachineCode());
        e.setShiftName(blankToNull(line.getShiftName()));
        e.setLoadDate(line.getLoadDate());
        e.setStartTime(line.getStartTime());
        e.setProcessQty(line.getProcessQty());
        e.setSetupHours(line.getSetupHours());
        e.setRunHours(line.getRunHours());
        e.setProcessTimeHrs(line.getProcessTimeHrs());
        e.setWoNumber(blankToNull(line.getWoNumber()));
        e.setOperationSequence(line.getOperationSequence());
        e.setWoOperationCode(blankToNull(line.getWoOperationCode()));
        e.setItemCode(blankToNull(line.getItemCode()));
        e.setItemName(blankToNull(line.getItemName()));
        e.setProcessName(blankToNull(line.getProcessName()));
        e.setOperatorCode(blankToNull(line.getOperatorCode()));
        e.setToolCode(blankToNull(line.getToolCode()));
        e.setRemarks(blankToNull(line.getRemarks()));
        scheduleMachineLoadLine(e, plan, e.getId());
        e.setUpdatedAt(Instant.now());
        e.setUpdatedBy(principalName(principal));
        return machineLoadLines.save(e);
    }

    /** FRS §8 rule 3: Calculate derives Process Time / End datetime / Total Time, then compares
     * the load against the machine's available hours for the day (from MachineOperatingHours). */
    @PostMapping("/api/v1/planning/machine-load-plans/{planId}/lines/{lineId}/calculate")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public MachineLoadLine calculateMachineLoadLine(@PathVariable Long planId, @PathVariable Long lineId, Principal principal) {
        MachineLoadLine e = machineLoadLines.findById(lineId).orElseThrow(() -> new RuntimeException("Machine Load Line not found"));
        MachineLoadPlan plan = e.getLoadPlan();
        e.setUpdatedAt(Instant.now());
        scheduleMachineLoadLine(e, plan, e.getId());
        return machineLoadLines.save(e);
    }

    @DeleteMapping("/api/v1/planning/machine-load-plans/lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteMachineLoadLine(@PathVariable Long lineId) { machineLoadLines.deleteById(lineId); }

    private String blankToNull(String v) { return (v == null || v.isBlank()) ? null : v; }

    /** FRS §19 sequencing + capacity: computes duration, chains off the previous process' end,
     * derives End datetime, and flags over-commitment against the machine's available shift hours. */
    private void scheduleMachineLoadLine(MachineLoadLine line, MachineLoadPlan plan, Long selfId) {
        BigDecimal qty = line.getProcessQty() == null ? BigDecimal.ONE : line.getProcessQty();
        BigDecimal setup = nz(line.getSetupHours());
        BigDecimal run = nz(line.getRunHours());
        BigDecimal processHrs = line.getProcessTimeHrs() != null ? line.getProcessTimeHrs()
            : setup.add(run.multiply(qty));
        line.setProcessTimeHrs(processHrs);

        // Sequence chaining: Start must not precede the previous process' planned/actual End.
        if (line.getWoNumber() != null && line.getOperationSequence() != null && line.getOperationSequence() > 1) {
            Instant prevEnd = previousProcessEnd(line.getWoNumber(), line.getOperationSequence(), plan.getId(), selfId);
            if (prevEnd != null) {
                line.setPreviousProcessEnd(prevEnd);
                if (line.getStartTime() == null) {
                    line.setStartTime(prevEnd);
                } else if (line.getStartTime().isBefore(prevEnd)) {
                    throw new IllegalStateException("Start time " + line.getStartTime()
                        + " precedes Previous Process EndDatetime " + prevEnd
                        + " for WO " + line.getWoNumber() + " operation " + line.getOperationSequence()
                        + " (FRS §19 sequencing rule).");
                }
            }
        }

        long totalSec = Math.round(processHrs.doubleValue() * 3600.0);
        line.setTotalTimeSec(totalSec);
        if (line.getStartTime() != null) {
            line.setEndTime(line.getStartTime().plusSeconds(totalSec));
        }

        // Availability check: use the machine's recorded operating hours for the day when present.
        BigDecimal available = availableHoursFor(line, plan);
        BigDecimal plannedLoad = line.getProcessTimeHrs() == null ? BigDecimal.ZERO : line.getProcessTimeHrs();
        line.setAvailableHours(available);
        if (line.getPlannedLoadHours() == null || line.getPlannedLoadHours().compareTo(BigDecimal.ZERO) == 0) {
            line.setPlannedLoadHours(plannedLoad);
        }
        boolean overloaded = available.compareTo(BigDecimal.ZERO) > 0
            && line.getPlannedLoadHours().compareTo(available) > 0;
        line.setIsOverloaded(overloaded);
        line.setOverloadHours(overloaded ? line.getPlannedLoadHours().subtract(available) : BigDecimal.ZERO);
        line.setUtilizationPercent(available.compareTo(BigDecimal.ZERO) > 0
            ? line.getPlannedLoadHours().multiply(BigDecimal.valueOf(100))
                .divide(available, 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO);
    }

    private BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    /** FRS §19: the predecessor operation's planned/actual End — first from an already-planned load line
     * in this plan (same WO, prior sequence), else from the Work Order's own operation timings. */
    private Instant previousProcessEnd(String woNumber, Integer opSequence, Long planId, Long selfId) {
        int predSeq = opSequence - 1;
        MachineLoadLine pred = machineLoadLines.findByWoNumberAndOperationSequence(woNumber, predSeq).stream()
            .filter(l -> !l.getId().equals(selfId))
            .filter(l -> l.getEndTime() != null)
            .filter(l -> planId == null || l.getLoadPlan() != null && l.getLoadPlan().getId().equals(planId))
            .findFirst().orElse(null);
        if (pred != null) return pred.getEndTime();
        WorkOrder wo = workOrders.findByWoNumber(woNumber).stream().findFirst().orElse(null);
        if (wo != null) {
            return wo.getOperations().stream()
                .filter(wop -> wop.getOperationSequence() != null && wop.getOperationSequence() == predSeq)
                .map(WorkOrderOperation::getEndTime)
                .filter(Objects::nonNull)
                .findFirst().orElse(null);
        }
        return null;
    }

    /** Available hours for a line: per-day record from MachineOperatingHours, else the plan's
     * total operating hours across its date range, else the work center/day fallback. */
    private BigDecimal availableHoursFor(MachineLoadLine line, MachineLoadPlan plan) {
        BigDecimal fallback = BigDecimal.valueOf(8);
        if (line.getMachineCode() != null && plan != null && plan.getPlanFrom() != null && plan.getPlanTo() != null) {
            BigDecimal range = machineOperatingHours.sumOperatingHours(line.getMachineCode(), plan.getPlanFrom(), plan.getPlanTo());
            if (range != null && range.compareTo(BigDecimal.ZERO) > 0) return range;
        }
        if (line.getMachineCode() != null && line.getLoadDate() != null) {
            LocalDate day = line.getLoadDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
            return machineOperatingHours.findByMachineCodeAndWorkDate(line.getMachineCode(), day)
                .map(MachineOperatingHours::getOperatingHours)
                .orElse(fallback);
        }
        return fallback;
    }

    // ---- Generate load from active WOs ----
    @PostMapping("/api/v1/planning/machine-load-plans/{id}/generate")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public MachineLoadPlan generateMachineLoad(@PathVariable Long id, Principal principal) {
        MachineLoadPlan plan = machineLoadPlans.findById(id).orElseThrow(() -> new RuntimeException("Machine Load Plan not found"));
        machineLoadLines.findByLoadPlanId(id).forEach(l -> machineLoadLines.deleteById(l.getId()));

        List<WorkOrder> activeWOs = new ArrayList<>(workOrders.findByStatus("RELEASED"));
        activeWOs.addAll(workOrders.findByStatus("IN_PROCESS"));

        Map<String, BigDecimal> loadByMachine = new LinkedHashMap<>();
        Map<String, BigDecimal> availableByMachine = new LinkedHashMap<>();

        for (WorkOrder wo : activeWOs) {
            for (WorkOrderOperation op : wo.getOperations()) {
                if (op.getMachineCode() == null) continue;
                BigDecimal setup = op.getSetupTimePlanned() == null ? BigDecimal.ZERO : op.getSetupTimePlanned();
                BigDecimal cycle = op.getCycleTimePlanned() == null ? BigDecimal.ZERO : op.getCycleTimePlanned();
                BigDecimal qty = op.getPlannedQuantity() == null ? BigDecimal.ONE : op.getPlannedQuantity();
                BigDecimal totalLoad = setup.add(cycle.multiply(qty)).divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
                loadByMachine.merge(op.getMachineCode(), totalLoad, BigDecimal::add);

                machines.findByCode(op.getMachineCode()).ifPresent(m -> {
                    if (m.getWorkCenterCode() != null) {
                        workCenters.findByCode(m.getWorkCenterCode()).ifPresent(wc -> {
                            BigDecimal cap = wc.getCapacityPerDay() == null ? BigDecimal.valueOf(8) : wc.getCapacityPerDay();
                            availableByMachine.merge(op.getMachineCode(), cap, BigDecimal::add);
                        });
                    }
                });
            }
        }

        int seq = 1;
        for (Map.Entry<String, BigDecimal> entry : loadByMachine.entrySet()) {
            String machineCode = entry.getKey();
            BigDecimal plannedLoad = entry.getValue();

            // FRS §8 rule 1: prefer the machine's recorded operating hours across the plan's date
            // range (from MachineOperatingHours / shift calendars); fall back to work center capacity.
            BigDecimal available = BigDecimal.ZERO;
            if (plan.getPlanFrom() != null && plan.getPlanTo() != null) {
                BigDecimal operatingHrs = machineOperatingHours.sumOperatingHours(machineCode, plan.getPlanFrom(), plan.getPlanTo());
                if (operatingHrs != null && operatingHrs.compareTo(BigDecimal.ZERO) > 0) {
                    available = operatingHrs;
                }
            }
            if (available.compareTo(BigDecimal.ZERO) == 0) {
                available = availableByMachine.getOrDefault(machineCode, BigDecimal.valueOf(8));
            }

            // FRS §7.2: BREAKDOWN / UNDER_MAINTENANCE machines get zero available hours.
            boolean isBlocked = machines.findByCode(machineCode)
                    .map(m -> "BREAKDOWN".equals(m.getStatus()) || "UNDER_MAINTENANCE".equals(m.getStatus()))
                    .orElse(false);
            if (isBlocked) {
                available = BigDecimal.ZERO;
            }

            BigDecimal utilPct = available.compareTo(BigDecimal.ZERO) > 0
                ? plannedLoad.multiply(BigDecimal.valueOf(100)).divide(available, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
            boolean overloaded = utilPct.compareTo(BigDecimal.valueOf(100)) > 0;

            MachineLoadLine line = new MachineLoadLine();
            line.setLoadPlan(plan);
            line.setMachineCode(machineCode);
            line.setLoadDate(plan.getPlanFrom() != null ? plan.getPlanFrom().atStartOfDay(java.time.ZoneId.systemDefault()).toInstant() : Instant.now());
            line.setAvailableHours(available);
            line.setPlannedLoadHours(plannedLoad);
            line.setUtilizationPercent(utilPct);
            line.setIsOverloaded(overloaded);
            line.setOverloadHours(overloaded ? plannedLoad.subtract(available) : BigDecimal.ZERO);
            line.setSequenceOnMachine(seq++);
            line.setCreatedAt(Instant.now());
            machineLoadLines.save(line);
        }

        plan.setStatus("COMPLETE");
        plan.setGeneratedDate(Instant.now());
        plan.setGeneratedBy(principalName(principal));
        plan.setUpdatedAt(Instant.now());
        return machineLoadPlans.save(plan);
    }

    // ===========================
    // ---- ECR/ECO --------------
    // ===========================

    @GetMapping("/api/v1/planning/engineering-changes")
    public List<EngineeringChange> listEngineeringChanges() { return engineeringChanges.findAll(); }

    @PostMapping("/api/v1/planning/engineering-changes")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public EngineeringChange createEngineeringChange(@RequestBody EngineeringChange ec, Principal principal) {
        ec.setId(null);
        // FRS §9.2/§21: Gap Analysis No, if set, must resolve to an existing Gap Analysis record
        if (ec.getGapAnalysisRunId() != null && !gapAnalysisRuns.existsById(ec.getGapAnalysisRunId())) {
            throw new RuntimeException("Gap Analysis run not found: " + ec.getGapAnalysisRunId());
        }
        ec.setEcrNumber(numbers.next("engineering-change", "ECR"));
        if (ec.getStatus() == null) ec.setStatus("DRAFT");
        if (ec.getEcrStatus() == null) ec.setEcrStatus("DRAFT");
        if (ec.getEcoStatus() == null) ec.setEcoStatus("DRAFT");
        ec.setCreatedBy(principalName(principal));
        ec.setCreatedAt(Instant.now());
        return engineeringChanges.save(ec);
    }

    @GetMapping("/api/v1/planning/engineering-changes/{id}")
    public EngineeringChange getEngineeringChange(@PathVariable Long id) {
        return engineeringChanges.findById(id).orElseThrow(() -> new RuntimeException("Engineering Change not found"));
    }

    @PutMapping("/api/v1/planning/engineering-changes/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public EngineeringChange updateEngineeringChange(@PathVariable Long id, @RequestBody EngineeringChange ec, Principal principal) {
        EngineeringChange e = engineeringChanges.findById(id).orElseThrow(() -> new RuntimeException("Engineering Change not found"));
        if (ec.getGapAnalysisRunId() != null && !gapAnalysisRuns.existsById(ec.getGapAnalysisRunId())) {
            throw new RuntimeException("Gap Analysis run not found: " + ec.getGapAnalysisRunId());
        }
        String current = e.getEcrStatus() != null ? e.getEcrStatus() : e.getStatus();
        // FRS §9.2: the DRAFT→SUBMITTED→APPROVED→IMPLEMENTED→CLOSED state machine is enforced —
        // an ECR may only be edited while still DRAFT or after it was REJECTED (for resubmission).
        if (current != null && !Set.of("DRAFT", "REJECTED", "RAISED").contains(current)) {
            throw new IllegalStateException("ECR " + e.getEcrNumber() + " is " + current
                + " and can no longer be edited. Only DRAFT or REJECTED ECRs accept changes.");
        }
        ec.setId(id);
        ec.setEcrNumber(e.getEcrNumber());
        // Workflow state only advances via the action endpoint — never through an edit payload.
        ec.setEcrStatus(e.getEcrStatus());
        ec.setEcoStatus(e.getEcoStatus());
        ec.setStatus(e.getStatus());
        ec.setCreatedAt(e.getCreatedAt());
        ec.setCreatedBy(e.getCreatedBy());
        ec.setUpdatedAt(Instant.now());
        ec.setUpdatedBy(principalName(principal));
        return engineeringChanges.save(ec);
    }

    @DeleteMapping("/api/v1/planning/engineering-changes/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteEngineeringChange(@PathVariable Long id) {
        EngineeringChange e = engineeringChanges.findById(id).orElseThrow(() -> new RuntimeException("Engineering Change not found"));
        String current = e.getEcrStatus() != null ? e.getEcrStatus() : e.getStatus();
        if (current != null && !Set.of("DRAFT", "REJECTED", "RAISED").contains(current)) {
            throw new IllegalStateException("Only DRAFT/REJECTED ECRs can be deleted; " + e.getEcrNumber() + " is " + current + ".");
        }
        ecrRiskLines.findByEngineeringChangeId(id).forEach(l -> ecrRiskLines.deleteById(l.getId()));
        engineeringChanges.deleteById(id);
    }

    // ---- Risk Analysis grid (FRS §9.2/§21: structured, not a flat text field) ----
    @GetMapping("/api/v1/planning/engineering-changes/{id}/risk-lines")
    public List<EcrRiskLine> getEcrRiskLines(@PathVariable Long id) {
        return ecrRiskLines.findByEngineeringChangeId(id);
    }

    @PostMapping("/api/v1/planning/engineering-changes/{id}/risk-lines")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public EcrRiskLine addEcrRiskLine(@PathVariable Long id, @RequestBody EcrRiskLine line) {
        EngineeringChange ec = engineeringChanges.findById(id).orElseThrow(() -> new RuntimeException("Engineering Change not found"));
        line.setId(null);
        line.setEngineeringChange(ec);
        return ecrRiskLines.save(line);
    }

    @PutMapping("/api/v1/planning/engineering-changes/risk-lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public EcrRiskLine updateEcrRiskLine(@PathVariable Long lineId, @RequestBody EcrRiskLine line) {
        EcrRiskLine e = ecrRiskLines.findById(lineId).orElseThrow(() -> new RuntimeException("Risk line not found"));
        line.setId(lineId);
        line.setEngineeringChange(e.getEngineeringChange());
        line.setCreatedAt(e.getCreatedAt());
        return ecrRiskLines.save(line);
    }

    @DeleteMapping("/api/v1/planning/engineering-changes/risk-lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteEcrRiskLine(@PathVariable Long lineId) { ecrRiskLines.deleteById(lineId); }

    @PostMapping("/api/v1/planning/engineering-changes/{id}/actions/{action}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public EngineeringChange engineeringChangeAction(@PathVariable Long id, @PathVariable String action,
                                                    @RequestBody(required = false) Map<String, String> body,
                                                    Principal principal) {
        EngineeringChange ec = engineeringChanges.findById(id).orElseThrow(() -> new RuntimeException("Engineering Change not found"));
        String note = body != null ? body.getOrDefault("note", "") : "";
        String currentEcr = ec.getEcrStatus() != null ? ec.getEcrStatus() : (ec.getStatus() != null ? ec.getStatus() : "DRAFT");
        String currentEco = ec.getEcoStatus() != null ? ec.getEcoStatus() : "DRAFT";
        String user = principalName(principal);

        switch (action.toLowerCase()) {
            case "submit-ecr": {
                // FRS §9.2: DRAFT/REJECTED (or legacy RAISED/UNDER_REVIEW) → SUBMITTED
                requireEcrState(currentEcr, Set.of("DRAFT", "REJECTED", "RAISED"), "submit-ecr");
                ec.setEcrStatus("SUBMITTED");
                ec.setStatus("SUBMITTED");
                ec.setEcoStatus("DRAFT");
                createApprovalSteps("ENGINEERING_CHANGE", ec.getId(), List.of("PLANNING_MANAGER", "PLANT_HEAD"), principal);
                break;
            }
            case "approve-ecr":
            case "approve": {
                // FRS §9.2: only SUBMITTED (or legacy UNDER_REVIEW) ECRs may be approved
                requireEcrState(currentEcr, Set.of("SUBMITTED", "UNDER_REVIEW"), "approve");
                // FRS §21 rule 1: approval is blocked if stock disposition is required but not recorded
                if (Boolean.TRUE.equals(ec.getInventoryImpact())
                    && (ec.getOldStockDisposition() == null || ec.getOldStockDisposition().isBlank())) {
                    throw new IllegalStateException("Existing stock disposition must be recorded before an ECR with inventory impact can be approved.");
                }
                ec.setEcrStatus("APPROVED");
                ec.setStatus("APPROVED");
                ec.setApprovedBy(user);
                ec.setApprovedAt(Instant.now());
                advanceApprovalStep("ENGINEERING_CHANGE", ec.getId(), user);
                break;
            }
            case "reject-ecr":
            case "reject": {
                requireEcrState(currentEcr, Set.of("SUBMITTED", "DRAFT", "RAISED", "UNDER_REVIEW"), "reject");
                ec.setEcrStatus("REJECTED");
                ec.setStatus("REJECTED");
                ec.setRemarks(note == null || note.isBlank() ? ec.getRemarks() : note);
                break;
            }
            case "implement": {
                if (!"APPROVED".equals(currentEcr)) {
                    throw new IllegalStateException("ECR must be APPROVED before ECO can be implemented. Current ECR status: " + currentEcr);
                }
                ec.setEcoStatus("IMPLEMENTED");
                ec.setStatus("IMPLEMENTED");
                ec.setEffectiveDate(Instant.now());
                ec.setImplementedAt(Instant.now());
                applyEcrRevisionCascade(ec, note, user);
                break;
            }
            case "close": {
                if (!Set.of("IMPLEMENTED", "APPROVED").contains(currentEco) && !Set.of("IMPLEMENTED", "APPROVED").contains(ec.getStatus() == null ? "" : ec.getStatus())) {
                    throw new IllegalStateException("ECR must be IMPLEMENTED before it can be closed. Current ECO status: " + currentEco);
                }
                ec.setEcoStatus("CLOSED");
                ec.setStatus("CLOSED");
                ec.setClosedDate(Instant.now());
                break;
            }
            default:
                throw new RuntimeException("Unknown action: " + action);
        }
        ec.setUpdatedAt(Instant.now());
        ec.setUpdatedBy(user);
        return engineeringChanges.save(ec);
    }

    private void requireEcrState(String current, Set<String> allowed, String action) {
        if (current == null || !allowed.contains(current)) {
            throw new IllegalStateException("ECR state '" + current + "' does not permit action '" + action + "'. Allowed from: " + String.join(", ", allowed));
        }
    }

    /** FRS §9.2: on ECO implementation, cascade the revision to the active BOM and Route Sheet and
     * record the newly created revision ids + from/to revision labels back on the ECR. */
    private void applyEcrRevisionCascade(EngineeringChange ec, String note, String user) {
        String remarks = note != null && !note.isBlank() ? note : (ec.getDescriptionOfChange() != null ? ec.getDescriptionOfChange() : "ECR " + ec.getEcrNumber());
        if (Boolean.TRUE.equals(ec.getBomImpact()) && ec.getItemCode() != null && !ec.getItemCode().isBlank()) {
            ProductionBOM active = usableBomForItem(ec.getItemCode());
            if (active != null) {
                if (ec.getBomRevFrom() == null || ec.getBomRevFrom().isBlank()) {
                    ec.setBomRevFrom(active.getBomVersion() != null ? active.getBomVersion()
                        : "Rev " + (active.getRevisionNo() != null ? active.getRevisionNo() : 0));
                }
                String toRev = ec.getBomRevTo() != null && !ec.getBomRevTo().isBlank()
                    ? ec.getBomRevTo() : ec.getProposedRevision();
                ProductionBOM newBom = planningService.createBomRevision(active.getId(), toRev, "ECR " + ec.getEcrNumber() + ": " + remarks, user);
                ec.setNewBomId(newBom.getId());
                if (ec.getBomRevTo() == null || ec.getBomRevTo().isBlank()) ec.setBomRevTo(newBom.getBomVersion());
            }
        }
        if (Boolean.TRUE.equals(ec.getRouteImpact()) && ec.getItemCode() != null && !ec.getItemCode().isBlank()) {
            RouteSheet active = routeSheets.findByItemCode(ec.getItemCode()).stream()
                .filter(r -> Set.of("RELEASED", "APPROVED").contains(r.getStatus()))
                .findFirst().orElse(null);
            if (active != null) {
                if (ec.getRouteRevFrom() == null || ec.getRouteRevFrom().isBlank()) {
                    ec.setRouteRevFrom(active.getRouteVersion() != null ? active.getRouteVersion()
                        : "Rev " + (active.getRevisionNo() != null ? active.getRevisionNo() : 0));
                }
                String toRev = ec.getRouteRevTo() != null && !ec.getRouteRevTo().isBlank()
                    ? ec.getRouteRevTo() : ec.getProposedRevision();
                RouteSheet newRs = planningService.createRouteSheetRevisionFromEcr(active.getId(),
                    "ECR " + ec.getEcrNumber() + ": " + remarks, user, ec.getEcrNumber());
                ec.setNewRouteId(newRs.getId());
                if (ec.getRouteRevTo() == null || ec.getRouteRevTo().isBlank()) ec.setRouteRevTo(newRs.getRouteVersion());
            }
        }
    }

    // ===========================
    // ---- Gap Analysis ---------
    // ===========================

    @GetMapping("/api/v1/planning/gap-analysis")
    public List<GapAnalysisRun> listGapAnalysisRuns() { return gapAnalysisRuns.findAll(); }

    @PostMapping("/api/v1/planning/gap-analysis")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public GapAnalysisRun createGapAnalysisRun(@RequestBody GapAnalysisRun run, Principal principal) {
        run.setId(null);
        run.setRunNumber(numbers.next("gap-analysis", "GA"));
        if (run.getAnalysisDate() == null) run.setAnalysisDate(Instant.now());
        if (run.getStatus() == null) run.setStatus("DRAFT");
        run.setCreatedBy(principalName(principal));
        run.setCreatedAt(Instant.now());
        return gapAnalysisRuns.save(run);
    }

    @GetMapping("/api/v1/planning/gap-analysis/{id}")
    public Map<String, Object> getGapAnalysisRun(@PathVariable Long id) {
        GapAnalysisRun run = gapAnalysisRuns.findById(id).orElseThrow(() -> new RuntimeException("Gap Analysis Run not found"));
        List<GapAnalysisResult> results = gapAnalysisResults.findByRunId(id);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("run", run);
        out.put("results", results);
        return out;
    }

    @GetMapping("/api/v1/planning/gap-analysis/{id}/results")
    public List<GapAnalysisResult> getGapAnalysisResults(@PathVariable Long id) {
        return gapAnalysisResults.findByRunId(id);
    }

    // ---- Run Gap Analysis ----
    @PostMapping("/api/v1/planning/gap-analysis/{id}/run")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public GapAnalysisRun runGapAnalysis(@PathVariable Long id, Principal principal) {
        GapAnalysisRun run = gapAnalysisRuns.findById(id).orElseThrow(() -> new RuntimeException("Gap Analysis Run not found"));
        gapAnalysisResults.findByRunId(id).forEach(r -> gapAnalysisResults.deleteById(r.getId()));

        LocalDate now = LocalDate.now();
        LocalDate horizonEnd = run.getPlanningHorizonEnd() != null
            ? run.getPlanningHorizonEnd().atZone(ZoneId.systemDefault()).toLocalDate()
            : now.plusDays(90);

        List<WorkOrder> activeWOs = workOrders.findByStatus("RELEASED");
        activeWOs.addAll(workOrders.findByStatus("IN_PROCESS"));

        for (WorkOrder wo : activeWOs) {
            if (wo.getDueDate() == null || wo.getDueDate().isAfter(horizonEnd)) continue;

            // Material gap
            BigDecimal grossReq = BigDecimal.ZERO;
            if (wo.getBomId() != null) {
                Optional<ProductionBOM> bomOpt = productionBoms.findById(wo.getBomId());
                if (bomOpt.isPresent()) {
                    for (ProductionBOMLine bomLine : bomOpt.get().getLines()) {
                        BigDecimal qtyPer = bomLine.getQuantityPer() == null ? BigDecimal.ONE : bomLine.getQuantityPer();
                        grossReq = grossReq.add(wo.getOrderQuantity().multiply(qtyPer));
                    }
                }
            }
            BigDecimal issued = BigDecimal.ZERO;
            for (WorkOrderMaterial mat : wo.getMaterials()) {
                issued = issued.add(mat.getIssuedQuantity() == null ? BigDecimal.ZERO : mat.getIssuedQuantity());
            }
            BigDecimal materialGap = grossReq.subtract(issued);
            if (materialGap.compareTo(BigDecimal.ZERO) > 0) {
                GapAnalysisResult result = new GapAnalysisResult();
                result.setRun(run);
                result.setGapType("MATERIAL");
                result.setContextCode(wo.getWoNumber());
                result.setContextDescription(wo.getItemCode() + " - Material shortage");
                result.setDemandQty(grossReq);
                result.setSupplyQty(issued);
                result.setGapQty(materialGap);
                result.setSeverity(classifySeverity(materialGap, grossReq));
                result.setRootCause("Insufficient material issued against work order");
                result.setSuggestedAction("Issue pending materials or expedite procurement");
                result.setActionStatus("OPEN");
                result.setCreatedAt(Instant.now());
                gapAnalysisResults.save(result);
            }

            // Delivery date gap
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(now, wo.getDueDate());
            if (daysBetween < 0) {
                GapAnalysisResult result = new GapAnalysisResult();
                result.setRun(run);
                result.setGapType("DELIVERY");
                result.setContextCode(wo.getWoNumber());
                result.setContextDescription(wo.getItemCode() + " - Overdue work order");
                result.setDemandQty(wo.getOrderQuantity());
                result.setSupplyQty(BigDecimal.ZERO);
                result.setGapQty(wo.getOrderQuantity());
                result.setGapDays((int) Math.abs(daysBetween));
                result.setSeverity(Math.abs(daysBetween) > 30 ? "CRITICAL" : Math.abs(daysBetween) > 20 ? "HIGH" : "MEDIUM");
                result.setRootCause("Work order delivery date has passed");
                result.setSuggestedAction("Expedite production or renegotiate delivery date");
                result.setActionStatus("OPEN");
                result.setCreatedAt(Instant.now());
                gapAnalysisResults.save(result);
            }
        }

        run.setStatus("COMPLETE");
        run.setGeneratedBy(principalName(principal));
        run.setUpdatedAt(Instant.now());
        GapAnalysisRun saved = gapAnalysisRuns.save(run);

        // Escalation: notify roles for CRITICAL/HIGH gaps
        List<GapAnalysisResult> criticalResults = gapAnalysisResults.findByRunIdAndSeverityIn(
                saved.getId(), List.of("CRITICAL", "HIGH"));
        if (!criticalResults.isEmpty()) {
            List<EscalationRule> rules = escalationRules.findByDocKeyAndActiveTrue("gap-analysis");
            for (EscalationRule rule : rules) {
                boolean matches = criticalResults.stream().anyMatch(r -> rule.getPriority().equals(r.getSeverity()));
                if (matches) {
                    long criticalCount = criticalResults.stream().filter(r -> rule.getPriority().equals(r.getSeverity())).count();
                    notificationService.notify(
                            "GAP_ESCALATION", "PLANNING", "GapAnalysisRun", saved.getId(),
                            rule.getPriority(),
                            String.format("[%s] Gap Analysis %s: %d %s gaps found in run %s",
                                    rule.getPriority(), rule.getEscalateToRole(), criticalCount,
                                    rule.getPriority().toLowerCase(), saved.getRunNumber()),
                            saved.getRunNumber()
                    );
                }
            }
        }

        return saved;
    }

    // ---- Run QMS Clause Gap Analysis (FRS §9.1) ----
    @PostMapping("/api/v1/planning/gap-analysis/{id}/run-qms")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public GapAnalysisRun runQmsGapAnalysis(@PathVariable Long id, Principal principal) {
        GapAnalysisRun run = gapAnalysisRuns.findById(id).orElseThrow(() -> new RuntimeException("Gap Analysis Run not found"));
        run.setRunMode("QMS");
        gapAnalysisResults.findByRunId(id).forEach(r -> gapAnalysisResults.deleteById(r.getId()));

        String scope = run.getScope() == null ? "PLANT" : run.getScope().trim().toUpperCase();
        String scopeValue = run.getScopeValue();
        List<ItemMaster> assessItems = new ArrayList<>();
        if ("ITEM".equals(scope) && scopeValue != null && !scopeValue.isBlank()) {
            items.findByCode(scopeValue).ifPresent(assessItems::add);
        }
        if (assessItems.isEmpty()) assessItems.addAll(items.findAll());
        if (assessItems.isEmpty()) {
            throw new RuntimeException("No items found to assess — create items first.");
        }
        String scopeLabel = "ITEM".equals(scope) && scopeValue != null && !scopeValue.isBlank() ? scopeValue : "PLANT";

        boolean drawingControlOk = assessItems.stream().allMatch(it ->
            it.getDrawingNumber() != null && !it.getDrawingNumber().isBlank()
                && it.getDrawingRevision() != null && !it.getDrawingRevision().isBlank());
        boolean bomControlOk = assessItems.stream().allMatch(it -> usableBomForItem(it.getCode()) != null);
        boolean routeControlOk = assessItems.stream().allMatch(it ->
            routeSheets.findByItemCode(it.getCode()).stream().anyMatch(r -> Set.of("RELEASED", "APPROVED").contains(r.getStatus())));
        boolean mastersOk = !machines.findAll().isEmpty();
        boolean reservationsOk = !materialReservations.findByStatus("RESERVED").isEmpty();
        boolean activeProductionOk = !workOrders.findByStatus("RELEASED").isEmpty() || !workOrders.findByStatus("IN_PROCESS").isEmpty();
        boolean changeControlOk = !engineeringChanges.findAll().isEmpty();
        boolean stockAccuracyOk = stockBalances.count() > 0;
        boolean revisionTraceOk = assessItems.stream().allMatch(it -> it.getRevision() != null && !it.getRevision().isBlank());

        List<QmsClause> clauses = List.of(
            new QmsClause("7.5.3", "Control of documented information",
                "Documented information required by the QMS shall be controlled to ensure it is available and protected.",
                "DOCUMENTATION", "Item Master / Drawing register", "PR-QC-01",
                "Capture the drawing number and current revision for every item on the Item Master.",
                "Items missing drawing number or drawing revision",
                drawingControlOk),
            new QmsClause("7.1.5", "Monitoring and measuring resources",
                "The organization shall determine, provide and maintain resources to ensure valid monitoring results.",
                "EQUIPMENT", "Machine Master", "PR-MAINT-01",
                "Register the plant machinery so load planning and calibration tracking can reference real capacity.",
                "No machines registered in the Machine Master",
                mastersOk),
            new QmsClause("8.3.5", "Design and development outputs",
                "Design outputs shall be reviewed, verified, validated and approved before release.",
                "DESIGN", "Production BOM master", "PR-DES-01",
                "Maintain an active, approved BOM for every manufactured finished good.",
                "Items without an active/approved BOM",
                bomControlOk),
            new QmsClause("8.5.1", "Control of production and service provision",
                "Production shall be carried out under controlled conditions, including available documented information.",
                "PROCESS", "Route Sheet master", "PR-PROD-01",
                "Maintain a released/approved Route Sheet per manufactured item so operations are planned and repeatable.",
                "Items without a released/approved Route Sheet",
                routeControlOk),
            new QmsClause("8.5.2", "Identification and traceability",
                "The organization shall identify the status of outputs and control unique identification when traceability is a requirement.",
                "PROCESS", "Material Reservation", "PR-INV-01",
                "Record material reservations so WIP and lot traceability start at issue.",
                "No active material reservations captured",
                reservationsOk),
            new QmsClause("8.7", "Control of nonconforming outputs",
                "Nonconforming outputs shall be identified and controlled to prevent delivery to the customer.",
                "QUALITY", "ECR / ECO register", "PR-QC-02",
                "Route engineering changes through the ECR approval workflow and record dispositions.",
                "No engineering change records exist — change handling is not demonstrated",
                changeControlOk),
            new QmsClause("10.2", "Nonconformity and corrective action",
                "The organization shall react to nonconformities and take action to eliminate causes.",
                "PROCESS", "MRP / Gap Analysis", "PR-MRP-01",
                "Run the capacity MRP and review its output for shortfall items before releasing production.",
                "No active/released or in-process work orders found",
                activeProductionOk),
            new QmsClause("7.1.4", "Environment for the operation of processes",
                "The organization shall determine, provide and maintain the environment necessary for operation.",
                "EQUIPMENT", "Stock Balance", "PR-INV-02",
                "Maintain stock balances so environment/consumption and availability are traceable.",
                "No stock balance rows recorded",
                stockAccuracyOk),
            new QmsClause("7.5.1", "General — documented information",
                "The organization's QMS shall include documented information required by standards and the organization itself.",
                "DOCUMENTATION", "Item Master", "PR-DES-02",
                "Record a revision label on every item so drawings/BOM/routes can be traced to a known revision.",
                "Items without a recorded revision label",
                revisionTraceOk)
        );

        for (QmsClause clause : clauses) {
            GapAnalysisResult result = new GapAnalysisResult();
            result.setRun(run);
            result.setGapType("QMS");
            result.setClauseNo(clause.no());
            result.setClauseText(clause.text());
            result.setReferenceDoc(clause.referenceDoc());
            result.setProcedureRef(clause.procedureRef());
            result.setChangeCategory(clause.category());
            result.setContextCode(scopeLabel);
            result.setContextDescription(clause.title());
            result.setGapDescription(clause.gapDescription());
            result.setComplianceStatus(clause.compliant() ? "COMPLIANT" : "NON_COMPLIANT");
            result.setSeverity(clause.compliant() ? "LOW" : "HIGH");
            result.setSuggestedAction(clause.remediation());
            result.setActionStatus(clause.compliant() ? "OK" : "OPEN");
            result.setCreatedAt(Instant.now());
            gapAnalysisResults.save(result);
        }

        run.setStatus("COMPLETE");
        run.setGeneratedBy(principalName(principal));
        run.setUpdatedAt(Instant.now());
        return gapAnalysisRuns.save(run);
    }

    private record QmsClause(String no, String title, String text, String category,
                             String referenceDoc, String procedureRef,
                             String remediation, String gapDescription, boolean compliant) {}

    // ===========================
    // ---- Cost Estimation ------
    // ===========================

    @GetMapping("/api/v1/planning/cost-estimations")
    public List<CostEstimation> listCostEstimations() { return costEstimations.findAll(); }

    @PostMapping("/api/v1/planning/cost-estimations")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public CostEstimation createCostEstimation(@RequestBody CostEstimation ce, Principal principal) {
        ce.setId(null);
        ce.setEstimationNumber(numbers.next("cost-estimation", "CE"));
        if (ce.getStatus() == null) ce.setStatus("DRAFT");
        if (ce.getEstimationVersion() == null) ce.setEstimationVersion(1);
        if (ce.getCurrencyCode() == null) ce.setCurrencyCode("INR");
        ce.setCreatedBy(principalName(principal));
        ce.setCreatedAt(Instant.now());
        return costEstimations.save(ce);
    }

    @GetMapping("/api/v1/planning/cost-estimations/{id}")
    public CostEstimation getCostEstimation(@PathVariable Long id) {
        return costEstimations.findById(id).orElseThrow(() -> new RuntimeException("Cost Estimation not found"));
    }

    @PutMapping("/api/v1/planning/cost-estimations/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public CostEstimation updateCostEstimation(@PathVariable Long id, @RequestBody CostEstimation ce, Principal principal) {
        CostEstimation e = costEstimations.findById(id).orElseThrow(() -> new RuntimeException("Cost Estimation not found"));
        // FRS §10/§22: estimates are versioned, not overwritten — only DRAFT estimates are editable in place.
        if (!"DRAFT".equals(e.getStatus())) {
            throw new IllegalStateException("Estimate " + e.getEstimationNumber() + " is " + e.getStatus()
                + " and cannot be edited in place. Use 'Go to New Version' to create a new editable revision.");
        }
        // Merge only caller-editable header fields onto the managed entity; never trust the payload for
        // workflow state, generated numbers, approval stamps or computed totals (in-place PUT fix).
        e.setItemCode(ce.getItemCode());
        e.setItemDescription(ce.getItemDescription());
        e.setCustomerName(ce.getCustomerName());
        e.setCustomerId(ce.getCustomerId());
        e.setSoNumber(ce.getSoNumber());
        e.setSoId(ce.getSoId());
        e.setBatchQty(ce.getBatchQty());
        e.setBomId(ce.getBomId());
        e.setRouteId(ce.getRouteId());
        e.setCurrencyCode(ce.getCurrencyCode());
        e.setExchangeRate(ce.getExchangeRate());
        e.setProfitMarginPercent(ce.getProfitMarginPercent());
        e.setValidUpto(ce.getValidUpto());
        e.setPreparedBy(ce.getPreparedBy());
        e.setRemarks(ce.getRemarks());
        e.setRateFrom(ce.getRateFrom());
        e.setReferenceScreen(ce.getReferenceScreen());
        e.setReferenceNo(ce.getReferenceNo());
        e.setProductImageUrl(ce.getProductImageUrl());
        e.setProcessRateApplicable(ce.getProcessRateApplicable());
        e.setProfitFrom(ce.getProfitFrom());
        e.setMakeupPercent(ce.getMakeupPercent());
        e.setMakeupAmount(ce.getMakeupAmount());
        e.setDiscountPercent(ce.getDiscountPercent());
        e.setRoundOff(ce.getRoundOff());
        e.setUpdatedAt(Instant.now());
        e.setUpdatedBy(principalName(principal));
        return costEstimations.save(e);
    }

    /** FRS §22 / §506: "Go to New Version" clones an estimate (header + lines) as a new DRAFT
     * revision, preserving the prior version untouched and linking back to it. */
    @PostMapping("/api/v1/planning/cost-estimations/{id}/new-version")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public CostEstimation newCostEstimationVersion(@PathVariable Long id, Principal principal) {
        CostEstimation src = costEstimations.findById(id).orElseThrow(() -> new RuntimeException("Cost Estimation not found"));
        CostEstimation clone = new CostEstimation();
        clone.setItemCode(src.getItemCode());
        clone.setItemDescription(src.getItemDescription());
        clone.setCustomerName(src.getCustomerName());
        clone.setCustomerId(src.getCustomerId());
        clone.setSoNumber(src.getSoNumber());
        clone.setSoId(src.getSoId());
        clone.setBatchQty(src.getBatchQty());
        clone.setBomId(src.getBomId());
        clone.setRouteId(src.getRouteId());
        clone.setCurrencyCode(src.getCurrencyCode());
        clone.setExchangeRate(src.getExchangeRate());
        clone.setProfitMarginPercent(src.getProfitMarginPercent());
        clone.setValidUpto(src.getValidUpto());
        clone.setRemarks(src.getRemarks());
        clone.setRateFrom(src.getRateFrom());
        clone.setReferenceScreen(src.getReferenceScreen());
        clone.setReferenceNo(src.getReferenceNo());
        clone.setProductImageUrl(src.getProductImageUrl());
        clone.setProcessRateApplicable(src.getProcessRateApplicable());
        clone.setProfitFrom(src.getProfitFrom());
        clone.setMakeupPercent(src.getMakeupPercent());
        clone.setMakeupAmount(src.getMakeupAmount());
        clone.setDiscountPercent(src.getDiscountPercent());
        clone.setRoundOff(src.getRoundOff());
        clone.setEstimationNumber(numbers.next("cost-estimation", "CE"));
        clone.setEstimationVersion((src.getEstimationVersion() == null ? 1 : src.getEstimationVersion()) + 1);
        clone.setPriorVersionId(src.getId());
        clone.setStatus("DRAFT");
        clone.setIsActiveQuote(false);
        clone.setPreparedBy(principalName(principal));
        clone.setPreparedDate(Instant.now());
        clone.setCreatedBy(principalName(principal));
        clone.setCreatedAt(Instant.now());
        CostEstimation saved = costEstimations.save(clone);

        for (CostEstimationLine srcLine : costEstimationLines.findByEstimationId(id)) {
            CostEstimationLine line = new CostEstimationLine();
            line.setEstimation(saved);
            line.setLineType(srcLine.getLineType());
            line.setComponentItemCode(srcLine.getComponentItemCode());
            line.setComponentName(srcLine.getComponentName());
            line.setItemName(srcLine.getItemName());
            line.setOpSequence(srcLine.getOpSequence());
            line.setOperationName(srcLine.getOperationName());
            line.setMachineCode(srcLine.getMachineCode());
            line.setQtyRequired(srcLine.getQtyRequired());
            line.setRatePerUnit(srcLine.getRatePerUnit());
            line.setAmount(srcLine.getAmount());
            line.setMachineHourRate(srcLine.getMachineHourRate());
            line.setSetupTimeHrs(srcLine.getSetupTimeHrs());
            line.setCycleTimeHrs(srcLine.getCycleTimeHrs());
            line.setTotalTimeHrs(srcLine.getTotalTimeHrs());
            line.setMachineCost(srcLine.getMachineCost());
            line.setLabourHours(srcLine.getLabourHours());
            line.setLabourRate(srcLine.getLabourRate());
            line.setLabourCost(srcLine.getLabourCost());
            line.setToolingCost(srcLine.getToolingCost());
            line.setIsSubcontract(srcLine.getIsSubcontract());
            line.setSubcontractRate(srcLine.getSubcontractRate());
            line.setSubcontractCost(srcLine.getSubcontractCost());
            line.setSourceRate(srcLine.getSourceRate());
            line.setRemarks(srcLine.getRemarks());
            line.setStockUom(srcLine.getStockUom());
            line.setConversionRatio(srcLine.getConversionRatio());
            line.setAlternateUom(srcLine.getAlternateUom());
            line.setBomQtyAltUom(srcLine.getBomQtyAltUom());
            line.setBomQtyStockUom(srcLine.getBomQtyStockUom());
            line.setRateStockUom(srcLine.getRateStockUom());
            line.setRateAltUom(srcLine.getRateAltUom());
            line.setProductAmount(srcLine.getProductAmount());
            line.setScrapQty(srcLine.getScrapQty());
            line.setScrapRate(srcLine.getScrapRate());
            line.setScrapAmount(srcLine.getScrapAmount());
            line.setThickness(srcLine.getThickness());
            line.setWidth(srcLine.getWidth());
            line.setLength(srcLine.getLength());
            line.setDimensionUom(srcLine.getDimensionUom());
            line.setDensityFactor(srcLine.getDensityFactor());
            line.setEfficiencyPct(srcLine.getEfficiencyPct());
            line.setBatchQty(srcLine.getBatchQty());
            line.setQty(srcLine.getQty());
            line.setProcessCost(srcLine.getProcessCost());
            line.setSetupRateHr(srcLine.getSetupRateHr());
            line.setInsRateHr(srcLine.getInsRateHr());
            line.setProcessTimeMin(srcLine.getProcessTimeMin());
            line.setSetupTimeMin(srcLine.getSetupTimeMin());
            line.setInsTimeMin(srcLine.getInsTimeMin());
            line.setOtherBasis(srcLine.getOtherBasis());
            line.setOtherPercent(srcLine.getOtherPercent());
            line.setOtherType(srcLine.getOtherType());
            line.setOtherDescription(srcLine.getOtherDescription());
            line.setCreatedAt(Instant.now());
            costEstimationLines.save(line);
        }
        return saved;
    }

    @DeleteMapping("/api/v1/planning/cost-estimations/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteCostEstimation(@PathVariable Long id) {
        costEstimationLines.findByEstimationId(id).forEach(l -> costEstimationLines.deleteById(l.getId()));
        costEstimations.deleteById(id);
    }

    @GetMapping("/api/v1/planning/cost-estimations/{id}/lines")
    public List<CostEstimationLine> getCostEstimationLines(@PathVariable Long id) {
        return costEstimationLines.findByEstimationId(id);
    }

    @PostMapping("/api/v1/planning/cost-estimations/{id}/lines")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public CostEstimationLine addCostEstimationLine(@PathVariable Long id, @RequestBody CostEstimationLine line, Principal principal) {
        CostEstimation ce = costEstimations.findById(id).orElseThrow(() -> new RuntimeException("Cost Estimation not found"));
        line.setId(null);
        line.setEstimation(ce);
        line.setCreatedAt(Instant.now());
        return costEstimationLines.save(line);
    }

    @PutMapping("/api/v1/planning/cost-estimations/lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public CostEstimationLine updateCostEstimationLine(@PathVariable Long lineId, @RequestBody CostEstimationLine line, Principal principal) {
        CostEstimationLine e = costEstimationLines.findById(lineId).orElseThrow(() -> new RuntimeException("Cost Estimation Line not found"));
        line.setId(lineId);
        line.setEstimation(e.getEstimation());
        line.setCreatedAt(e.getCreatedAt());
        line.setUpdatedAt(Instant.now());
        return costEstimationLines.save(line);
    }

    @DeleteMapping("/api/v1/planning/cost-estimations/lines/{lineId}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteCostEstimationLine(@PathVariable Long lineId) { costEstimationLines.deleteById(lineId); }

    @PostMapping("/api/v1/planning/cost-estimations/{id}/actions/{action}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public CostEstimation costEstimationAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        CostEstimation ce = costEstimations.findById(id).orElseThrow(() -> new RuntimeException("Cost Estimation not found"));
        switch (action.toLowerCase()) {
            case "submit":
                ce.setStatus("SUBMITTED");
                ce.setPreparedBy(principalName(principal));
                createApprovalSteps("COST_ESTIMATION", ce.getId(), List.of("COST_ACCOUNTANT", "PLANT_HEAD"), principal);
                break;
            case "approve":
                ce.setStatus("APPROVED");
                ce.setApprovedBy(principalName(principal));
                advanceApprovalStep("COST_ESTIMATION", ce.getId(), principalName(principal));
                break;
            default:
                throw new RuntimeException("Unknown action: " + action);
        }
        ce.setUpdatedAt(Instant.now());
        ce.setUpdatedBy(principalName(principal));
        return costEstimations.save(ce);
    }

    // ---- Auto-calculate cost estimation from BOM + Route (FRS §10/§22) ----
    @PostMapping("/api/v1/planning/cost-estimations/{id}/calculate")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public CostEstimation calculateCostEstimation(@PathVariable Long id, Principal principal) {
        CostEstimation ce = costEstimations.findById(id).orElseThrow(() -> new RuntimeException("Cost Estimation not found"));

        // Preserve manual data: OTHER cost lines are never regenerated, and manual dimension /
        // alt-UOM / efficiency overrides keyed by component or operation survive recalculation.
        Map<String, CostEstimationLine> manualByComponent = new LinkedHashMap<>();
        Map<Integer, CostEstimationLine> manualByOp = new LinkedHashMap<>();
        List<CostEstimationLine> otherLines = new ArrayList<>();
        for (CostEstimationLine l : costEstimationLines.findByEstimationId(id)) {
            if ("OTHER".equalsIgnoreCase(l.getLineType())) { otherLines.add(l); continue; }
            if ("MATERIAL".equalsIgnoreCase(l.getLineType()) && l.getComponentItemCode() != null) {
                manualByComponent.put(l.getComponentItemCode(), l);
            } else if ("MACHINE".equalsIgnoreCase(l.getLineType()) && l.getOpSequence() != null) {
                manualByOp.put(l.getOpSequence(), l);
            }
            costEstimationLines.deleteById(l.getId());
        }

        BigDecimal totalMaterialCost = BigDecimal.ZERO;
        BigDecimal totalProcessCost = BigDecimal.ZERO;
        BigDecimal scrapCredit = BigDecimal.ZERO;
        BigDecimal batchQty = ce.getBatchQty() == null ? BigDecimal.ONE : ce.getBatchQty();

        // Material cost from BOM (count-based, alternate-UOM or dimension-based)
        if (ce.getBomId() != null) {
            ProductionBOM bom = productionBoms.findById(ce.getBomId()).orElse(null);
            if (bom != null) {
                for (ProductionBOMLine bomLine : bom.getLines()) {
                    CostEstimationLine prior = manualByComponent.get(bomLine.getComponentItemCode());
                    BigDecimal qtyPer = bomLine.getQuantityPer() == null ? BigDecimal.ONE : bomLine.getQuantityPer();
                    Optional<ItemMaster> itemOpt = items.findByCode(bomLine.getComponentItemCode());
                    BigDecimal rate = (itemOpt.isPresent() && itemOpt.get().getDefaultRate() != null)
                        ? itemOpt.get().getDefaultRate() : BigDecimal.ZERO;

                    BigDecimal thickness = prior != null ? prior.getThickness() : null;
                    BigDecimal width = prior != null ? prior.getWidth() : null;
                    BigDecimal length = prior != null ? prior.getLength() : null;
                    BigDecimal density = prior != null ? prior.getDensityFactor() : null;
                    BigDecimal conversionRatio = prior != null ? prior.getConversionRatio() : null;

                    // FRS §22: dimension-based qty = Thickness × Width × Length × density factor;
                    // fall back to the BOM's explicit required qty, then to quantity-per.
                    BigDecimal unitQty = qtyPer;
                    if (thickness != null && width != null && length != null && density != null) {
                        unitQty = thickness.multiply(width).multiply(length).multiply(density);
                    } else if (bomLine.getRequiredQty() != null) {
                        unitQty = bomLine.getRequiredQty();
                    }
                    BigDecimal totalQty = unitQty.multiply(batchQty);

                    // Alternate-UOM rate: prefer a stock-UOM rate, else convert an alt-UOM rate back.
                    BigDecimal rateUsed = rate;
                    if (prior != null && prior.getRateStockUom() != null) {
                        rateUsed = prior.getRateStockUom();
                    } else if (prior != null && prior.getRateAltUom() != null && conversionRatio != null
                               && conversionRatio.compareTo(BigDecimal.ZERO) > 0) {
                        rateUsed = prior.getRateAltUom().divide(conversionRatio, 6, RoundingMode.HALF_UP);
                    }

                    BigDecimal scrapQty = prior != null && prior.getScrapQty() != null ? prior.getScrapQty() : BigDecimal.ZERO;
                    BigDecimal scrapRate = prior != null && prior.getScrapRate() != null ? prior.getScrapRate() : BigDecimal.ZERO;
                    BigDecimal scrapAmount = scrapQty.multiply(scrapRate);
                    BigDecimal productAmount = totalQty.multiply(rateUsed);
                    BigDecimal amount = productAmount.subtract(scrapAmount); // scrap recovery is a credit
                    totalMaterialCost = totalMaterialCost.add(amount);
                    scrapCredit = scrapCredit.add(scrapAmount);

                    CostEstimationLine line = new CostEstimationLine();
                    line.setEstimation(ce);
                    line.setLineType("MATERIAL");
                    line.setComponentItemCode(bomLine.getComponentItemCode());
                    line.setComponentName(bomLine.getDescription());
                    line.setItemName(bomLine.getDescription());
                    line.setStockUom(bomLine.getUom());
                    line.setConversionRatio(conversionRatio);
                    line.setAlternateUom(prior != null ? prior.getAlternateUom() : null);
                    line.setBomQtyStockUom(unitQty);
                    line.setBomQtyAltUom(conversionRatio != null && conversionRatio.compareTo(BigDecimal.ZERO) > 0
                        ? unitQty.multiply(conversionRatio) : null);
                    line.setRateStockUom(rateUsed);
                    line.setRateAltUom(prior != null ? prior.getRateAltUom() : null);
                    line.setQtyRequired(totalQty);
                    line.setRatePerUnit(rateUsed);
                    line.setProductAmount(productAmount);
                    line.setThickness(thickness);
                    line.setWidth(width);
                    line.setLength(length);
                    line.setDensityFactor(density);
                    line.setScrapQty(scrapQty);
                    line.setScrapRate(scrapRate);
                    line.setScrapAmount(scrapAmount);
                    line.setAmount(amount);
                    line.setCreatedAt(Instant.now());
                    costEstimationLines.save(line);
                }
            }
        }

        // Process cost from Route — standard time inflated by efficiency (FRS §22)
        boolean includeProcess = !Boolean.FALSE.equals(ce.getProcessRateApplicable());
        if (includeProcess && ce.getRouteId() != null) {
            RouteSheet route = routeSheets.findById(ce.getRouteId()).orElse(null);
            if (route != null) {
                for (RouteOperation op : route.getOperations()) {
                    CostEstimationLine prior = op.getSequenceNo() != null ? manualByOp.get(op.getSequenceNo()) : null;
                    BigDecimal setupMin = op.getSetupTime() == null ? BigDecimal.ZERO : op.getSetupTime();
                    BigDecimal cycleMin = op.getCycleTime() == null ? BigDecimal.ZERO : op.getCycleTime();
                    BigDecimal setupHrs = setupMin.divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
                    BigDecimal cycleHrs = cycleMin.divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
                    BigDecimal standardTimeHrs = setupHrs.add(cycleHrs.multiply(batchQty));

                    BigDecimal hourlyRate = BigDecimal.ZERO;
                    BigDecimal efficiencyPct = prior != null ? prior.getEfficiencyPct() : null;
                    if (op.getWorkCenterCode() != null) {
                        Optional<WorkCenter> wcOpt = workCenters.findByCode(op.getWorkCenterCode());
                        if (wcOpt.isPresent()) {
                            WorkCenter wc = wcOpt.get();
                            if (wc.getHourlyRate() != null) hourlyRate = wc.getHourlyRate();
                            if (efficiencyPct == null && wc.getEfficiencyPct() != null) efficiencyPct = wc.getEfficiencyPct();
                        }
                    }
                    if (hourlyRate.compareTo(BigDecimal.ZERO) == 0 && op.getStandardCostRate() != null) {
                        hourlyRate = op.getStandardCostRate();
                    }
                    // Actual Time = Standard Time ÷ (Efficiency / 100) — never cost at 100% theoretical.
                    BigDecimal totalTimeHrs = standardTimeHrs;
                    if (efficiencyPct != null && efficiencyPct.compareTo(BigDecimal.ZERO) > 0) {
                        totalTimeHrs = standardTimeHrs.multiply(BigDecimal.valueOf(100))
                            .divide(efficiencyPct, 6, RoundingMode.HALF_UP);
                    }
                    BigDecimal machineCost = totalTimeHrs.multiply(hourlyRate);
                    totalProcessCost = totalProcessCost.add(machineCost);

                    CostEstimationLine line = new CostEstimationLine();
                    line.setEstimation(ce);
                    line.setLineType("MACHINE");
                    line.setOpSequence(op.getSequenceNo());
                    line.setOperationName(op.getOperationDescription());
                    line.setItemName(ce.getItemDescription());
                    line.setMachineCode(op.getMachineCode());
                    line.setMachineHourRate(hourlyRate);
                    line.setEfficiencyPct(efficiencyPct);
                    line.setBatchQty(batchQty);
                    line.setQty(cycleMin);
                    line.setSetupTimeHrs(setupHrs);
                    line.setCycleTimeHrs(cycleHrs);
                    line.setSetupTimeMin(setupMin);
                    line.setProcessTimeMin(cycleMin);
                    line.setTotalTimeHrs(totalTimeHrs);
                    line.setProcessCost(machineCost);
                    line.setMachineCost(machineCost);
                    line.setCreatedAt(Instant.now());
                    costEstimationLines.save(line);
                }
            }
        }

        // Other Cost — repeatable overhead % lines (ADD/DEDUCT), plus manual labour/tooling/subcontract/overhead
        BigDecimal rawMaterialCost = totalMaterialCost;
        BigDecimal otherCost = BigDecimal.ZERO;
        for (CostEstimationLine l : otherLines) {
            BigDecimal pct = l.getOtherPercent() == null ? BigDecimal.ZERO : l.getOtherPercent();
            BigDecimal basis = otherBasisAmount(l.getOtherBasis(), rawMaterialCost, totalProcessCost,
                ce.getTotalOverheadCost() == null ? BigDecimal.ZERO : ce.getTotalOverheadCost());
            BigDecimal amt = basis.multiply(pct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if ("DEDUCT".equalsIgnoreCase(l.getOtherType())) amt = amt.negate();
            l.setAmount(amt);
            l.setEstimation(ce);
            l.setUpdatedAt(Instant.now());
            costEstimationLines.save(l);
            otherCost = otherCost.add(amt);
        }
        otherCost = otherCost
            .add(ce.getTotalLabourCost() == null ? BigDecimal.ZERO : ce.getTotalLabourCost())
            .add(ce.getTotalToolingCost() == null ? BigDecimal.ZERO : ce.getTotalToolingCost())
            .add(ce.getTotalSubcontractCost() == null ? BigDecimal.ZERO : ce.getTotalSubcontractCost())
            .add(ce.getTotalOverheadCost() == null ? BigDecimal.ZERO : ce.getTotalOverheadCost());

        BigDecimal netCost = rawMaterialCost.add(totalProcessCost).add(otherCost);
        BigDecimal profitBasis = switch (ce.getProfitFrom() == null ? "TOTAL" : ce.getProfitFrom().toUpperCase()) {
            case "RAW_MATERIAL", "MATERIAL" -> rawMaterialCost;
            case "PROCESS" -> totalProcessCost;
            default -> netCost;
        };
        BigDecimal profitMargin = ce.getProfitMarginPercent() == null ? BigDecimal.ZERO : ce.getProfitMarginPercent();
        BigDecimal profitAmount = profitBasis.multiply(profitMargin).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal makeupPct = ce.getMakeupPercent() == null ? BigDecimal.ZERO : ce.getMakeupPercent();
        BigDecimal makeupAmount = netCost.multiply(makeupPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
            .add(ce.getMakeupAmount() == null ? BigDecimal.ZERO : ce.getMakeupAmount());
        BigDecimal preDiscount = netCost.add(profitAmount).add(makeupAmount);
        BigDecimal discountPct = ce.getDiscountPercent() == null ? BigDecimal.ZERO : ce.getDiscountPercent();
        BigDecimal discount = preDiscount.multiply(discountPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal sellingPrice = preDiscount.subtract(discount);
        if (Boolean.TRUE.equals(ce.getRoundOff())) {
            sellingPrice = sellingPrice.setScale(0, RoundingMode.HALF_UP);
        }

        ce.setTotalMaterialCost(rawMaterialCost);
        ce.setTotalMachineCost(totalProcessCost);
        ce.setScrapAllowanceCost(scrapCredit);
        ce.setOtherCostAmount(otherCost);
        ce.setNetCost(netCost);
        ce.setTotalManufacturingCost(netCost);
        ce.setProfitAmount(profitAmount);
        ce.setEstimatedSellingPrice(sellingPrice);
        ce.setUpdatedAt(Instant.now());
        return costEstimations.save(ce);
    }

    private BigDecimal otherBasisAmount(String basis, BigDecimal rawMaterial, BigDecimal process, BigDecimal overhead) {
        if (basis == null) return BigDecimal.ZERO;
        return switch (basis.toUpperCase()) {
            case "RAW_MATERIAL", "MATERIAL" -> rawMaterial;
            case "PROCESS" -> process;
            case "TOTAL", "NET" -> rawMaterial.add(process).add(overhead);
            default -> BigDecimal.ZERO;
        };
    }

    // ---- Cost Estimate vs Actual Reconciliation ----
    @PostMapping("/api/v1/planning/cost-estimations/{id}/reconcile")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public Map<String, Object> reconcileCostEstimation(@PathVariable Long id, Principal principal) {
        CostEstimation ce = costEstimations.findById(id).orElseThrow(() -> new RuntimeException("Cost Estimation not found"));

        String itemCode = ce.getItemCode();
        List<WorkOrder> wos = workOrders.findByItemCode(itemCode);

        BigDecimal actualMachine = BigDecimal.ZERO;
        for (WorkOrder wo : wos) {
            // Machine cost from production entries: run_time × work_center.hourly_rate
            Number machCost = (Number) em.createNativeQuery(
                    "SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(sfe.end_time, NOW()) - sfe.start_time)) / 3600 * " +
                    "COALESCE(wc.hourly_rate, 0)), 0) " +
                    "FROM shop_floor_entry sfe " +
                    "LEFT JOIN work_center wc ON wc.code = sfe.machine_code " +
                    "WHERE sfe.work_order_no = :woNo AND sfe.status = 'APPROVED' AND sfe.deleted_at IS NULL")
                    .setParameter("woNo", wo.getDocNo())
                    .getSingleResult();
            actualMachine = actualMachine.add(machCost != null ? new BigDecimal(machCost.toString()) : BigDecimal.ZERO);
        }

        BigDecimal actualTotal = actualMachine;
        BigDecimal estMaterial = ce.getTotalMaterialCost() != null ? ce.getTotalMaterialCost() : BigDecimal.ZERO;
        BigDecimal estMachine = ce.getTotalMachineCost() != null ? ce.getTotalMachineCost() : BigDecimal.ZERO;
        BigDecimal estTotal = ce.getTotalManufacturingCost() != null ? ce.getTotalManufacturingCost() : BigDecimal.ZERO;

        BigDecimal varMachine = actualMachine.subtract(estMachine);
        BigDecimal varTotal = actualTotal.subtract(estTotal);

        ce.setActualMachineCost(actualMachine);
        ce.setActualTotalCost(actualTotal);
        ce.setVarianceMachine(varMachine);
        ce.setVarianceTotal(varTotal);
        ce.setUpdatedAt(Instant.now());
        costEstimations.save(ce);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("estimationNumber", ce.getEstimationNumber());
        result.put("itemCode", ce.getItemCode());
        result.put("workOrders", wos.stream().map(WorkOrder::getDocNo).toList());
        result.put("estimated", Map.of(
                "material", estMaterial, "machine", estMachine, "total", estTotal));
        result.put("actual", Map.of(
                "machine", actualMachine, "total", actualTotal));
        result.put("variance", Map.of(
                "machine", varMachine, "total", varTotal));
        if (estTotal.compareTo(BigDecimal.ZERO) > 0) {
            result.put("variancePercent", Map.of(
                    "machine", varMachine.multiply(BigDecimal.valueOf(100)).divide(estTotal, 2, RoundingMode.HALF_UP),
                    "total", varTotal.multiply(BigDecimal.valueOf(100)).divide(estTotal, 2, RoundingMode.HALF_UP)));
        }
        return result;
    }

    // ===========================
    // §3.4 Material Reservation --
    // ===========================

    @GetMapping("/api/v1/planning/material-reservations")
    public List<MaterialReservation> listMaterialReservations() { return materialReservations.findAll(); }

    @PostMapping("/api/v1/planning/material-reservations")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public MaterialReservation createMaterialReservation(@RequestBody MaterialReservation r, Principal principal) {
        r.setId(null);
        r.setReservationNumber(numbers.next("material-reservation", "MRES"));
        r.setReservedDate(Instant.now());
        r.setStatus("RESERVED");
        r.setCreatedBy(principalName(principal));
        return materialReservations.save(r);
    }

    @PutMapping("/api/v1/planning/material-reservations/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public MaterialReservation updateMaterialReservation(@PathVariable Long id, @RequestBody MaterialReservation r, Principal principal) {
        r.setId(id);
        r.setUpdatedBy(principalName(principal));
        return materialReservations.save(r);
    }

    @PostMapping("/api/v1/planning/material-reservations/{id}/release")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public MaterialReservation releaseMaterialReservation(@PathVariable Long id) {
        MaterialReservation r = materialReservations.findById(id).orElseThrow(() -> new RuntimeException("Reservation not found"));
        r.setStatus("RELEASED");
        r.setReleasedDate(Instant.now());
        return materialReservations.save(r);
    }

    // ===========================
    // §3.5 FG Possible Persistent
    // ===========================

    @GetMapping("/api/v1/planning/fg-possible-list")
    public List<FgPossible> listFgPossible() { return fgPossibles.findAll(); }

    @PostMapping("/api/v1/planning/fg-possible-list")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public FgPossible createFgPossible(@RequestBody FgPossible fp, Principal principal) {
        fp.setId(null);
        fp.setInquiryNumber(numbers.next("fg-possible", "FGP"));
        fp.setRunBy(principalName(principal));
        fp.setRunDate(Instant.now());
        fp.setStatus("COMPLETE");
        return fgPossibles.save(fp);
    }

    @GetMapping("/api/v1/planning/fg-possible-list/{id}")
    public FgPossible getFgPossible(@PathVariable Long id) {
        return fgPossibles.findById(id).orElseThrow(() -> new RuntimeException("FG Possible inquiry not found"));
    }

    @PutMapping("/api/v1/planning/fg-possible-list/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    public FgPossible updateFgPossible(@PathVariable Long id, @RequestBody FgPossible fp, Principal principal) {
        fp.setId(id);
        fp.setUpdatedBy(principalName(principal));
        return fgPossibles.save(fp);
    }

    // ===========================
    // §3.10 Cost Component Type --
    // ===========================

    @GetMapping("/api/v1/planning/cost-component-types")
    public List<CostComponentType> listCostComponentTypes() {
        return costComponentTypes.findByIsActiveTrueOrderBySortOrderAsc();
    }

    // ===========================
    // §3.3 Route Operation Inspections
    // ===========================

    @GetMapping("/api/v1/planning/route-operations/{opId}/inspections")
    public List<RouteOperationInspection> listInspections(@PathVariable Long opId) {
        return routeOpInspections.findByRouteOperationIdOrderBySortOrderAsc(opId);
    }

    @PostMapping("/api/v1/planning/route-operations/{opId}/inspections")
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    public RouteOperationInspection addInspection(@PathVariable Long opId, @RequestBody RouteOperationInspection insp) {
        RouteOperation op = em.find(RouteOperation.class, opId);
        if (op == null) throw new RuntimeException("Route Operation not found");
        insp.setRouteOperation(op);
        insp.setId(null);
        return routeOpInspections.save(insp);
    }

    @DeleteMapping("/api/v1/planning/route-inspections/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    public void deleteInspection(@PathVariable Long id) {
        routeOpInspections.deleteById(id);
    }

    // ===========================
    // §3.2 BOM Where-Used + Version Compare
    // ===========================

    @GetMapping("/api/v1/planning/production-bom/{id}/where-used")
    public List<Map<String, Object>> bomWhereUsed(@PathVariable Long id) {
        ProductionBOM bom = productionBoms.findById(id).orElseThrow(() -> new RuntimeException("BOM not found"));
        String itemCode = bom.getItemCode();
        List<Map<String, Object>> result = new ArrayList<>();
        // Find WOs using this BOM
        List<WorkOrder> wos = workOrders.findByBomId(id);
        for (WorkOrder wo : wos) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("type", "WORK_ORDER");
            entry.put("reference", wo.getWoNumber());
            entry.put("itemCode", wo.getItemCode());
            entry.put("status", wo.getStatus());
            entry.put("quantity", wo.getOrderQuantity());
            result.add(entry);
        }
        // Find other BOMs referencing this item as a component
        List<ProductionBOM> allBoms = productionBoms.findAll();
        for (ProductionBOM other : allBoms) {
            if (other.getId().equals(id)) continue;
            boolean used = other.getLines().stream()
                .anyMatch(line -> itemCode.equals(line.getComponentItemCode()));
            if (used) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("type", "PRODUCTION_BOM");
                entry.put("reference", other.getBomNumber());
                entry.put("itemCode", other.getItemCode());
                entry.put("status", other.getStatus());
                entry.put("quantity", other.getBaseQuantity());
                result.add(entry);
            }
        }
        return result;
    }

    @GetMapping("/api/v1/planning/production-bom/{id}/version-compare")
    public Map<String, Object> bomVersionCompare(@PathVariable Long id) {
        ProductionBOM bom = productionBoms.findById(id).orElseThrow(() -> new RuntimeException("BOM not found"));
        Map<String, Object> result = new HashMap<>();
        result.put("currentVersion", bom.getBomVersion());
        result.put("currentRevision", bom.getItemRevision());
        result.put("componentCount", bom.getLines().size());
        if (bom.getPreviousRevisionId() != null) {
            ProductionBOM prev = productionBoms.findById(bom.getPreviousRevisionId()).orElse(null);
            if (prev != null) {
                result.put("previousVersion", prev.getBomVersion());
                result.put("previousComponentCount", prev.getLines().size());
                result.put("changed", !bom.getLines().stream()
                    .map(ProductionBOMLine::getComponentItemCode)
                    .collect(Collectors.toSet())
                    .equals(prev.getLines().stream()
                        .map(ProductionBOMLine::getComponentItemCode)
                        .collect(Collectors.toSet())));
            }
        } else {
            result.put("previousVersion", null);
            result.put("changed", null);
        }
        return result;
    }

    // ===========================
    // §3.8 ECO Existing Orders Gate
    // ===========================

    @GetMapping("/api/v1/planning/engineering-changes/{id}/existing-orders")
    public List<Map<String, Object>> getExistingOrdersForEco(@PathVariable Long id) {
        EngineeringChange ec = engineeringChanges.findById(id).orElseThrow(() -> new RuntimeException("ECR/ECO not found"));
        String itemCode = ec.getItemCode();
        List<WorkOrder> wos = workOrders.findByItemCode(itemCode);
        List<Map<String, Object>> result = new ArrayList<>();
        for (WorkOrder wo : wos) {
            if (wo.getStatus() != null && !List.of("CLOSED", "CANCELLED").contains(wo.getStatus())) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("workOrderId", wo.getId());
                entry.put("woNumber", wo.getWoNumber());
                entry.put("status", wo.getStatus());
                entry.put("orderQuantity", wo.getOrderQuantity());
                entry.put("disposition", null);
                result.add(entry);
            }
        }
        return result;
    }

    @PutMapping("/api/v1/planning/engineering-changes/{id}/mark-evaluated")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    public EngineeringChange markExistingOrdersEvaluated(@PathVariable Long id) {
        EngineeringChange ec = engineeringChanges.findById(id).orElseThrow(() -> new RuntimeException("ECR/ECO not found"));
        ec.setExistingOrdersEvaluated(true);
        return engineeringChanges.save(ec);
    }

    // ===========================
    // ---- Helper Methods -------
    // ===========================

    private String classifySeverity(BigDecimal gapQty, BigDecimal demandQty) {
        if (demandQty.compareTo(BigDecimal.ZERO) == 0) return "LOW";
        BigDecimal pct = gapQty.multiply(BigDecimal.valueOf(100)).divide(demandQty, 2, RoundingMode.HALF_UP);
        if (pct.compareTo(BigDecimal.valueOf(30)) > 0) return "CRITICAL";
        if (pct.compareTo(BigDecimal.valueOf(20)) > 0) return "HIGH";
        if (pct.compareTo(BigDecimal.valueOf(10)) > 0) return "MEDIUM";
        return "LOW";
    }

    private void createApprovalSteps(String docType, Long docId, List<String> roles, Principal principal) {
        approvalSteps.deleteByDocTypeAndDocId(docType, docId);
        int step = 1;
        for (String role : roles) {
            ApprovalStep as = new ApprovalStep();
            as.setDocType(docType);
            as.setDocId(docId);
            as.setStepNo(step++);
            as.setRoleRequired(role);
            as.setStatus("PENDING");
            approvalSteps.save(as);
        }
    }

    private void advanceApprovalStep(String docType, Long docId, String decidedBy) {
        List<ApprovalStep> steps = approvalSteps.findByDocTypeAndDocIdOrderByStepNoAsc(docType, docId);
        for (ApprovalStep s : steps) {
            if ("PENDING".equals(s.getStatus())) {
                s.setStatus("APPROVED");
                s.setDecidedAt(Instant.now());
                s.setComments("Approved by " + decidedBy);
                approvalSteps.save(s);
                break;
            }
        }
    }
}
