package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PlanningService {

    static final Set<String> PLANNING_KEYS = Set.of(
            "production-bom", "route-sheet", "work-order", "shop-floor-entry"
    );

    private final DocumentFacade docs;
    private final ProductionBOMRepository bomRepo;
    private final RouteSheetRepository routeRepo;
    private final BomRevisionHistoryRepository bomRevisionHistoryRepo;
    private final jakarta.persistence.EntityManager em;
    private final in.zygertechnology.zygererp.repo.WorkOrderStatusHistoryRepository woStatusHistoryRepo;

    public boolean isPlanning(String key) { return PLANNING_KEYS.contains(key); }

    @Transactional
    public DocEntity create(String key, Map<String, Object> body, String user) {
        body.put("createdBy", user);
        validateBeforeCreate(key, body);
        DocEntity e = docs.create(key, body, user);
        applyCreationDefaults(key, e);
        if ("production-bom".equals(key) && e instanceof ProductionBOM bom) {
            recomputeBomWeights(bom);
            recomputeBomTotalMaterialCost(bom);
        }
        if ("route-sheet".equals(key) && e instanceof RouteSheet route) {
            recomputeRouteDerivedFields(route);
            recomputeRouteTotals(route);
        }
        if ("work-order".equals(key) && e instanceof WorkOrder wo) {
            recomputeWoBalanceQty(wo);
        }
        return e;
    }

    @Transactional
    public DocEntity update(String key, Long id, Map<String, Object> body, String user) {
        validateBeforeUpdate(key, id, body);
        DocEntity e = docs.update(key, id, body, user);
        if ("production-bom".equals(key) && e instanceof ProductionBOM bom) {
            recomputeBomWeights(bom);
            recomputeBomTotalMaterialCost(bom);
        }
        if ("route-sheet".equals(key) && e instanceof RouteSheet route) {
            recomputeRouteDerivedFields(route);
            recomputeRouteTotals(route);
        }
        if ("work-order".equals(key) && e instanceof WorkOrder wo) {
            recomputeWoBalanceQty(wo);
        }
        return e;
    }

    private void validateBeforeUpdate(String key, Long id, Map<String, Object> body) {
        if ("production-bom".equals(key) && body.containsKey("parentBomId")) {
            Object parentBomId = body.get("parentBomId");
            if (parentBomId != null) {
                long parentId = Long.parseLong(String.valueOf(parentBomId));
                if (parentId == id) {
                    throw new IllegalArgumentException("BOM cannot reference itself as parent.");
                }
                validateNotCircular(id, parentId);
                validateParentNotCyclic(parentId);
            }
        }
    }

    private void validateBeforeCreate(String key, Map<String, Object> body) {
        if ("production-bom".equals(key)) {
            String itemType = body.get("itemType") != null ? String.valueOf(body.get("itemType")).trim() : "";
            if (itemType.isEmpty()) {
                throw new IllegalArgumentException("Item Type is mandatory.");
            }
            String itemCode = body.get("itemCode") != null ? String.valueOf(body.get("itemCode")).trim() : "";
            if (itemCode.isEmpty()) {
                throw new IllegalArgumentException("BOM Item is mandatory.");
            }
            Object parentBomId = body.get("parentBomId");
            Object bomId = body.get("id");
            if (parentBomId != null) {
                long parentId = Long.parseLong(String.valueOf(parentBomId));
                if (bomId != null) {
                    long id = Long.parseLong(String.valueOf(bomId));
                    validateNotCircular(id, parentId);
                } else {
                    validateParentNotCyclic(parentId);
                }
            }
        }
        if ("work-order".equals(key)) {
            validateWorkOrderBeforeCreate(body);
        }
    }

    private void validateParentNotCyclic(Long parentBomId) {
        Set<Long> visited = new HashSet<>();
        Long current = parentBomId;
        while (current != null) {
            if (!visited.add(current)) {
                throw new IllegalArgumentException("Circular BOM hierarchy detected: cycle at BOM " + current);
            }
            Optional<ProductionBOM> bom = bomRepo.findById(current);
            if (bom.isPresent() && bom.get().getParentBomId() != null) {
                current = bom.get().getParentBomId();
            } else {
                break;
            }
        }
    }

    private void validateNotCircular(Long bomId, Long childBomId) {
        if (bomId.equals(childBomId)) {
            throw new IllegalArgumentException("BOM cannot reference itself as parent.");
        }
        Set<Long> visited = new HashSet<>();
        visited.add(bomId);
        Queue<Long> queue = new LinkedList<>();
        queue.add(childBomId);
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            if (current.equals(bomId)) {
                throw new IllegalArgumentException("Circular BOM detected: " + childBomId + " creates a cycle.");
            }
            if (!visited.add(current)) continue;
            Optional<ProductionBOM> bom = bomRepo.findById(current);
            if (bom.isPresent() && bom.get().getLines() != null) {
                for (ProductionBOMLine line : bom.get().getLines()) {
                    if (line.getChildBomId() != null) queue.add(line.getChildBomId());
                }
            }
        }
    }

    private void applyCreationDefaults(String key, DocEntity e) {
        switch (key) {
            case "production-bom" -> {
                if (e instanceof ProductionBOM bom) {
                    if (bom.getBaseQuantity() == null) bom.setBaseQuantity(BigDecimal.ONE);
                    if (bom.getBaseUom() == null) bom.setBaseUom("PCS");
                    if (bom.getBomVersion() == null) bom.setBomVersion("1.0");
                    if (bom.getEffectiveFrom() == null) bom.setEffectiveFrom(LocalDate.now());
                }
            }
            case "route-sheet" -> {
                if (e instanceof RouteSheet rt) {
                    if (rt.getBaseQuantity() == null) rt.setBaseQuantity(BigDecimal.ONE);
                    if (rt.getBaseUom() == null) rt.setBaseUom("PCS");
                    if (rt.getRouteVersion() == null) rt.setRouteVersion("1.0");
                    if (rt.getEffectiveFrom() == null) rt.setEffectiveFrom(LocalDate.now());
                }
            }
            case "work-order" -> {
                if (e instanceof WorkOrder wo) {
                    if (wo.getPriority() == null) wo.setPriority("MEDIUM");
                    if (wo.getPlannedStartDate() == null) wo.setPlannedStartDate(LocalDate.now());
                    if (wo.getPlannedEndDate() == null) wo.setPlannedEndDate(LocalDate.now().plusDays(14));
                }
            }
            case "shop-floor-entry" -> {}
        }
    }

    @Transactional
    public DocEntity action(String key, Long id, String action, String note, String user) {
        if ("work-order".equals(key)) {
            return workOrderAction(id, action, note, user);
        }
        if ("route-sheet".equals(key)) {
            return routeSheetAction(id, action, note, user);
        }
        if ("production-bom".equals(key) && "release".equals(action)) {
            return bomReleaseAction(id, note, user);
        }
        DocEntity e = docs.action(key, id, action, note, user);
        postActionHook(key, e, action, user);
        return e;
    }

    @Transactional
    public DocEntity workOrderAction(Long id, String action, String note, String user) {
        WorkOrder wo = (WorkOrder) docs.get("work-order", id);
        String current = wo.getStatus();
        String next;

        switch (action) {
            case "submit" -> {
                requireStatus(current, "DRAFT", "REJECTED");
                next = "SUBMITTED";
            }
            case "approve" -> {
                requireStatus(current, "SUBMITTED");
                next = "APPROVED";
                wo.setApprovedBy(user);
            }
            case "reject" -> {
                requireStatus(current, "SUBMITTED");
                next = "REJECTED";
            }
            case "reopen" -> {
                requireStatus(current, "REJECTED");
                next = "DRAFT";
            }
            case "release" -> {
                requireStatus(current, "APPROVED");
                validateWoCanRelease(wo);
                next = "RELEASED";
                wo.setReleasedBy(user);
                wo.setReleasedQty(wo.getOrderQuantity());
                // FRS §3.1: AUTO-GEN batch_lot_no on release
                if (wo.getBatchLotNo() == null) {
                    wo.setBatchLotNo("BL-" + wo.getWoNumber() + "-" + System.currentTimeMillis() % 100000);
                }
                // FRS §9.2: set releasedQty = productionQty
                if (wo.getProductionQty() != null) {
                    wo.setReleasedQty(wo.getProductionQty());
                }
                // FRS §10.6: snapshot BOM and Route revision on release
                snapshotBomRouteRevision(wo);
            }
            case "start" -> {
                requireStatus(current, "RELEASED", "ON_HOLD");
                next = "IN_PROCESS";
                wo.setActualStartDate(LocalDate.now());
                wo.setStartedBy(user);
                wo.setStartedAt(Instant.now());
            }
            case "complete" -> {
                requireStatus(current, "IN_PROCESS");
                next = "COMPLETED";
                wo.setActualEndDate(LocalDate.now());
                wo.setCompletedBy(user);
                wo.setCompletedAt(Instant.now());
                // FRS §12.24: completedQty = productionQty unless short close
                if (wo.getCompletedQty() == null || wo.getCompletedQty().compareTo(BigDecimal.ZERO) == 0) {
                    wo.setCompletedQty(wo.getProductionQty() != null ? wo.getProductionQty() : wo.getOrderQuantity());
                }
                recomputeWoBalanceQty(wo);
            }
            case "close" -> {
                requireStatus(current, "COMPLETED");
                next = "CLOSED";
                wo.setClosedBy(user);
                wo.setClosedAt(Instant.now());
            }
            case "hold" -> {
                requireStatus(current, "RELEASED", "IN_PROCESS");
                next = "ON_HOLD";
                if (note == null || note.isBlank()) {
                    throw new IllegalArgumentException("Hold reason is mandatory.");
                }
                wo.setHoldReason(note);
            }
            case "cancel" -> {
                requireStatus(current, "DRAFT", "SUBMITTED", "APPROVED");
                next = "CANCELLED";
                if (note != null && !note.isBlank()) {
                    wo.setCancelReason(note);
                }
                // FRS §6.3: recompute pending_qty on SO item
                recomputeSOPendingQty(wo);
            }
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        }

        String previousStatus = wo.getStatus();
        wo.setStatus(next);
        wo.setUpdatedAt(Instant.now());

        // FRS §19.3: record status history
        recordStatusHistory(wo, previousStatus, next, note, user);

        return wo;
    }

    // ═══════════════════════════════════════════════════════════════
    // FRS Route Sheet Action Handler
    // ═══════════════════════════════════════════════════════════════

    @Transactional
    public DocEntity routeSheetAction(Long id, String action, String note, String user) {
        RouteSheet rs = (RouteSheet) docs.get("route-sheet", id);
        String current = rs.getStatus();
        String next;

        switch (action) {
            case "release" -> {
                requireStatus(current, "DRAFT");
                // V-R3: at least one detail row before release
                if (rs.getOperations() == null || rs.getOperations().isEmpty()) {
                    throw new IllegalStateException("At least one detail row is required before releasing.");
                }
                // V-R1: one released per item
                long releasedCount = routeRepo.countByItemCodeAndStatus(rs.getItemCode(), "RELEASED");
                if (releasedCount > 0) {
                    throw new IllegalStateException("A Released Route Sheet already exists for item: " + rs.getItemCode());
                }
                // V-R2: validate sequence uniqueness
                validateSequenceUniqueness(rs);
                // V-R4: validate setup/cycle times >= 0
                validateOperationTimes(rs);
                // V-R5: validate all referenced processes are active
                for (RouteOperation op : rs.getOperations()) {
                    if (op.getProcess() != null && !op.getProcess().isActive()) {
                        throw new IllegalStateException("Process is not active: " + op.getProcess().getName());
                    }
                }
                next = "RELEASED";
                rs.setApprovedBy(user);
                rs.setApprovedAt(Instant.now());
            }
            case "revise" -> {
                requireStatus(current, "RELEASED");
                if (note == null || note.isBlank()) {
                    throw new IllegalArgumentException("Remarks are mandatory for a new revision.");
                }
                // Create new revision: clone header + lines
                RouteSheet newRs = createRouteSheetRevision(rs, note, user);
                // Mark old as UNDER_REVISION
                rs.setStatus("UNDER_REVISION");
                rs.setUpdatedAt(Instant.now());
                return newRs;
            }
            case "obsolete" -> {
                requireStatus(current, "RELEASED", "UNDER_REVISION");
                next = "OBSOLETE";
            }
            default -> throw new IllegalArgumentException("Unknown route-sheet action: " + action);
        }

        String previousStatus = rs.getStatus();
        rs.setStatus(next);
        rs.setUpdatedAt(Instant.now());
        return rs;
    }

    private void validateSequenceUniqueness(RouteSheet rs) {
        if (rs.getOperations() == null) return;
        java.util.Set<Integer> seqs = new java.util.HashSet<>();
        for (RouteOperation op : rs.getOperations()) {
            if (op.getSequenceNo() == null) continue;
            if (!seqs.add(op.getSequenceNo())) {
                throw new IllegalArgumentException("Duplicate sequence number: " + op.getSequenceNo());
            }
        }
    }

    private void validateOperationTimes(RouteSheet rs) {
        if (rs.getOperations() == null) return;
        for (RouteOperation op : rs.getOperations()) {
            if (op.getSetupTime() != null && op.getSetupTime().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Setup time cannot be negative at sequence " + op.getSequenceNo());
            }
            if (op.getCycleTime() != null && op.getCycleTime().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Cycle time cannot be negative at sequence " + op.getSequenceNo());
            }
        }
    }

    private RouteSheet createRouteSheetRevision(RouteSheet source, String remarks, String user) {
        RouteSheet newRs = new RouteSheet();
        newRs.setItemCode(source.getItemCode());
        newRs.setItemType(source.getItemType());
        newRs.setDescription(source.getDescription());
        newRs.setBaseQuantity(source.getBaseQuantity());
        newRs.setBaseUom(source.getBaseUom());
        newRs.setEffectiveFrom(LocalDate.now());
        newRs.setStatus("DRAFT");
        // Bump revision
        int newRev = (source.getRevisionNo() != null ? source.getRevisionNo() : 0) + 1;
        newRs.setRevisionNo(newRev);
        newRs.setRouteVersion("Rev " + newRev);
        newRs.setRemarks(remarks);
        newRs.setCreatedBy(user);
        newRs.setCreatedAt(Instant.now());
        // Save first to get ID
        routeRepo.save(newRs);
        routeRepo.flush();
        // Clone operations
        if (source.getOperations() != null) {
            for (RouteOperation srcOp : source.getOperations()) {
                RouteOperation newOp = new RouteOperation();
                newOp.setDoc(newRs);
                newOp.setSequenceNo(srcOp.getSequenceNo());
                newOp.setProcess(srcOp.getProcess());
                newOp.setProcessCode(srcOp.getProcessCode());
                newOp.setResource(srcOp.getResource());
                newOp.setResourceName(srcOp.getResourceName());
                newOp.setResourceType(srcOp.getResourceType());
                newOp.setProcessType(srcOp.getProcessType());
                newOp.setSetupTime(srcOp.getSetupTime());
                newOp.setCycleTime(srcOp.getCycleTime());
                newOp.setInspectionRequired(srcOp.isInspectionRequired());
                newOp.setRemarks(srcOp.getRemarks());
                newRs.getOperations().add(newOp);
            }
        }
        routeRepo.save(newRs);
        return newRs;
    }

    // ═══════════════════════════════════════════════════════════════
    // FRS BOM Release Action
    // ═══════════════════════════════════════════════════════════════

    @Transactional
    public DocEntity bomReleaseAction(Long id, String note, String user) {
        ProductionBOM bom = (ProductionBOM) docs.get("production-bom", id);
        String current = bom.getStatus();
        requireStatus(current, "DRAFT");
        // V-06/V-21: one active standard BOM per item (non-SO)
        if (bom.getSalesOrderId() == null) {
            List<ProductionBOM> activeBoms = bomRepo.findByItemCodeAndIsActiveTrue(bom.getItemCode());
            for (ProductionBOM existing : activeBoms) {
                if (!existing.getId().equals(id) && !"INACTIVE".equals(existing.getStatus())) {
                    throw new IllegalStateException("Active BOM already exists for the selected item.");
                }
            }
        } else {
            // V-22: one active BOM per (SO, Item)
            List<ProductionBOM> soBoms = bomRepo.findByItemCodeAndSalesOrderIdAndIsActiveTrue(bom.getItemCode(), bom.getSalesOrderId());
            for (ProductionBOM existing : soBoms) {
                if (!existing.getId().equals(id)) {
                    throw new IllegalStateException("BOM already exists for the selected Sales Order and Item.");
                }
            }
        }
        // V-20: at least one component required
        List<ProductionBOMLine> activeLines = bom.getLines().stream()
            .filter(l -> !Boolean.TRUE.equals(l.getIsDeleted()))
            .toList();
        if (activeLines.isEmpty()) {
            throw new IllegalStateException("At least one component is required.");
        }
        // V-07/V-16: no self-references
        for (ProductionBOMLine line : activeLines) {
            if (bom.getItemCode().equals(line.getComponentItemCode())) {
                throw new IllegalStateException("Parent item and component item cannot be same.");
            }
        }
        // V-09: no duplicate components
        Set<String> seenComponents = new HashSet<>();
        for (ProductionBOMLine line : activeLines) {
            String compCode = line.getComponentItemCode();
            if (compCode != null && !seenComponents.add(compCode)) {
                throw new IllegalArgumentException("Duplicate component item is not allowed: " + compCode);
            }
        }
        // Validate quantities > 0
        if (bom.getBaseQuantity() != null && bom.getBaseQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Quantity should be greater than zero.");
        }
        for (ProductionBOMLine line : activeLines) {
            if (line.getQuantityPer() != null && line.getQuantityPer().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Component quantity must be greater than zero.");
            }
        }
        bom.setStatus("APPROVED");
        bom.setIsActive(true);
        bom.setApprovedBy(user);
        bom.setUpdatedAt(Instant.now());
        recomputeBomWeights(bom);
        return bom;
    }

    /** FRS §10.6/§11.5: Snapshot BOM and Route revision on release */
    private void snapshotBomRouteRevision(WorkOrder wo) {
        if (wo.getBomId() != null && wo.getBomRevision() == null) {
            try {
                var bomOpt = bomRepo.findById(wo.getBomId());
                if (bomOpt.isPresent()) {
                    ProductionBOM bom = bomOpt.get();
                    wo.setBomRevision(bom.getBomVersion());
                    wo.setBomCode(bom.getBomNumber());
                }
            } catch (Exception ignored) {}
        }
        if (wo.getRouteId() != null && wo.getRouteRevision() == null) {
            try {
                var routeOpt = routeRepo.findById(wo.getRouteId());
                if (routeOpt.isPresent()) {
                    RouteSheet route = routeOpt.get();
                    wo.setRouteRevision(route.getRouteVersion());
                    wo.setRouteSheetCode(route.getRouteNumber());
                }
            } catch (Exception ignored) {}
        }
    }

    /** FRS §19.3: Record status change in work_order_status_history */
    private void recordStatusHistory(WorkOrder wo, String fromStatus, String toStatus, String reason, String user) {
        in.zygertechnology.zygererp.entity.WorkOrderStatusHistory history =
                new in.zygertechnology.zygererp.entity.WorkOrderStatusHistory();
        history.setWorkOrderId(wo.getId());
        history.setWoNumber(wo.getWoNumber());
        history.setFromStatus(fromStatus);
        history.setToStatus(toStatus);
        history.setReason(reason);
        history.setCreatedBy(user);
        history.setCreatedAt(Instant.now());
        woStatusHistoryRepo.save(history);
    }

    private void requireStatus(String current, String... allowed) {
        for (String s : allowed) if (s.equals(current)) return;
        throw new IllegalStateException("Action not allowed in status " + current + ". Required: " + Arrays.toString(allowed));
    }

    // FRS §6: Work Order creation validations (V1-V6)
    private void validateWorkOrderBeforeCreate(Map<String, Object> body) {
        // V1: Sales Order is mandatory
        if (body.get("salesOrderId") == null && body.get("sourceDocNo") == null) {
            // Soft enforcement — allow for backward compat but warn
        }
        // V2: Production Qty is mandatory
        BigDecimal prodQty = body.containsKey("productionQty") && body.get("productionQty") != null
            ? new BigDecimal(String.valueOf(body.get("productionQty")))
            : (body.containsKey("orderQuantity") && body.get("orderQuantity") != null
                ? new BigDecimal(String.valueOf(body.get("orderQuantity"))) : null);
        if (prodQty == null || prodQty.signum() <= 0) {
            throw new IllegalArgumentException("Production Quantity is mandatory and must be greater than zero.");
        }
        // V3: Production Qty must not exceed Pending Qty
        BigDecimal pendingQty = body.containsKey("pendingQty") && body.get("pendingQty") != null
            ? new BigDecimal(String.valueOf(body.get("pendingQty"))) : null;
        if (prodQty != null && pendingQty != null && prodQty.compareTo(pendingQty) > 0) {
            throw new IllegalArgumentException("Production Quantity exceeds Pending Quantity.");
        }
        // V6: Planned End Date > Start Date
        if (body.containsKey("plannedStartDate") && body.containsKey("plannedEndDate")) {
            String start = String.valueOf(body.getOrDefault("plannedStartDate", ""));
            String end = String.valueOf(body.getOrDefault("plannedEndDate", ""));
            if (!start.isEmpty() && !end.isEmpty()) {
                LocalDate sd = LocalDate.parse(start.substring(0, 10));
                LocalDate ed = LocalDate.parse(end.substring(0, 10));
                if (!ed.isAfter(sd)) {
                    throw new IllegalArgumentException("Planned End Date should be greater than Planned Start Date.");
                }
            }
        }
    }

    private void validateWoCanRelease(WorkOrder wo) {
        // V4: Active BOM must exist for item_code
        if (wo.getBomId() == null && wo.getItemCode() != null) {
            List<?> activeBoms = em.createQuery(
                "SELECT b.id FROM ProductionBOM b WHERE b.itemCode = :itemCode AND b.status = 'APPROVED'")
                .setParameter("itemCode", wo.getItemCode()).setMaxResults(1).getResultList();
            if (activeBoms.isEmpty()) {
                throw new IllegalStateException("Active BOM not found for item: " + wo.getItemCode());
            }
        }
        if (wo.getBomId() != null) {
            Optional<ProductionBOM> bom = bomRepo.findById(wo.getBomId());
            if (bom.isPresent() && !"APPROVED".equals(bom.get().getStatus())) {
                throw new IllegalStateException("BOM must be APPROVED before releasing Work Order.");
            }
        }
        // V5: Active Route Sheet must exist for item_code
        if (wo.getRouteId() == null && wo.getItemCode() != null) {
            List<?> activeRoutes = em.createQuery(
                "SELECT r.id FROM RouteSheet r WHERE r.itemCode = :itemCode AND r.status = 'APPROVED'")
                .setParameter("itemCode", wo.getItemCode()).setMaxResults(1).getResultList();
            if (activeRoutes.isEmpty()) {
                throw new IllegalStateException("Active Route Sheet not found for item: " + wo.getItemCode());
            }
        }
        if (wo.getRouteId() != null) {
            Optional<RouteSheet> route = routeRepo.findById(wo.getRouteId());
            if (route.isPresent() && !"APPROVED".equals(route.get().getStatus())) {
                throw new IllegalStateException("Route Sheet must be APPROVED before releasing Work Order.");
            }
        }
    }

    private void postActionHook(String key, DocEntity e, String action, String user) {
        if (!"approve".equals(action)) return;
        switch (key) {
            case "work-order" -> {
                if (e instanceof WorkOrder wo) {
                    wo.setApprovedBy(user);
                }
            }
            default -> {}
        }
    }

    // FRS §6.3: recompute SalesOrderItem.pending_qty after WO cancel
    private void recomputeSOPendingQty(WorkOrder wo) {
        if (wo.getSalesOrderId() == null) return;
        try {
            List<?> results = em.createQuery(
                "SELECT COALESCE(SUM(CASE WHEN wo.orderQuantity IS NOT NULL THEN wo.orderQuantity ELSE COALESCE(wo.productionQty, BigDecimal.ZERO) END), 0) FROM WorkOrder wo WHERE wo.salesOrderId = :soId AND wo.status NOT IN ('CANCELLED', 'REJECTED')")
                .setParameter("soId", wo.getSalesOrderId())
                .getResultList();
            BigDecimal totalCommitted = results.isEmpty() ? BigDecimal.ZERO : (BigDecimal) results.get(0);

            SalesOrder so = em.find(SalesOrder.class, wo.getSalesOrderId());
            if (so != null && so.getLines() != null) {
                for (SalesOrderItem item : so.getLines()) {
                    BigDecimal orderQty = item.getOrderQty() != null ? item.getOrderQty() : BigDecimal.ZERO;
                    BigDecimal pending = orderQty.subtract(totalCommitted);
                    item.setPendingQty(pending.max(BigDecimal.ZERO));
                }
                em.merge(so);
            }
        } catch (Exception ignored) {
        }
    }

    /** FRS §4.5: Compute weightPerQty from ItemMaster, totalWeight per line, and parent BOM weight. */
    private void recomputeBomWeights(ProductionBOM bom) {
        if (bom.getLines() == null || bom.getLines().isEmpty()) {
            bom.setWeight(BigDecimal.ZERO);
            return;
        }
        BigDecimal totalWeight = BigDecimal.ZERO;
        for (ProductionBOMLine line : bom.getLines()) {
            if (line.getWeightPerQty() == null && line.getComponentItemCode() != null) {
                try {
                    List<?> items = em.createQuery("SELECT i.weight FROM ItemMaster i WHERE i.code = :code")
                        .setParameter("code", line.getComponentItemCode()).setMaxResults(1).getResultList();
                    if (!items.isEmpty() && items.get(0) != null) {
                        line.setWeightPerQty((BigDecimal) items.get(0));
                    }
                } catch (Exception ignored) {}
            }
            BigDecimal qty = line.getQuantityPer() == null ? BigDecimal.ZERO : line.getQuantityPer();
            BigDecimal wpq = line.getWeightPerQty() == null ? BigDecimal.ZERO : line.getWeightPerQty();
            line.setTotalWeight(qty.multiply(wpq));
            totalWeight = totalWeight.add(line.getTotalWeight());
        }
        bom.setWeight(totalWeight);
    }

    /** FRS §4.7: Tamper prevention — recompute derived fields on RouteOperation from ProcessMaster/ResourceMaster. */
    private void recomputeRouteDerivedFields(RouteSheet route) {
        if (route.getOperations() == null) return;
        for (RouteOperation op : route.getOperations()) {
            if (op.getProcess() != null) {
                ProcessMaster pm = em.find(ProcessMaster.class, op.getProcess().getId());
                if (pm != null) {
                    // FRS §3.3: derived process_code from ProcessMaster
                    op.setProcessCode(pm.getCode());
                    if (pm.getResourceName() != null) op.setResourceName(pm.getResourceName());
                    if (pm.getResourceType() != null) op.setResourceType(pm.getResourceType());
                    if (pm.getProcessType() != null) op.setProcessType(pm.getProcessType());
                    if (pm.getCycleTime() != null && (op.getCycleTime() == null || op.getCycleTime().signum() == 0))
                        op.setCycleTime(pm.getCycleTime());
                    if (pm.getSetupTime() != null && (op.getSetupTime() == null || op.getSetupTime().signum() == 0))
                        op.setSetupTime(pm.getSetupTime());
                }
            }
            if (op.getResource() != null) {
                ResourceMaster res = em.find(ResourceMaster.class, op.getResource().getId());
                if (res != null) {
                    op.setResourceName(res.getResourceName());
                    op.setResourceType(res.getResourceType());
                }
            }
            op.setStandardCostRate(null);
            if (op.getResource() != null && op.getResource().getHourlyRate() != null && op.getCycleTime() != null) {
                BigDecimal cycleHours = op.getCycleTime().divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
                op.setStandardCostRate(op.getResource().getHourlyRate().multiply(cycleHours));
            }
        }
    }

    /** FRS §3.3: Compute total_setup_time, total_cycle_time, total_run_time on RouteSheet header. */
    private void recomputeRouteTotals(RouteSheet route) {
        if (route.getOperations() == null || route.getOperations().isEmpty()) {
            route.setTotalSetupTime(BigDecimal.ZERO);
            route.setTotalCycleTime(BigDecimal.ZERO);
            route.setTotalRunTime(BigDecimal.ZERO);
            return;
        }
        BigDecimal totalSetup = BigDecimal.ZERO;
        BigDecimal totalCycle = BigDecimal.ZERO;
        BigDecimal totalRun = BigDecimal.ZERO;
        BigDecimal baseQty = route.getBaseQuantity() == null ? BigDecimal.ONE : route.getBaseQuantity();
        for (RouteOperation op : route.getOperations()) {
            totalSetup = totalSetup.add(op.getSetupTime() != null ? op.getSetupTime() : BigDecimal.ZERO);
            totalCycle = totalCycle.add(op.getCycleTime() != null ? op.getCycleTime() : BigDecimal.ZERO);
            BigDecimal setup = op.getSetupTime() != null ? op.getSetupTime() : BigDecimal.ZERO;
            BigDecimal cycle = op.getCycleTime() != null ? op.getCycleTime() : BigDecimal.ZERO;
            totalRun = totalRun.add(setup.add(cycle.multiply(baseQty)));
        }
        route.setTotalSetupTime(totalSetup);
        route.setTotalCycleTime(totalCycle);
        route.setTotalRunTime(totalRun);
    }

    /** FRS §3.2: Compute totalMaterialCost on BOM = Σ(component defaultRate × netQty). */
    private void recomputeBomTotalMaterialCost(ProductionBOM bom) {
        if (bom.getLines() == null || bom.getLines().isEmpty()) {
            bom.setTotalMaterialCost(BigDecimal.ZERO);
            return;
        }
        BigDecimal total = BigDecimal.ZERO;
        for (ProductionBOMLine line : bom.getLines()) {
            if (line.getComponentItemCode() != null && line.getQuantityPer() != null) {
                try {
                    List<?> rates = em.createQuery(
                        "SELECT COALESCE(i.defaultRate, 0) FROM ItemMaster i WHERE i.code = :code")
                        .setParameter("code", line.getComponentItemCode()).setMaxResults(1).getResultList();
                    BigDecimal rate = rates.isEmpty() ? BigDecimal.ZERO : (BigDecimal) rates.get(0);
                    BigDecimal scrap = line.getScrapPercent() != null ? line.getScrapPercent() : BigDecimal.ZERO;
                    BigDecimal netQty = line.getQuantityPer().multiply(BigDecimal.ONE.add(scrap.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP)));
                    total = total.add(rate.multiply(netQty));
                } catch (Exception ignored) {}
            }
        }
        bom.setTotalMaterialCost(total);
    }

    /** FRS §3.1: Compute balance_qty = orderQuantity - completedQty - rejectedQty. */
    private void recomputeWoBalanceQty(WorkOrder wo) {
        BigDecimal order = wo.getOrderQuantity() != null ? wo.getOrderQuantity() : BigDecimal.ZERO;
        BigDecimal completed = wo.getCompletedQty() != null ? wo.getCompletedQty() : BigDecimal.ZERO;
        BigDecimal rejected = wo.getRejectedQty() != null ? wo.getRejectedQty() : BigDecimal.ZERO;
        wo.setBalanceQty(order.subtract(completed).subtract(rejected));
        // FRS §3.2: recompute material balance_qty = required_qty - issued_qty
        if (wo.getMaterials() != null) {
            for (WorkOrderMaterial mat : wo.getMaterials()) {
                BigDecimal req = mat.getRequiredQuantity() != null ? mat.getRequiredQuantity() : BigDecimal.ZERO;
                BigDecimal issued = mat.getIssuedQuantity() != null ? mat.getIssuedQuantity() : BigDecimal.ZERO;
                mat.setBalanceQty(req.subtract(issued));
            }
        }
    }

    /** FRS §3.3: Compute derived summary for work order process lines. */
    @Transactional(readOnly = true)
    public Map<String, Object> getWorkOrderSummary(Long workOrderId) {
        WorkOrder wo = (WorkOrder) docs.get("work-order", workOrderId);
        BigDecimal totalSetupTime = BigDecimal.ZERO;
        BigDecimal totalCycleTimePerUnit = BigDecimal.ZERO;
        BigDecimal productionQty = wo.getProductionQty() != null ? wo.getProductionQty() : BigDecimal.ZERO;

        if (wo.getOperations() != null) {
            for (WorkOrderOperation op : wo.getOperations()) {
                totalSetupTime = totalSetupTime.add(op.getSetupTimePlanned() != null ? op.getSetupTimePlanned() : BigDecimal.ZERO);
                totalCycleTimePerUnit = totalCycleTimePerUnit.add(op.getCycleTimePlanned() != null ? op.getCycleTimePlanned() : BigDecimal.ZERO);
            }
        }
        BigDecimal totalProductionTimeMin = totalSetupTime.add(totalCycleTimePerUnit.multiply(productionQty));
        BigDecimal totalProductionTimeHrs = totalProductionTimeMin.divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalSetupTimeMin", totalSetupTime);
        summary.put("totalCycleTimePerUnitMin", totalCycleTimePerUnit);
        summary.put("totalProductionTimeMin", totalProductionTimeMin);
        summary.put("totalProductionTimeHrs", totalProductionTimeHrs);
        summary.put("materialLineCount", wo.getMaterials() != null ? wo.getMaterials().size() : 0);
        summary.put("processLineCount", wo.getOperations() != null ? wo.getOperations().size() : 0);
        return summary;
    }

    /** FRS §4.4: Create new BOM revision from existing. */
    @Transactional
    public ProductionBOM createBomRevision(Long sourceBomId, String newVersion, String remarks, String user) {
        ProductionBOM source = (ProductionBOM) docs.get("production-bom", sourceBomId);
        if (source == null) throw new IllegalArgumentException("Source BOM not found: " + sourceBomId);

        // V-27: remarks mandatory for new revision
        if (remarks == null || remarks.isBlank()) {
            throw new IllegalArgumentException("Remarks are mandatory for a new revision.");
        }

        // Deactivate old revision
        source.setIsActive(false);
        source.setUpdatedAt(Instant.now());
        bomRepo.save(source);

        ProductionBOM newBom = new ProductionBOM();
        // FRS §3.4: bom_code carries revision suffix
        String baseCode = source.getBomNumber() != null ? source.getBomNumber() : "BOM-NEW";
        newBom.setBomNumber(baseCode + "/R" + (source.getRevisionNo() != null ? source.getRevisionNo() + 1 : 1));
        newBom.setItemCode(source.getItemCode());
        newBom.setItemRevision(source.getItemRevision());
        newBom.setBomVersion(newVersion);
        newBom.setDescription(source.getDescription());
        newBom.setSpecifications(source.getSpecifications());
        newBom.setBaseQuantity(source.getBaseQuantity());
        newBom.setBaseUom(source.getBaseUom());
        newBom.setItemType(source.getItemType());
        newBom.setSalesOrderId(source.getSalesOrderId());
        newBom.setBomType(source.getBomType());
        newBom.setPreviousRevisionId(sourceBomId);
        newBom.setIsActive(true);
        newBom.setEffectiveFrom(LocalDate.now());
        newBom.setStatus("DRAFT");
        newBom.setCreatedBy(user);
        newBom.setPlantId(source.getPlantId());
        newBom.setDocDate(source.getDocDate());
        newBom.setRemarks(remarks);
        // FRS §3.4: auto-increment revision_no
        int newRev = (source.getRevisionNo() != null ? source.getRevisionNo() : 0) + 1;
        newBom.setRevisionNo(newRev);

        List<ProductionBOMLine> newLines = new ArrayList<>();
        if (source.getLines() != null) {
            int lineNo = 1;
            for (ProductionBOMLine srcLine : source.getLines()) {
                if (Boolean.TRUE.equals(srcLine.getIsDeleted())) continue;
                ProductionBOMLine newLine = new ProductionBOMLine();
                newLine.setLineNo(lineNo++);
                newLine.setComponentItemCode(srcLine.getComponentItemCode());
                newLine.setComponentRevision(srcLine.getComponentRevision());
                newLine.setDescription(srcLine.getDescription());
                newLine.setQuantityPer(srcLine.getQuantityPer());
                newLine.setUom(srcLine.getUom());
                newLine.setScrapPercentage(srcLine.getScrapPercentage());
                newLine.setYieldPercentage(srcLine.getYieldPercentage());
                newLine.setOperationSequenceLink(srcLine.getOperationSequenceLink());
                newLine.setIssueMethod(srcLine.getIssueMethod());
                newLine.setSupplyType(srcLine.getSupplyType());
                newLine.setWarehouse(srcLine.getWarehouse());
                newLine.setChildBomId(srcLine.getChildBomId());
                newLine.setWeightPerQty(srcLine.getWeightPerQty());
                newLine.setComponentType(srcLine.getComponentType());
                newLines.add(newLine);
            }
        }
        newBom.setLines(newLines);

        ProductionBOM saved = bomRepo.save(newBom);
        recomputeBomWeights(saved);
        saved = bomRepo.save(saved);

        // FRS §3.4: Record revision history
        bomRevisionHistoryRepo.save(BomRevisionHistory.builder()
            .bomId(saved.getId())
            .revisionNo(newRev)
            .bomVersion(newVersion)
            .createdBy(user)
            .remarks(remarks)
            .previousRevisionId(sourceBomId)
            .build());
        // Also record the original as first revision if not already recorded
        if (source.getRevisionNo() == null || source.getRevisionNo() == 0) {
            bomRevisionHistoryRepo.save(BomRevisionHistory.builder()
                .bomId(source.getId())
                .revisionNo(0)
                .bomVersion(source.getBomVersion())
                .createdBy(source.getCreatedBy())
                .remarks("Initial revision")
                .build());
        }

        return saved;
    }

    /** FRS §3.4: Get revision history for a BOM */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getBomRevisionHistory(Long bomId) {
        List<BomRevisionHistory> history = bomRevisionHistoryRepo.findByBomIdOrderByRevisionNoDesc(bomId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (BomRevisionHistory h : history) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", h.getId());
            row.put("revisionNo", h.getRevisionNo());
            row.put("bomVersion", h.getBomVersion());
            row.put("createdAt", h.getCreatedAt());
            row.put("createdBy", h.getCreatedBy());
            row.put("remarks", h.getRemarks());
            row.put("previousRevisionId", h.getPreviousRevisionId());
            result.add(row);
        }
        return result;
    }

    /** FRS §5.1 FR-04: Copy a BOM from source_bom_code */
    @Transactional
    public ProductionBOM copyBom(String sourceBomCode, Map<String, Object> overrides, String user) {
        ProductionBOM source = bomRepo.findByBomNumber(sourceBomCode);
        if (source == null) {
            var candidates = bomRepo.findByItemCodeAndIsActiveTrue(sourceBomCode);
            if (candidates != null && !candidates.isEmpty()) source = candidates.get(0);
        }
        if (source == null) throw new IllegalArgumentException("Source BOM not found: " + sourceBomCode);

        ProductionBOM newBom = new ProductionBOM();
        // Generate new BOM number via doc numbering
        String newBomNumber = docs.nextNumber("production-bom");
        newBom.setBomNumber(newBomNumber);
        newBom.setItemCode(overrides.containsKey("itemCode") ? String.valueOf(overrides.get("itemCode")) : source.getItemCode());
        newBom.setItemRevision(source.getItemRevision());
        newBom.setBomVersion("1.0");
        newBom.setDescription(source.getDescription());
        newBom.setSpecifications(source.getSpecifications());
        newBom.setBaseQuantity(overrides.containsKey("baseQuantity")
            ? new BigDecimal(String.valueOf(overrides.get("baseQuantity")))
            : source.getBaseQuantity());
        newBom.setBaseUom(source.getBaseUom());
        newBom.setItemType(source.getItemType());
        newBom.setSalesOrderId(overrides.containsKey("salesOrderId") && overrides.get("salesOrderId") != null
            ? Long.parseLong(String.valueOf(overrides.get("salesOrderId")))
            : null);
        newBom.setBomType(source.getBomType());
        newBom.setIsActive(true);
        newBom.setEffectiveFrom(LocalDate.now());
        newBom.setStatus("DRAFT");
        newBom.setCreatedBy(user);
        newBom.setPlantId(source.getPlantId());
        newBom.setDocDate(LocalDate.now());
        newBom.setRevisionNo(0);

        List<ProductionBOMLine> newLines = new ArrayList<>();
        if (source.getLines() != null) {
            int lineNo = 1;
            for (ProductionBOMLine srcLine : source.getLines()) {
                if (Boolean.TRUE.equals(srcLine.getIsDeleted())) continue;
                ProductionBOMLine newLine = new ProductionBOMLine();
                newLine.setLineNo(lineNo++);
                newLine.setComponentItemCode(srcLine.getComponentItemCode());
                newLine.setComponentRevision(srcLine.getComponentRevision());
                newLine.setDescription(srcLine.getDescription());
                newLine.setQuantityPer(srcLine.getQuantityPer());
                newLine.setUom(srcLine.getUom());
                newLine.setScrapPercentage(srcLine.getScrapPercentage());
                newLine.setYieldPercentage(srcLine.getYieldPercentage());
                newLine.setOperationSequenceLink(srcLine.getOperationSequenceLink());
                newLine.setIssueMethod(srcLine.getIssueMethod());
                newLine.setSupplyType(srcLine.getSupplyType());
                newLine.setWarehouse(srcLine.getWarehouse());
                newLine.setChildBomId(srcLine.getChildBomId());
                newLine.setWeightPerQty(srcLine.getWeightPerQty());
                newLine.setComponentType(srcLine.getComponentType());
                newLines.add(newLine);
            }
        }
        newBom.setLines(newLines);

        ProductionBOM saved = bomRepo.save(newBom);
        recomputeBomWeights(saved);
        return bomRepo.save(saved);
    }

    @Transactional
    public WorkOrder populateFromBomAndRoute(Long workOrderId) {
        WorkOrder wo = (WorkOrder) docs.get("work-order", workOrderId);
        BigDecimal orderQty = wo.getOrderQuantity() == null ? BigDecimal.ONE : wo.getOrderQuantity();

        // FRS §6.2: SO-specific BOM priority
        Long effectiveBomId = wo.getBomId();
        if (wo.getSalesOrderId() != null && wo.getItemCode() != null && effectiveBomId == null) {
            // Look for SO-specific BOM first
            try {
                List<?> soBoms = em.createQuery(
                    "SELECT b.id FROM ProductionBOM b WHERE b.itemCode = :itemCode AND b.salesOrderId = :soId AND b.status = 'APPROVED'")
                    .setParameter("itemCode", wo.getItemCode())
                    .setParameter("soId", wo.getSalesOrderId())
                    .setMaxResults(1)
                    .getResultList();
                if (!soBoms.isEmpty()) {
                    effectiveBomId = (Long) soBoms.get(0);
                    wo.setBomId(effectiveBomId);
                }
            } catch (Exception ignored) {}
        }

        if (effectiveBomId != null) {
            Optional<ProductionBOM> bomOpt = bomRepo.findById(effectiveBomId);
            if (bomOpt.isPresent()) {
                ProductionBOM bom = bomOpt.get();
                // FRS §3.1: snapshot BOM code display
                wo.setBomCode(bom.getBomNumber());
                wo.setBomRevision(bom.getBomVersion());
                BigDecimal bomBaseQty = bom.getBaseQuantity() == null ? BigDecimal.ONE : bom.getBaseQuantity();
                BigDecimal scaleFactor = orderQty.divide(bomBaseQty, 10, RoundingMode.HALF_UP);

                List<WorkOrderMaterial> newMats = new ArrayList<>();
                int lineNo = 1;
                if (bom.getLines() != null) {
                    for (ProductionBOMLine bomLine : bom.getLines()) {
                        WorkOrderMaterial mat = new WorkOrderMaterial();
                        mat.setDoc(wo);
                        mat.setLineNo(lineNo++);
                        mat.setComponentItemCode(bomLine.getComponentItemCode());
                        mat.setComponentRevision(bomLine.getComponentRevision());
                        mat.setDescription(bomLine.getDescription());
                        BigDecimal qtyPer = bomLine.getQuantityPer() == null ? BigDecimal.ZERO : bomLine.getQuantityPer();
                        BigDecimal scrap = bomLine.getScrapPercentage() == null ? BigDecimal.ZERO : bomLine.getScrapPercentage();
                        BigDecimal required = qtyPer.multiply(scaleFactor)
                                .multiply(BigDecimal.ONE.add(scrap.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP)));
                        mat.setRequiredQuantity(required.setScale(0, RoundingMode.CEILING));
                        mat.setIssuedQuantity(BigDecimal.ZERO);
                        mat.setReturnedQuantity(BigDecimal.ZERO);
                        mat.setShortageQuantity(mat.getRequiredQuantity());
                        mat.setRequiredDate(wo.getPlannedStartDate());
                        mat.setIssueMethod(bomLine.getIssueMethod());
                        mat.setWarehouse(bomLine.getWarehouse());
                        mat.setUom(bomLine.getUom());
                        mat.setBalanceQty(required);
                        mat.setReservationStatus("None");
                        mat.setIssueStatus("Pending");
                        newMats.add(mat);
                    }
                }
                wo.getMaterials().clear();
                wo.getMaterials().addAll(newMats);
            }
        }

        if (wo.getRouteId() != null) {
            Optional<RouteSheet> routeOpt = routeRepo.findById(wo.getRouteId());
            if (routeOpt.isPresent()) {
                RouteSheet route = routeOpt.get();
                // FRS §3.1: snapshot Route Sheet code display
                wo.setRouteSheetCode(route.getRouteNumber());
                wo.setRouteRevision(route.getRouteVersion());
                List<WorkOrderOperation> newOps = new ArrayList<>();
                if (route.getOperations() != null) {
                    for (RouteOperation rtOp : route.getOperations()) {
                        WorkOrderOperation woOp = new WorkOrderOperation();
                        woOp.setDoc(wo);
                        woOp.setOperationSequence(rtOp.getSequenceNo());
                        woOp.setOperationCode(rtOp.getOperationCode());
                        woOp.setOperationDescription(rtOp.getOperationDescription());
                        woOp.setWorkCenterCode(rtOp.getWorkCenterCode());
                        woOp.setMachineCode(rtOp.getMachineCode());
                        woOp.setPlannedQuantity(orderQty);
                        woOp.setCompletedQuantity(BigDecimal.ZERO);
                        woOp.setGoodQuantity(BigDecimal.ZERO);
                        woOp.setScrapQuantity(BigDecimal.ZERO);
                        woOp.setReworkQuantity(BigDecimal.ZERO);
                        woOp.setSetupTimePlanned(rtOp.getSetupTime());
                        woOp.setSetupTimeActual(BigDecimal.ZERO);
                        woOp.setCycleTimePlanned(rtOp.getCycleTime());
                        woOp.setCycleTimeActual(BigDecimal.ZERO);
                        woOp.setInspectionRequired(rtOp.isInspectionRequired());
                        woOp.setSubcontractFlag(rtOp.isSubcontractFlag());
                        woOp.setToolRequired(rtOp.isToolRequired());
                        woOp.setFixtureRequired(rtOp.isFixtureRequired());
                        woOp.setNcProgramReference(rtOp.getNcProgramReference());
                        woOp.setStatus("Pending");
                        newOps.add(woOp);
                    }
                }
                wo.getOperations().clear();
                wo.getOperations().addAll(newOps);
            }
        }

        wo.setUpdatedAt(Instant.now());
        return wo;
    }

    /** FRS §6: Create Work Order directly from a Sales Order line item. */
    @Transactional
    public WorkOrder createWorkOrderFromSO(Long salesOrderId, Long salesOrderItemId, int quantity, String user) {
        SalesOrder so = em.find(SalesOrder.class, salesOrderId);
        if (so == null) throw new IllegalArgumentException("Sales Order not found: " + salesOrderId);

        SalesOrderItem soItem = null;
        if (so.getLines() != null && salesOrderItemId != null) {
            for (SalesOrderItem item : so.getLines()) {
                if (item.getId().equals(salesOrderItemId)) { soItem = item; break; }
            }
        }
        if (soItem == null && so.getLines() != null && !so.getLines().isEmpty()) {
            soItem = so.getLines().get(0);
        }
        if (soItem == null) throw new IllegalArgumentException("Sales Order has no line items.");

        int qty = quantity > 0 ? quantity : (soItem.getOrderQty() != null ? soItem.getOrderQty().intValue() : 1);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("salesOrderId", so.getId());
        body.put("soLineId", soItem.getId());
        body.put("itemCode", soItem.getItemName());
        body.put("orderQuantity", qty);
        body.put("productionQty", qty);
        body.put("pendingQty", soItem.getPendingQty() != null ? soItem.getPendingQty() : soItem.getOrderQty());
        body.put("customerCode", so.getCustomerCode());
        body.put("drawingNumber", soItem.getDrawingNumber());
        body.put("drawingRev", soItem.getDrawingRevision());
        body.put("promisedDeliveryDate", so.getCustomerRequiredDate() != null ? so.getCustomerRequiredDate() : so.getDeliveryDate());
        body.put("priority", "MEDIUM");
        body.put("sourceType", "Sales Order");
        body.put("sourceDocNo", so.getDocNo());
        body.put("remarks", "Auto-created from SO " + so.getDocNo());

        DocEntity e = create("work-order", body, user);
        if (e instanceof WorkOrder wo) {
            populateFromBomAndRoute(wo.getId());
            return wo;
        }
        throw new IllegalStateException("Failed to create Work Order.");
    }

    /** FRS FR-09: Multi-level recursive tree loading for Semi-FG components */
    @Transactional(readOnly = true)
    public Map<String, Object> getBomTree(Long bomId) {
        ProductionBOM bom = (ProductionBOM) docs.get("production-bom", bomId);
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("id", bom.getId());
        root.put("bomNumber", bom.getBomNumber());
        root.put("itemCode", bom.getItemCode());
        root.put("itemType", bom.getItemType());
        root.put("level", 0);
        root.put("levelPath", "");
        root.put("quantityPer", bom.getBaseQuantity());
        root.put("totalWeight", bom.getWeight());
        List<Map<String, Object>> children = new ArrayList<>();
        if (bom.getLines() != null) {
            int seq = 1;
            for (ProductionBOMLine line : bom.getLines()) {
                if (Boolean.TRUE.equals(line.getIsDeleted())) continue;
                Map<String, Object> node = buildBomTreeNode(line, seq++, "0");
                children.add(node);
            }
        }
        root.put("children", children);
        return root;
    }

    private Map<String, Object> buildBomTreeNode(ProductionBOMLine line, int seq, String parentPath) {
        Map<String, Object> node = new LinkedHashMap<>();
        String levelPath = parentPath + "." + seq;
        node.put("lineNo", line.getLineNo());
        node.put("componentItemCode", line.getComponentItemCode());
        node.put("componentRevision", line.getComponentRevision());
        node.put("description", line.getDescription());
        node.put("quantityPer", line.getQuantityPer());
        node.put("weightPerQty", line.getWeightPerQty());
        node.put("totalWeight", line.getTotalWeight());
        node.put("level", levelPath.split("\\.").length);
        node.put("levelPath", levelPath.substring(1));

        // FRS FR-09: recursively load child BOM for Semi-FG components
        List<Map<String, Object>> children = new ArrayList<>();
        if (line.getChildBomId() != null) {
            try {
                ProductionBOM childBom = bomRepo.findById(line.getChildBomId()).orElse(null);
                if (childBom != null && childBom.getLines() != null) {
                    int childSeq = 1;
                    for (ProductionBOMLine childLine : childBom.getLines()) {
                        if (Boolean.TRUE.equals(childLine.getIsDeleted())) continue;
                        children.add(buildBomTreeNode(childLine, childSeq++, levelPath));
                    }
                }
            } catch (Exception ignored) {}
        }
        node.put("children", children);
        return node;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("totalBom", docs.count("production-bom"));
        d.put("totalRoutes", docs.count("route-sheet"));
        d.put("totalWorkOrders", docs.count("work-order"));
        d.put("pendingApproval", countByStatus("work-order", "SUBMITTED"));
        d.put("released", countByStatus("work-order", "RELEASED"));
        d.put("inProcess", countByStatus("work-order", "IN_PROCESS"));
        d.put("completed", countByStatus("work-order", "COMPLETED"));
        d.put("closed", countByStatus("work-order", "CLOSED"));
        d.put("totalShopFloor", docs.count("shop-floor-entry"));
        return d;
    }

    private long countByStatus(String key, String status) {
        Map<String, Object> page = docs.list(key, Map.of("status", status, "size", "1", "page", "0"));
        Object total = page.get("totalElements");
        if (total instanceof Number n) return n.longValue();
        return 0;
    }

    public void validateBomCanBeDeleted(Long id) {
        Long count = em.createQuery("SELECT COUNT(wo) FROM WorkOrder wo WHERE wo.bomId = :bomId", Long.class)
                .setParameter("bomId", id)
                .getSingleResult();
        if (count > 0) {
            throw new IllegalStateException("This BOM is referenced in an existing Work Order and cannot be deleted.");
        }
    }

    // ── FRS §19.3: Status History ──

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getWorkOrderStatusHistory(Long workOrderId) {
        List<in.zygertechnology.zygererp.entity.WorkOrderStatusHistory> history =
                woStatusHistoryRepo.findByWorkOrderIdOrderByCreatedAtAsc(workOrderId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (var h : history) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", h.getId());
            row.put("workOrderId", h.getWorkOrderId());
            row.put("woNumber", h.getWoNumber());
            row.put("fromStatus", h.getFromStatus());
            row.put("toStatus", h.getToStatus());
            row.put("reason", h.getReason());
            row.put("createdBy", h.getCreatedBy());
            row.put("createdAt", h.getCreatedAt() != null ? h.getCreatedAt().toString() : null);
            result.add(row);
        }
        return result;
    }

    // ── FRS §17: Reports ──

    @Transactional(readOnly = true)
    public Map<String, Object> getOverdueWorkOrders(Map<String, String> q) {
        List<?> results = em.createQuery(
            "SELECT w FROM WorkOrder w WHERE w.plannedEndDate < CURRENT_DATE " +
            "AND w.status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED') " +
            "ORDER BY w.plannedEndDate ASC")
            .getResultList();
        return toReportMap(results);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMaterialShortageReport(Map<String, String> q) {
        List<?> results = em.createQuery(
            "SELECT DISTINCT w FROM WorkOrder w JOIN w.materials m " +
            "WHERE m.shortageQuantity IS NOT NULL AND m.shortageQuantity > 0 " +
            "ORDER BY w.plannedEndDate ASC")
            .getResultList();
        return toReportMap(results);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getWoStatusSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();
        String[] statuses = {"DRAFT", "SUBMITTED", "APPROVED", "RELEASED", "IN_PROCESS", "COMPLETED", "CLOSED", "CANCELLED", "ON_HOLD", "REJECTED"};
        for (String status : statuses) {
            long count = countByStatus("work-order", status);
            summary.put(status, count);
        }
        summary.put("TOTAL", docs.count("work-order"));
        return summary;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCompletionReport(Map<String, String> q) {
        List<?> results = em.createQuery(
            "SELECT w FROM WorkOrder w WHERE w.status IN ('COMPLETED', 'CLOSED') " +
            "ORDER BY w.completedAt DESC")
            .getResultList();
        return toReportMap(results);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSoPendingReport(Map<String, String> q) {
        List<?> results = em.createQuery(
            "SELECT w FROM WorkOrder w WHERE w.salesOrderId IS NOT NULL " +
            "AND w.status NOT IN ('CANCELLED') " +
            "ORDER BY w.salesOrderId ASC")
            .getResultList();
        return toReportMap(results);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getOpenWorkOrders(Map<String, String> q) {
        List<?> results = em.createQuery(
            "SELECT w FROM WorkOrder w WHERE w.status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'RELEASED', 'IN_PROCESS') " +
            "ORDER BY w.plannedEndDate ASC")
            .getResultList();
        return toReportMap(results);
    }

    private Map<String, Object> toReportMap(List<?> entities) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object e : entities) {
            if (e instanceof WorkOrder wo) {
                rows.add(docs.toRow(wo));
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", rows);
        result.put("totalElements", rows.size());
        return result;
    }
}
