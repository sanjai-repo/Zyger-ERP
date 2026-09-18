package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.RejectedItemsService;
import in.zygertechnology.zygererp.service.StoreNameResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** Quality → Rejected Items (read-only aggregation across all rejection sources). */
@RestController
@RequestMapping("/api/v1/quality/rejected-items")
@RequirePermission(module = "QUALITY", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class RejectedItemsController {

    private final RejectedItemsService service;
    private final ExportService export;
    private final StoreNameResolver storeNames;

    @GetMapping
    public Map<String, Object> list(@RequestParam Map<String, String> q) {
        List<Map<String, Object>> rows = service.events(q);
        int size = Math.max(1, parse(q.get("size"), 25));
        int page = Math.max(0, parse(q.get("page"), 0));
        int total = rows.size();
        int from = Math.min(page * size, total);
        int to = Math.min(from + size, total);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", rows.subList(from, to));
        out.put("totalElements", total);
        out.put("totalPages", (int) Math.ceil(total / (double) size));
        out.put("page", page);
        out.put("size", size);
        out.put("summary", service.summary(rows));
        return out;
    }

    @GetMapping("/held")
    public List<Map<String, Object>> held(@RequestParam Map<String, String> q) {
        return service.heldStock(q);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportEvents(@RequestParam Map<String, String> q) {
        String format = q.getOrDefault("format", "xlsx");
        return file(export.build(storeNames.forExport(service.events(q)), format, "Rejected Items"), format, "rejected-items");
    }

    @GetMapping("/held/export")
    public ResponseEntity<byte[]> exportHeld(@RequestParam Map<String, String> q) {
        String format = q.getOrDefault("format", "xlsx");
        return file(export.build(storeNames.forExport(service.heldStock(q)), format, "Rejected Stock Held"), format, "rejected-stock-held");
    }

    private static int parse(String s, int def) {
        try { return s == null ? def : Integer.parseInt(s); } catch (NumberFormatException e) { return def; }
    }

    private static ResponseEntity<byte[]> file(byte[] bytes, String format, String title) {
        boolean pdf = "pdf".equalsIgnoreCase(format);
        MediaType media = pdf ? MediaType.APPLICATION_PDF
                : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + title + (pdf ? ".pdf" : ".xlsx") + "\"")
                .contentType(media).body(bytes);
    }
}
