package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.service.ProductionConsumptionService;
import in.zygertechnology.zygererp.service.ProductionMaterialRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/production")
@RequirePermission(module = "PRODUCTION", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class ProductionMaterialController {

    private final ProductionMaterialRequestService materialRequests;
    private final ProductionConsumptionService consumptions;
    private final JobCardRepository jobCards;

    // ===========================
    // ---- MATERIAL REQUEST ----
    // ===========================

    @GetMapping("/material-requests")
    public List<ProdReqMaterial> listMaterialRequests() {
        return materialRequests.list();
    }

    @GetMapping("/material-requests/next-number")
    public Map<String, String> nextMaterialRequestNumber() {
        return Map.of("nextNumber", materialRequests.nextNumber());
    }

    @GetMapping("/material-requests/{id}")
    public ProdReqMaterial getMaterialRequest(@PathVariable Long id) {
        return materialRequests.get(id);
    }

    @PostMapping("/material-requests")
    @RequirePermission(module = "PRODUCTION", screen = "*", action = "EDIT")
    public ProdReqMaterial createMaterialRequest(@RequestBody ProdReqMaterial body, Principal p) {
        return materialRequests.save(body, principalName(p));
    }

    @PutMapping("/material-requests/{id}")
    @RequirePermission(module = "PRODUCTION", screen = "*", action = "EDIT")
    public ProdReqMaterial updateMaterialRequest(@PathVariable Long id, @RequestBody ProdReqMaterial body, Principal p) {
        body.setId(id);
        return materialRequests.save(body, principalName(p));
    }

    @DeleteMapping("/material-requests/{id}")
    @RequirePermission(module = "PRODUCTION", screen = "*", action = "DELETE")
    public void deleteMaterialRequest(@PathVariable Long id) {
        materialRequests.delete(id);
    }

    @PostMapping("/material-requests/{id}/actions/{action}")
    @RequirePermission(module = "PRODUCTION", screen = "*", action = "APPROVE")
    public ProdReqMaterial materialRequestAction(@PathVariable Long id, @PathVariable String action, Principal p) {
        return materialRequests.action(id, action, principalName(p));
    }

    // Released job cards eligible as production reference for a request
    @GetMapping("/material-requests/job-card-options")
    public List<JobCard> jobCardOptions(@RequestParam(defaultValue = "false") boolean released) {
        if (released) {
            return jobCards.findByStatus("RELEASED");
        }
        return jobCards.findAll();
    }

    // ===========================
    // ---- MATERIAL CONSUMPTION ----
    // ===========================

    @GetMapping("/consumptions")
    public List<ProductionConsumption> listConsumptions() {
        return consumptions.list();
    }

    @GetMapping("/consumptions/next-number")
    public Map<String, String> nextConsumptionNumber() {
        return Map.of("nextNumber", consumptions.nextNumber());
    }

    @GetMapping("/consumptions/{id}")
    public ProductionConsumption getConsumption(@PathVariable Long id) {
        return consumptions.get(id);
    }

    @PostMapping("/consumptions")
    @RequirePermission(module = "PRODUCTION", screen = "*", action = "EDIT")
    public ProductionConsumption createConsumption(@RequestBody ProductionConsumption body, Principal p) {
        return consumptions.save(body, principalName(p));
    }

    @PutMapping("/consumptions/{id}")
    @RequirePermission(module = "PRODUCTION", screen = "*", action = "EDIT")
    public ProductionConsumption updateConsumption(@PathVariable Long id, @RequestBody ProductionConsumption body, Principal p) {
        body.setId(id);
        return consumptions.save(body, principalName(p));
    }

    @DeleteMapping("/consumptions/{id}")
    @RequirePermission(module = "PRODUCTION", screen = "*", action = "DELETE")
    public void deleteConsumption(@PathVariable Long id) {
        consumptions.delete(id);
    }

    @PostMapping("/consumptions/{id}/actions/{action}")
    @RequirePermission(module = "PRODUCTION", screen = "*", action = "APPROVE")
    public ProductionConsumption consumptionAction(@PathVariable Long id, @PathVariable String action, Principal p) {
        return consumptions.action(id, action, principalName(p));
    }

    private static String principalName(Principal p) {
        return p != null ? p.getName() : "system";
    }
}