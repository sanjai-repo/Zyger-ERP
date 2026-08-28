package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.JobOrderReconciliationService;
import in.zygertechnology.zygererp.service.PrintService;
import in.zygertechnology.zygererp.service.PurchaseService;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

/**
 * Purchase Module REST API.
 *
 * Generic CRUD + workflow for all purchase document types:
 * purchase-request, supplier-enquiry, supplier-quotation, purchase-order,
 * job-order, purchase-target, purchase-price-list, job-work-price-list.
 *
 * Mounted at /api/v1/purchase/{type}.
 */
@RestController
@RequestMapping("/api/v1/purchase")
@RequirePermission(module = "PURCHASE", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class PurchaseController {

    private static final Set<String> ALLOWED = Set.of(
            "purchase-request", "supplier-enquiry", "supplier-quotation",
            "purchase-order", "job-order", "purchase-target",
            "purchase-price-list", "job-work-price-list"
    );

    private final DocumentFacade svc;
    private final PurchaseService purchase;
    private final ExportService export;
    private final PrintService printer;
    private final JobOrderReconciliationService joReconciliation;

    private static String key(String type) {
        if (!ALLOWED.contains(type)) {
            throw new IllegalArgumentException("Unknown purchase document type: " + type);
        }
        return type;
    }

    private static String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    @GetMapping("/{type}")
    Map<String, Object> list(@PathVariable String type, @RequestParam Map<String, String> q) {
        return svc.list(key(type), q);
    }

    @PostMapping("/{type}")
    Map<String, Object> create(@PathVariable String type, @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(purchase.create(key(type), b, principalName(p)));
    }

    @GetMapping("/{type}/{id}")
    Map<String, Object> get(@PathVariable String type, @PathVariable Long id) {
        return svc.getRow(key(type), id);
    }

    @GetMapping("/job-orders/{id}/reconciliation")
    Map<String, Object> jobOrderReconciliation(@PathVariable Long id) {
        return joReconciliation.reconciliation(id);
    }

    @PutMapping("/{type}/{id}")
    Map<String, Object> update(@PathVariable String type, @PathVariable Long id,
                               @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(svc.update(key(type), id, b, principalName(p)));
    }

    @DeleteMapping("/{type}/{id}")
    void del(@PathVariable String type, @PathVariable Long id, Principal p) {
        svc.remove(key(type), id, principalName(p));
    }

    @GetMapping("/{type}/next-number")
    Map<String, Object> next(@PathVariable String type) {
        return Map.of("nextNumber", svc.peekNumber(key(type)));
    }

    @PostMapping("/{type}/{id}/actions/{action}")
    Map<String, Object> act(@PathVariable String type, @PathVariable Long id, @PathVariable String action,
                            @RequestBody(required = false) Map<String, String> b, Principal p) {
        return svc.toRow(purchase.action(key(type), id, action,
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

    @GetMapping("/{type}/{id}/print")
    ResponseEntity<byte[]> print(@PathVariable String type, @PathVariable Long id,
                                  @RequestParam(defaultValue = "false") boolean download) {
        Map<String, Object> row = svc.getRow(key(type), id);
        String docNo = String.valueOf(row.getOrDefault("docNo", type)).replaceAll("[^A-Za-z0-9_-]", "_");
        String disposition = download ? "attachment" : "inline";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition + "; filename=\"" + docNo + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(printer.salesDoc(row, type));
    }

    // ---- Dashboard ----

    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
        return purchase.dashboard();
    }

    // ---- Email dispatch ----

    @PostMapping("/supplier-enquiry/{id}/send-email")
    Map<String, Object> sendEnquiryEmail(@PathVariable Long id, Principal p) {
        return purchase.sendEnquiryEmail(id, principalName(p));
    }

    @PostMapping("/purchase-order/{id}/send-email")
    Map<String, Object> sendPoEmail(@PathVariable Long id, Principal p) {
        return purchase.sendPoEmail(id, principalName(p));
    }

    @PostMapping("/job-order/{id}/send-email")
    Map<String, Object> sendJoEmail(@PathVariable Long id, Principal p) {
        return purchase.sendJoEmail(id, principalName(p));
    }
}
