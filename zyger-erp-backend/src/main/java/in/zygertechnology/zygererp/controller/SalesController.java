package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.dto.ActionRequest;
import in.zygertechnology.zygererp.dto.PaginatedResponse;
import in.zygertechnology.zygererp.dto.sales.CreateSalesOrderRequest;
import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.PrintService;
import in.zygertechnology.zygererp.service.SalesService;
import in.zygertechnology.zygererp.security.RequirePermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/v1/sales")
@RequirePermission(module = "SALES", screen = "*", action = "VIEW")
@RequiredArgsConstructor
@Tag(name = "Sales", description = "Sales Order, Proforma Invoice, DC, Invoice, Returns")
public class SalesController {

    private static final Set<String> ALLOWED = Set.of(
            "sales-order", "proforma-invoice", "sales-dc",
            "sales-invoice", "dc-return", "invoice-return"
    );

    private final DocumentFacade svc;
    private final SalesService sales;
    private final ExportService export;
    private final PrintService printer;

    private static String key(String type) {
        if (!ALLOWED.contains(type)) {
            throw new IllegalArgumentException("Unknown sales document type: " + type);
        }
        return type;
    }

    private static String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    @Operation(summary = "List sales documents with pagination and filters")
    @GetMapping("/{type}")
    Map<String, Object> list(
            @Parameter(description = "Document type") @PathVariable String type,
            @RequestParam Map<String, String> q) {
        return svc.list(key(type), q);
    }

    @Operation(summary = "Create a new sales document")
    @PostMapping("/{type}")
    Map<String, Object> create(
            @Parameter(description = "Document type") @PathVariable String type,
            @RequestBody Map<String, Object> b,
            Principal p) {
        return svc.toRow(sales.create(key(type), b, principalName(p)));
    }

    @Operation(summary = "Get a sales document by ID")
    @GetMapping("/{type}/{id}")
    Map<String, Object> get(
            @Parameter(description = "Document type") @PathVariable String type,
            @Parameter(description = "Document ID") @PathVariable Long id) {
        return svc.getRow(key(type), id);
    }

    @Operation(summary = "Update a sales document (DRAFT/REJECTED only)")
    @PutMapping("/{type}/{id}")
    Map<String, Object> update(
            @Parameter(description = "Document type") @PathVariable String type,
            @Parameter(description = "Document ID") @PathVariable Long id,
            @RequestBody Map<String, Object> b,
            Principal p) {
        return svc.toRow(svc.update(key(type), id, b, principalName(p)));
    }

    @Operation(summary = "Delete a sales document (DRAFT/REJECTED only)")
    @DeleteMapping("/{type}/{id}")
    void del(
            @Parameter(description = "Document type") @PathVariable String type,
            @Parameter(description = "Document ID") @PathVariable Long id,
            Principal p) {
        svc.remove(key(type), id, principalName(p));
    }

    @Operation(summary = "Get next document number preview")
    @GetMapping("/{type}/next-number")
    Map<String, Object> next(
            @Parameter(description = "Document type") @PathVariable String type) {
        return Map.of("nextNumber", svc.peekNumber(key(type)));
    }

    @Operation(summary = "Perform workflow action (submit, approve, reject, post, etc.)")
    @PostMapping("/{type}/{id}/actions/{action}")
    Map<String, Object> act(
            @Parameter(description = "Document type") @PathVariable String type,
            @Parameter(description = "Document ID") @PathVariable Long id,
            @Parameter(description = "Action name") @PathVariable String action,
            @RequestBody(required = false) ActionRequest body,
            Principal p) {
        Map<String, Object> opts = body == null ? Map.of() : new LinkedHashMap<>();
        if (body != null) {
            if (body.getNote() != null) opts.put("note", body.getNote());
            if (body.getOptions() != null) opts.putAll(body.getOptions());
        }
        String note = String.valueOf(opts.getOrDefault("note", ""));
        return svc.toRow(sales.action(key(type), id, action, note, principalName(p), opts));
    }

    @Operation(summary = "Export sales documents to Excel or PDF")
    @GetMapping("/{type}/export")
    ResponseEntity<byte[]> export(
            @Parameter(description = "Document type") @PathVariable String type,
            @RequestParam Map<String, String> q) {
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

    @Operation(summary = "Print a sales document as PDF")
    @GetMapping("/{type}/{id}/print")
    ResponseEntity<byte[]> print(
            @Parameter(description = "Document type") @PathVariable String type,
            @Parameter(description = "Document ID") @PathVariable Long id,
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

    @Operation(summary = "Get sales dashboard statistics")
    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
        return sales.dashboard();
    }
}
