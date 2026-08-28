package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.QualitySupportService;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.*;

/**
 * Generic document endpoints for the Quality module secondary documents
 * (NCR, concession, test certificates, calibration records, complaint,
 * CAPA, 8D) mounted under /api/v1/quality/docs/{type}.
 *
 * Delegates to the common document engine so all docs share numbering,
 * workflow (submit/approve/reject/cancel/reopen), audit and export.
 */
@RestController
@RequestMapping("/api/v1/quality/docs")
@RequirePermission(module = "QUALITY", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class QualityDocsController {

    private static final Set<String> ALLOWED = Set.of(
            "quality-ncr",
            "quality-concession",
            "quality-test-certificate",
            "quality-calibration-record",
            "quality-customer-complaint",
            "quality-capa",
            "quality-8d"
    );

    /** Spec §3 FY-prefix mapping for quality doc types. */
    private static final Map<String, String> FY_PREFIX = Map.of(
            "quality-ncr",               "NCR",
            "quality-concession",         "CON",
            "quality-test-certificate",   "ITC",
            "quality-calibration-record", "CAL",
            "quality-customer-complaint", "CC",
            "quality-capa",              "CAP",
            "quality-8d",                "8D"
    );

    private final DocumentFacade svc;
    private final ExportService export;
    private final QualitySupportService support;

    private static String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    private static String key(String type) {
        if (!ALLOWED.contains(type)) {
            throw new IllegalArgumentException("Unknown quality document type: " + type);
        }
        return type;
    }

    @GetMapping("/{type}")
    Map<String, Object> list(@PathVariable String type, @RequestParam Map<String, String> q) {
        return svc.list(key(type), q);
    }

    @PostMapping("/{type}")
    Map<String, Object> create(@PathVariable String type, @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(support.create(key(type), b, principalName(p)));
    }

    @GetMapping("/{type}/{id}")
    Map<String, Object> get(@PathVariable String type, @PathVariable Long id) {
        return svc.getRow(key(type), id);
    }

    @GetMapping("/{type}/by-number/{docNo}")
    Map<String, Object> getByNumber(@PathVariable String type, @PathVariable String docNo) {
        return svc.getRow(key(type), svc.getByNumber(key(type), docNo).getId());
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
        String prefix = FY_PREFIX.get(key(type));
        if (prefix != null) {
            return Map.of("nextNumber", svc.peekNumberFy(prefix));
        }
        return Map.of("nextNumber", svc.peekNumber(key(type)));
    }

    @PostMapping("/{type}/{id}/actions/{action}")
    Map<String, Object> act(@PathVariable String type, @PathVariable Long id, @PathVariable String action,
                            @RequestBody(required = false) Map<String, String> b, Principal p) {
        return svc.toRow(support.action(key(type), id, action,
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
}
