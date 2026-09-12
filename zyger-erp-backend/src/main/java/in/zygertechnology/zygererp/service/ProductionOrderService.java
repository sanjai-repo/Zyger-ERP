package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.config.ApiEnvelope;
import in.zygertechnology.zygererp.entity.WorkOrder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * P2 production-domain adapter for the canonical Production Order.
 *
 * <p>Business/domain terminology: <b>Production Order</b>.
 * Persistence/compatibility terminology: <b>Work Order</b> ({@code work_order} / {@code @DocKey("work-order")}).
 *
 * <p>This is a <b>thin, single-source-of-truth adapter only</b>: it delegates every operation to the existing
 * canonical owner ( {@link PlanningService} + {@link DocumentFacade} ) and the {@code work-order} persistence model.
 * It introduces <b>no</b> duplicate persistence model, <b>no</b> duplicate business logic, and <b>no</b>
 * {@code prod_order} table (ADR-PROD-002; DOC 12 override). Existing Work Order APIs remain fully compatible (C2/D2/D3).
 *
 * <p>The only added behaviour is the {@code orderType} discriminator ( {@code work_order.order_type }, V3) which is
 * passed through on create; all workflow/numbering behaviour is orchestrated by {@link PlanningService} unchanged.
 */
@Service
@RequiredArgsConstructor
public class ProductionOrderService {

    private static final String KEY = "work-order";

    private final PlanningService planning;
    private final DocumentFacade docs;

    private static String user(java.security.Principal p) { return p != null ? p.getName() : "system"; }

    /** FRS §5.1 list of Production Orders (canonical Work Orders). */
    @Transactional(readOnly = true)
    public ApiEnvelope<?> list(Map<String, String> q) {
        Map<String, Object> page = docs.list(KEY, q);
        int pg = q.containsKey("page") ? Integer.parseInt(q.get("page")) : 0;
        int sz = q.containsKey("size") ? Integer.parseInt(q.get("size")) : 8;
        long total = page.get("totalElements") instanceof Number n ? n.longValue() : 0;
        int totalPages = page.get("totalPages") instanceof Number n2 ? n2.intValue() : 1;
        return ApiEnvelope.paged(page.get("content"), pg, sz, total, totalPages);
    }

    /** Create a Production Order; reuses the canonical work_order create path. */
    @Transactional
    public Map<String, Object> create(Map<String, Object> body, java.security.Principal p) {
        applyOrderType(body);
        return docs.toRow(planning.create(KEY, body, user(p)));
    }

    /** Fetch a single Production Order by its canonical work_order id. */
    @Transactional(readOnly = true)
    public Map<String, Object> get(Long id) {
        return docs.getRow(KEY, id);
    }

    /** Update a Production Order; reuses the canonical work_order update path. */
    @Transactional
    public Map<String, Object> update(Long id, Map<String, Object> body, java.security.Principal p) {
        applyOrderType(body);
        return docs.toRow(planning.update(KEY, id, body, user(p)));
    }

    /** Delete a Production Order (soft delete via canonical path). */
    @Transactional
    public void delete(Long id, java.security.Principal p) {
        docs.remove(KEY, id, user(p));
    }

    /** Apply a workflow action (e.g. SUBMIT/APPROVE/RELEASE/START/COMPLETE/CLOSE) via the canonical owner. */
    @Transactional
    public Map<String, Object> action(Long id, String action, Map<String, String> body, java.security.Principal p) {
        return docs.toRow(planning.action(KEY, id, action,
                body == null ? "" : body.getOrDefault("note", ""), user(p)));
    }

    /** Populate BOM + Route into the Production Order (canonical Planning behaviour). */
    @Transactional
    public Map<String, Object> populate(Long id) {
        WorkOrder wo = planning.populateFromBomAndRoute(id);
        return docs.toRow(wo);
    }

    /** Create a Production Order directly from a Sales Order (canonical Planning behaviour). */
    @Transactional
    public Map<String, Object> createFromSo(Map<String, Object> body, java.security.Principal p) {
        Long soId = Long.parseLong(String.valueOf(body.get("salesOrderId")));
        Long soItemId = body.get("salesOrderItemId") != null
                ? Long.parseLong(String.valueOf(body.get("salesOrderItemId"))) : null;
        int qty = body.get("quantity") != null ? Integer.parseInt(String.valueOf(body.get("quantity"))) : 0;
        WorkOrder wo = planning.createWorkOrderFromSO(soId, soItemId, qty, user(p));
        return docs.toRow(wo);
    }

    /** Work Order status history for a Production Order (canonical Planning behaviour). */
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> statusHistory(Long id) {
        return planning.getWorkOrderStatusHistory(id);
    }

    /** Summary for a Production Order (canonical Planning behaviour). */
    @Transactional(readOnly = true)
    public Map<String, Object> summary(Long id) {
        return planning.getWorkOrderSummary(id);
    }

    /** Active Sales Orders for the PO picker (canonical Planning behaviour). */
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> soList() {
        return planning.getActiveSOsForWO();
    }

    /** Active BOM + Route Sheet for an item / SO (canonical Planning behaviour). */
    @Transactional(readOnly = true)
    public Map<String, Object> activeBomRoute(String itemCode, Long salesOrderId) {
        return planning.getActiveBomAndRoute(itemCode, salesOrderId);
    }

    /** Full Production Order dashboard/overview (canonical Planning behaviour). */
    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        return planning.dashboard();
    }

    /** Next Production Order number (canonical peek path). */
    @Transactional(readOnly = true)
    public Map<String, Object> nextNumber() {
        return Map.of("nextNumber", docs.peekNumber(KEY));
    }

    /**
     * Domain discriminator: map the business "orderType" (and legacy "order_type") onto the canonical
     * {@code work_order.orderType} column. Backward compatible: if the caller provides neither, the column stays
     * null (V3 default is applied only during creation defaults / backfill).
     */
    private static void applyOrderType(Map<String, Object> body) {
        if (body == null) return;
        Object orderType = body.get("orderType");
        if (orderType == null) orderType = body.get("order_type");
        if (orderType != null) {
            body.put("orderType", String.valueOf(orderType));
            body.remove("order_type");
        }
    }
}