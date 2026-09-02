package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.MaintenanceCostService;
import in.zygertechnology.zygererp.service.PmWorkOrderService;
import in.zygertechnology.zygererp.service.SpareRequestService;
import in.zygertechnology.zygererp.repo.InstrumentMasterRepository;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Extended maintenance endpoints: PM Work Order (§5.3), Spare Request/Issue bridge (§8),
 * Maintenance Cost ledger (§10.4), Calibration instrument status (§20).
 */
@RestController
@RequirePermission(module = "MAINTENANCE", screen = "*", action = "VIEW")
@Slf4j
@RequiredArgsConstructor
public class MaintenanceExtendedController {

    private final PmWorkOrderService workOrderService;
    private final SpareRequestService spareRequestService;
    private final MaintenanceCostService costService;
    private final InstrumentMasterRepository instruments;

    private String pn(Principal p) { return p != null ? p.getName() : "system"; }

    // ===================== PM WORK ORDER (§5.3) =====================

    @GetMapping("/api/v1/maintenance/work-orders")
    public List<Map<String, Object>> listWorkOrders(@RequestParam(required = false) String status) {
        return workOrderService.list(status);
    }

    @GetMapping("/api/v1/maintenance/work-orders/my-queue")
    public List<Map<String, Object>> myQueue(@RequestParam(required = false) Long technicianId) {
        return workOrderService.myQueue(technicianId);
    }

    @GetMapping("/api/v1/maintenance/work-orders/{id}")
    public Map<String, Object> getWorkOrder(@PathVariable Long id) {
        return workOrderService.get(id);
    }

    @PostMapping("/api/v1/maintenance/work-orders")
    public in.zygertechnology.zygererp.entity.PmWorkOrder createWorkOrder(@RequestBody Map<String, Object> body, Principal principal) {
        return workOrderService.create(
                Long.valueOf(body.getOrDefault("scheduleId", "0").toString()),
                (String) body.getOrDefault("title", null),
                (String) body.getOrDefault("description", null),
                principal);
    }

    @PostMapping("/api/v1/maintenance/work-orders/{id}/actions/{action}")
    public Map<String, Object> workOrderAction(@PathVariable Long id, @PathVariable String action,
                                               @RequestBody(required = false) Map<String, Object> body, Principal principal) {
        return workOrderService.action(id, action, body, principal);
    }

    // ===================== SPARE REQUEST (§8) =====================

    @GetMapping("/api/v1/maintenance/spare-requests")
    public List<Map<String, Object>> listSpareRequests(@RequestParam(required = false) String status) {
        return spareRequestService.list(status);
    }

    @GetMapping("/api/v1/maintenance/spare-requests/{id}")
    public Map<String, Object> getSpareRequest(@PathVariable Long id) {
        return spareRequestService.get(id);
    }

    @PostMapping("/api/v1/maintenance/spare-requests")
    public Map<String, Object> createSpareRequest(@RequestBody Map<String, Object> body, Principal principal) {
        return spareRequestService.create(body, pn(principal));
    }

    @PostMapping("/api/v1/maintenance/spare-requests/{id}/approve")
    public Map<String, Object> approveSpareRequest(@PathVariable Long id, Principal principal) {
        return spareRequestService.approve(id, pn(principal));
    }

    @PostMapping("/api/v1/maintenance/spare-requests/{id}/reject")
    public Map<String, Object> rejectSpareRequest(@PathVariable Long id,
                                                  @RequestBody(required = false) Map<String, String> body, Principal principal) {
        return spareRequestService.reject(id, body == null ? null : body.get("reason"), pn(principal));
    }

    @PostMapping("/api/v1/maintenance/spare-requests/{id}/cancel")
    public Map<String, Object> cancelSpareRequest(@PathVariable Long id, Principal principal) {
        return spareRequestService.cancel(id, pn(principal));
    }

    // ===================== COST LEDGER (§10.4) =====================

    @GetMapping("/api/v1/maintenance/cost-transactions")
    public List<Map<String, Object>> listCosts(@RequestParam(required = false) String machineCode,
                                               @RequestParam(required = false) String category,
                                               @RequestParam(required = false) String from,
                                               @RequestParam(required = false) String to) {
        return costService.list(machineCode, category, from, to);
    }

    @GetMapping("/api/v1/maintenance/cost-transactions/summary")
    public Map<String, Object> costSummary(@RequestParam(required = false) String machineCode) {
        return costService.summary(machineCode);
    }

    @PostMapping("/api/v1/maintenance/cost-transactions")
    public in.zygertechnology.zygererp.entity.MaintenanceCostTransaction saveCost(
            @RequestBody in.zygertechnology.zygererp.entity.MaintenanceCostTransaction txn, Principal principal) {
        return costService.saveManual(txn, pn(principal));
    }

    @PostMapping("/api/v1/maintenance/cost-transactions/sync")
    public Map<String, Object> syncCost(@RequestBody Map<String, Object> body, Principal principal) {
        String parentType = (String) body.getOrDefault("parentType", null);
        Long parentId = Long.valueOf(body.getOrDefault("parentId", "0").toString());
        int posted = costService.syncParentCost(parentType, parentId, pn(principal));
        return Map.of("success", true, "posted", posted);
    }

    @PostMapping("/api/v1/maintenance/cost-transactions/{id}/reverse")
    public Map<String, Object> reverseCost(@PathVariable Long id,
                                           @RequestBody(required = false) Map<String, String> body, Principal principal) {
        return costService.reverse(id, body == null ? null : body.get("reason"), pn(principal));
    }

    // ===================== CALIBRATION INSTRUMENT STATUS (§20) =====================

    /**
     * Consumable by the Quality module to block use of an instrument whose calibration
     * is invalid/overdue. Returns the maintenance InstrumentMaster status flags.
     */
    @GetMapping("/api/v1/maintenance/calibration/instrument/{id}/status")
    public Map<String, Object> calibrationInstrumentStatus(@PathVariable Long id) {
        var inst = instruments.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Instrument not found"));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", inst.getId());
        m.put("code", inst.getCode());
        m.put("name", inst.getName());
        m.put("calibrationStatus", inst.getCalibrationStatus());
        m.put("currentStatus", inst.getCurrentStatus());
        m.put("calibrationDue", inst.getCalibrationDue());
        m.put("usable", "VALID".equalsIgnoreCase(inst.getCalibrationStatus())
                && !"QUARANTINED".equalsIgnoreCase(inst.getCurrentStatus()));
        return m;
    }
}
