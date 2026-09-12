package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.ProductionBatchCard;
import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.service.ProductionBatchCardService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * P10 — First-class Batch Card document (FR-PROD-BATCH-001; DOC_57 §4 #12).
 * Routes under /api/v1/batch-cards with a parity alias under /api/v1/production/batch-cards (F12). Recording-only: never mutates WIP, entry
 * quantities, normalized events, or Inventory (ADR-PROD-005 boundary).
 *
 * <p>An idempotent duplicate create (same posted entry + physical batch + controlled item)
 * idempotently returns the already-registered card rather than failing.
 */
@RestController
@RequirePermission(module = "PRODUCTION", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class ProductionBatchCardController {

    private final ProductionBatchCardService batchCards;

    @GetMapping({"/api/v1/batch-cards", "/api/v1/production/batch-cards"})
    public List<ProductionBatchCard> list(Principal p) {
        return batchCards.list();
    }

    @GetMapping({"/api/v1/batch-cards/{id}", "/api/v1/production/batch-cards/{id}"})
    public ProductionBatchCard get(@PathVariable Long id) {
        return batchCards.get(id);
    }

    @PostMapping({"/api/v1/batch-cards", "/api/v1/production/batch-cards"})
    public ProductionBatchCard create(@RequestBody ProductionBatchCard doc, Principal p) {
        try {
            return batchCards.create(doc, principalName(p));
        } catch (ProductionBatchCardService.DuplicateBatchCardException e) {
            // Idempotent re-create: return the original card for the same entry + batch.
            List<ProductionBatchCard> matching = batchCards.list().stream()
                    .filter(c -> Boolean.FALSE.equals(c.getIsReversal()))
                    .filter(c -> c.getEntryId() != null && c.getEntryId().equals(doc.getEntryId()))
                    .filter(c -> doc.getPhysicalBatchNumber() != null
                            && doc.getPhysicalBatchNumber().equalsIgnoreCase(c.getPhysicalBatchNumber()))
                    .toList();
            if (!matching.isEmpty()) {
                return matching.get(0);
            }
            throw e;
        }
    }

    @PutMapping({"/api/v1/batch-cards/{id}", "/api/v1/production/batch-cards/{id}"})
    public ProductionBatchCard update(@PathVariable Long id,
                                      @RequestBody ProductionBatchCard doc, Principal p) {
        return batchCards.update(id, doc, principalName(p));
    }

    @PostMapping({"/api/v1/batch-cards/{id}/actions/{action}", "/api/v1/production/batch-cards/{id}/actions/{action}"})
    public ProductionBatchCard action(@PathVariable Long id,
                                      @PathVariable String action,
                                      @RequestBody(required = false) Map<String, String> body,
                                      HttpServletRequest request,
                                      Principal p) {
        Map<String, String> b = body != null ? body : Map.of();
        return batchCards.action(id, action, b.get("reversalReason"),
                idempotencyKey(request), principalName(p));
    }

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