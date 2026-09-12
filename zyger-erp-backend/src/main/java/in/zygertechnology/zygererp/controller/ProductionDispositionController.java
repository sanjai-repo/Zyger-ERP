package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.ProductionRejectionDoc;
import in.zygertechnology.zygererp.entity.ProductionReworkDoc;
import in.zygertechnology.zygererp.entity.ProductionScrapDoc;
import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.service.ProductionDispositionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * P9 — First-class Rejection / Scrap / Rework disposition documents
 * (ADR-PROD-003 CREATE NEW first-class docs). One controller, three document
 * families, mirroring the single-controller convention of {@code ProductionController}.
 *
 * <p>RECORDING-ONLY per CLAR-PROD-002 R1: documents classify the already-reported
 * rejected/scrap/rework totals of a POSTED entry. No WIP, entry-quantity, subjob,
 * normalized-event, or Inventory mutation is performed here.
 */
@RestController
@RequirePermission(module = "PRODUCTION", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class ProductionDispositionController {

    private final ProductionDispositionService disposition;

    // =========================== REJECTION ===========================

    @GetMapping("/api/v1/production/rejections")
    public List<ProductionRejectionDoc> listRejections() {
        return disposition.listRejections();
    }

    @GetMapping("/api/v1/production/rejections/{id}")
    public ProductionRejectionDoc getRejection(@PathVariable Long id) {
        return disposition.getRejection(id);
    }

    @PostMapping("/api/v1/production/rejections")
    public ProductionRejectionDoc createRejection(@RequestBody ProductionRejectionDoc doc, Principal p) {
        return disposition.createRejection(doc, principalName(p));
    }

    @PutMapping("/api/v1/production/rejections/{id}")
    public ProductionRejectionDoc updateRejection(@PathVariable Long id,
                                                  @RequestBody ProductionRejectionDoc doc, Principal p) {
        return disposition.updateRejection(id, doc, principalName(p));
    }

    @PostMapping("/api/v1/production/rejections/{id}/actions/{action}")
    public ProductionRejectionDoc rejectionAction(@PathVariable Long id,
                                                  @PathVariable String action,
                                                  @RequestBody(required = false) Map<String, String> body,
                                                  HttpServletRequest request,
                                                  Principal p) {
        Map<String, String> b = body != null ? body : Map.of();
        return disposition.actionRejection(id, action, b.get("reversalReason"), idempotencyKey(request), principalName(p));
    }

    // ============================= SCRAP =============================

    @GetMapping("/api/v1/production/scraps")
    public List<ProductionScrapDoc> listScraps() {
        return disposition.listScraps();
    }

    @GetMapping("/api/v1/production/scraps/{id}")
    public ProductionScrapDoc getScrap(@PathVariable Long id) {
        return disposition.getScrap(id);
    }

    @PostMapping("/api/v1/production/scraps")
    public ProductionScrapDoc createScrap(@RequestBody ProductionScrapDoc doc, Principal p) {
        return disposition.createScrap(doc, principalName(p));
    }

    @PutMapping("/api/v1/production/scraps/{id}")
    public ProductionScrapDoc updateScrap(@PathVariable Long id,
                                          @RequestBody ProductionScrapDoc doc, Principal p) {
        return disposition.updateScrap(id, doc, principalName(p));
    }

    @PostMapping("/api/v1/production/scraps/{id}/actions/{action}")
    public ProductionScrapDoc scrapAction(@PathVariable Long id,
                                          @PathVariable String action,
                                          @RequestBody(required = false) Map<String, String> body,
                                          HttpServletRequest request,
                                          Principal p) {
        Map<String, String> b = body != null ? body : Map.of();
        return disposition.actionScrap(id, action, b.get("reversalReason"), idempotencyKey(request), principalName(p));
    }

    // ============================ REWORK ============================

    @GetMapping("/api/v1/production/reworks")
    public List<ProductionReworkDoc> listReworks() {
        return disposition.listReworks();
    }

    @GetMapping("/api/v1/production/reworks/{id}")
    public ProductionReworkDoc getRework(@PathVariable Long id) {
        return disposition.getRework(id);
    }

    @PostMapping("/api/v1/production/reworks")
    public ProductionReworkDoc createRework(@RequestBody ProductionReworkDoc doc, Principal p) {
        return disposition.createRework(doc, principalName(p));
    }

    @PutMapping("/api/v1/production/reworks/{id}")
    public ProductionReworkDoc updateRework(@PathVariable Long id,
                                            @RequestBody ProductionReworkDoc doc, Principal p) {
        return disposition.updateRework(id, doc, principalName(p));
    }

    @PostMapping("/api/v1/production/reworks/{id}/actions/{action}")
    public ProductionReworkDoc reworkAction(@PathVariable Long id,
                                            @PathVariable String action,
                                            @RequestBody(required = false) Map<String, String> body,
                                            HttpServletRequest request,
                                            Principal p) {
        Map<String, String> b = body != null ? body : Map.of();
        return disposition.actionRework(id, action, b.get("reversalReason"), idempotencyKey(request), principalName(p));
    }

    // ============================ HELPERS ============================

    private static String idempotencyKey(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String key = request.getHeader("X-Idempotency-Key");
        if (key == null) {
            key = request.getHeader("Idempotency-Key");
        }
        return key;
    }

    private static String principalName(Principal p) {
        return p != null ? p.getName() : "system";
    }
}