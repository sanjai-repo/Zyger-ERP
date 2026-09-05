package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.config.ApiEnvelope;
import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.service.ProductionOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

/**
 * P2 additive Production Order API.
 *
 * <p>Business/domain terminology <b>Production Order</b> maps onto the existing canonical persistence
 * <b>Work Order</b> ({@code work_order}). This is a <b>thin alias controller</b> delegating entirely to
 * {@link ProductionOrderService} (itself a thin adapter over {@code PlanningService}/{@code DocumentFacade}).
 *
 * <p>There is <b>no</b> parallel controller/service implementation and <b>no</b> {@code prod_order} model (C2/D2/D3).
 * Existing Work Order APIs ({@code /api/v1/planning/work-order*}) remain fully backward compatible.
 */
@RestController
@RequestMapping("/api/v1/production/orders")
@RequirePermission(module = "PLANNING", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class ProductionOrderController {

    private final ProductionOrderService svc;

    @GetMapping
    ApiEnvelope<?> list(@RequestParam Map<String, String> q) {
        return svc.list(q);
    }

    @PostMapping
    @RequirePermission(module = "PLANNING", screen = "*", action = "CREATE")
    Map<String, Object> create(@RequestBody Map<String, Object> body, Principal p) {
        return svc.create(body, p);
    }

    @GetMapping("/{id}")
    Map<String, Object> get(@PathVariable Long id) {
        return svc.get(id);
    }

    @PutMapping("/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "EDIT")
    Map<String, Object> update(@PathVariable Long id, @RequestBody Map<String, Object> body, Principal p) {
        return svc.update(id, body, p);
    }

    @DeleteMapping("/{id}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "DELETE")
    void delete(@PathVariable Long id, Principal p) {
        svc.delete(id, p);
    }

    @GetMapping("/next-number")
    Map<String, Object> nextNumber() {
        return svc.nextNumber();
    }

    @PostMapping("/{id}/actions/{action}")
    @RequirePermission(module = "PLANNING", screen = "*", action = "APPROVE")
    Map<String, Object> action(@PathVariable Long id, @PathVariable String action,
                               @RequestBody(required = false) Map<String, String> body, Principal p) {
        return svc.action(id, action, body, p);
    }

    @PostMapping("/{id}/populate")
    Map<String, Object> populate(@PathVariable Long id) {
        return svc.populate(id);
    }

    @PostMapping("/create-from-so")
    Map<String, Object> createFromSo(@RequestBody Map<String, Object> body, Principal p) {
        return svc.createFromSo(body, p);
    }

    @GetMapping("/{id}/status-history")
    java.util.List<Map<String, Object>> statusHistory(@PathVariable Long id) {
        return svc.statusHistory(id);
    }

    @GetMapping("/{id}/summary")
    Map<String, Object> summary(@PathVariable Long id) {
        return svc.summary(id);
    }

    @GetMapping("/so-list")
    java.util.List<Map<String, Object>> soList() {
        return svc.soList();
    }

    @GetMapping("/active-bom-route")
    Map<String, Object> activeBomRoute(@RequestParam String itemCode,
                                       @RequestParam(required = false) Long salesOrderId) {
        return svc.activeBomRoute(itemCode, salesOrderId);
    }

    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
        return svc.dashboard();
    }
}