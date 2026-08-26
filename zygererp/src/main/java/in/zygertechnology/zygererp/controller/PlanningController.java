package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.PlanningService;
import in.zygertechnology.zygererp.service.PrintService;
import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.config.ApiEnvelope;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/v1/planning")
@RequirePermission(module = "PLANNING", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class PlanningController {

    private static final Set<String> ALLOWED = Set.of(
            "production-bom", "route-sheet", "work-order", "shop-floor-entry"
    );

    private final DocumentFacade svc;
    private final PlanningService planning;
    private final ExportService export;
    private final PrintService printService;

    private static String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    private static String key(String type) {
        if (!ALLOWED.contains(type)) {
            throw new IllegalArgumentException("Unknown planning document type: " + type);
        }
        return type;
    }

    // FRS §5.1: List returns { data: [...], meta: { page, size, totalElements, totalPages } }
    @GetMapping("/{type}")
    ApiEnvelope<?> list(@PathVariable String type, @RequestParam Map<String, String> q) {
        Map<String, Object> page = svc.list(key(type), q);
        int pg = q.containsKey("page") ? Integer.parseInt(q.get("page")) : 0;
        int sz = q.containsKey("size") ? Integer.parseInt(q.get("size")) : 8;
        long total = page.get("totalElements") instanceof Number n ? n.longValue() : 0;
        int totalPages = page.get("totalPages") instanceof Number n2 ? n2.intValue() : 1;
        return ApiEnvelope.paged(page.get("content"), pg, sz, total, totalPages);
    }

    @PostMapping("/{type}")
    Map<String, Object> create(@PathVariable String type, @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(planning.create(key(type), b, principalName(p)));
    }

    // FRS §5.1: Single doc returns { data: {...} }
    @GetMapping("/{type}/{id}")
    ApiEnvelope<?> get(@PathVariable String type, @PathVariable Long id) {
        return ApiEnvelope.single(svc.getRow(key(type), id));
    }

    @PutMapping("/{type}/{id}")
    Map<String, Object> update(@PathVariable String type, @PathVariable Long id,
                               @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(planning.update(key(type), id, b, principalName(p)));
    }

    @DeleteMapping("/{type}/{id}")
    void del(@PathVariable String type, @PathVariable Long id, Principal p) {
        if ("production-bom".equals(type)) {
            planning.validateBomCanBeDeleted(id);
        }
        svc.remove(key(type), id, principalName(p));
    }

    @GetMapping("/{type}/next-number")
    Map<String, Object> next(@PathVariable String type) {
        return Map.of("nextNumber", svc.nextNumber(key(type)));
    }

    @PostMapping("/{type}/{id}/actions/{action}")
    Map<String, Object> act(@PathVariable String type, @PathVariable Long id, @PathVariable String action,
                            @RequestBody(required = false) Map<String, String> b, Principal p) {
        return svc.toRow(planning.action(key(type), id, action,
                b == null ? "" : b.getOrDefault("note", ""), principalName(p)));
    }

    @GetMapping("/{type}/export")
    ResponseEntity<byte[]> export(@PathVariable String type, @RequestParam Map<String, String> q) {
        Map<String, Object> page = svc.list(key(type), q);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) page.getOrDefault("content", List.of());
        String format = q.getOrDefault("format", "xlsx");
        byte[] bytes = export.build(rows, format, key(type));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=" + key(type) + "." + format)
                .contentType(format.equals("pdf") ? MediaType.APPLICATION_PDF
                        : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
        return planning.dashboard();
    }

    // FRS §6.15: My Pending Approvals — documents awaiting current user's approval
    @GetMapping("/pending-approvals")
    List<Map<String, Object>> pendingApprovals() {
        return planning.getPendingApprovals();
    }

    @PostMapping("/work-order/{id}/populate")
    Map<String, Object> populateWo(@PathVariable Long id) {
        in.zygertechnology.zygererp.entity.WorkOrder wo = planning.populateFromBomAndRoute(id);
        return svc.toRow(wo);
    }

    @PostMapping("/production-bom/{id}/revise")
    Map<String, Object> reviseBom(@PathVariable Long id, @RequestBody Map<String, String> body, Principal p) {
        String newVersion = body.getOrDefault("newVersion", "2.0");
        String remarks = body.getOrDefault("remarks", "");
        in.zygertechnology.zygererp.entity.ProductionBOM newBom = planning.createBomRevision(id, newVersion, remarks, principalName(p));
        return svc.toRow(newBom);
    }

    @GetMapping("/production-bom/{id}/revisions")
    List<Map<String, Object>> bomRevisions(@PathVariable Long id) {
        return planning.getBomRevisionHistory(id);
    }

    @PostMapping("/production-bom/copy")
    Map<String, Object> copyBom(@RequestBody Map<String, Object> body, Principal p) {
        String sourceBomCode = (String) body.get("sourceBomCode");
        in.zygertechnology.zygererp.entity.ProductionBOM newBom = planning.copyBom(sourceBomCode, body, principalName(p));
        return svc.toRow(newBom);
    }

    @PostMapping("/work-order/create-from-so")
    Map<String, Object> createWoFromSo(@RequestBody Map<String, Object> body, Principal p) {
        Long soId = Long.parseLong(String.valueOf(body.get("salesOrderId")));
        Long soItemId = body.get("salesOrderItemId") != null ? Long.parseLong(String.valueOf(body.get("salesOrderItemId"))) : null;
        int qty = body.get("quantity") != null ? Integer.parseInt(String.valueOf(body.get("quantity"))) : 0;
        in.zygertechnology.zygererp.entity.WorkOrder wo = planning.createWorkOrderFromSO(soId, soItemId, qty, principalName(p));
        return svc.toRow(wo);
    }

    // ── FRS §18: Work Order Print/PDF ──

    @GetMapping("/work-order/{id}/print")
    ResponseEntity<byte[]> printWorkOrder(@PathVariable Long id) {
        Map<String, Object> doc = svc.getRow("work-order", id);
        byte[] pdf = printService.workOrder(doc);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=WO-" + String.valueOf(doc.get("woNumber")) + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ── FRS §5.4 FR-23/FR-24: BOM Print/PDF ──

    @GetMapping("/production-bom/{id}/print")
    ResponseEntity<byte[]> printBom(@PathVariable Long id) {
        Map<String, Object> doc = svc.getRow("production-bom", id);
        byte[] pdf = printService.bom(doc);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=BOM-" + String.valueOf(doc.get("bomNumber")) + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ── FRS FR-09: BOM Multi-level Tree ──

    @GetMapping("/production-bom/{id}/tree")
    Map<String, Object> bomTree(@PathVariable Long id) {
        return planning.getBomTree(id);
    }

    // ── FRS: Route Sheet Print/PDF ──

    @GetMapping("/route-sheet/{id}/print")
    ResponseEntity<byte[]> printRouteSheet(@PathVariable Long id) {
        Map<String, Object> doc = svc.getRow("route-sheet", id);
        byte[] pdf = printService.routeSheet(doc);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=RS-" + String.valueOf(doc.get("routeNumber")) + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ── FRS §19.3: Status History ──

    @GetMapping("/work-order/{id}/status-history")
    List<Map<String, Object>> woStatusHistory(@PathVariable Long id) {
        return planning.getWorkOrderStatusHistory(id);
    }

    // FRS §10.1: Generic status history for any planning document
    @GetMapping("/{type}/{id}/status-history")
    List<Map<String, Object>> docStatusHistory(@PathVariable String type, @PathVariable Long id) {
        return planning.getDocStatusHistory(key(type), id);
    }

    // ── FRS §3.3: Work Order Summary ──

    @GetMapping("/work-order/{id}/summary")
    Map<String, Object> woSummary(@PathVariable Long id) {
        return planning.getWorkOrderSummary(id);
    }

    // ── FRS §17: Reports ──

    @GetMapping("/work-order/reports/overdue")
    Map<String, Object> overdueWorkOrders(@RequestParam Map<String, String> q) {
        return planning.getOverdueWorkOrders(q);
    }

    @GetMapping("/work-order/reports/shortage")
    Map<String, Object> materialShortageReport(@RequestParam Map<String, String> q) {
        return planning.getMaterialShortageReport(q);
    }

    @GetMapping("/work-order/reports/status-summary")
    Map<String, Object> woStatusSummary() {
        return planning.getWoStatusSummary();
    }

    @GetMapping("/work-order/reports/completion")
    Map<String, Object> completionReport(@RequestParam Map<String, String> q) {
        return planning.getCompletionReport(q);
    }

    @GetMapping("/work-order/reports/so-pending")
    Map<String, Object> soPendingReport(@RequestParam Map<String, String> q) {
        return planning.getSoPendingReport(q);
    }

    @GetMapping("/work-order/reports/open")
    Map<String, Object> openWorkOrders(@RequestParam Map<String, String> q) {
        return planning.getOpenWorkOrders(q);
    }
}
