package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.ProductionGateOverride;
import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.service.ProductionQualityGateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * P11 — Production Quality Gate (CLAR-PROD-012).
 *
 * <p>Reads gate status and drives the ONE-TIME operation-scoped override workflow. Gate enforcement
 * itself lives in {@link ProductionQualityGateService} at entry post and subjob completion.
 */
@RestController
@RequiredArgsConstructor
@RequirePermission(module = "PRODUCTION", screen = "*", action = "VIEW")
public class ProductionQualityGateController {

    private final ProductionQualityGateService qualityGate;

    @GetMapping("/api/v1/production/quality-gate/status")
    public Map<String, Object> statusByJobCard(@RequestParam String jobCardNumber) {
        return qualityGate.statusByJobCard(jobCardNumber);
    }

    @GetMapping("/api/v1/production/quality-gate/overrides")
    public List<ProductionGateOverride> listOverrides() {
        return qualityGate.listOverrides();
    }

    @GetMapping("/api/v1/production/quality-gate/overrides/{id}")
    public Map<String, Object> overrideDetail(@PathVariable Long id) {
        return qualityGate.overrideDetail(id);
    }

    @PostMapping("/api/v1/production/quality-gate/overrides")
    public ProductionGateOverride requestOverride(@RequestBody Map<String, Object> body, Principal p) {
        return qualityGate.requestOverride(body, principalName(p));
    }

    @PostMapping("/api/v1/production/quality-gate/overrides/{id}/sign-quality")
    public ProductionGateOverride signQuality(@PathVariable Long id, Principal p) {
        return qualityGate.signQuality(id, principalName(p));
    }

    @PostMapping("/api/v1/production/quality-gate/overrides/{id}/sign-production")
    public ProductionGateOverride signProduction(@PathVariable Long id, Principal p) {
        return qualityGate.signProduction(id, principalName(p));
    }

    @PostMapping("/api/v1/production/quality-gate/overrides/{id}/sign-plant-head")
    public ProductionGateOverride signPlantHead(@PathVariable Long id, Principal p) {
        return qualityGate.signPlantHead(id, principalName(p));
    }

    private static String principalName(Principal p) { return p != null ? p.getName() : "system"; }
}