package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.PrintService;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.security.Principal;
import java.util.*;

@RestController @RequestMapping("/api/inventory") @RequiredArgsConstructor
@RequirePermission(module = "INVENTORY", screen = "*", action = "VIEW")
public class DocumentController {

    private final DocumentFacade svc;
    private final ExportService export;
    private final PrintService printer;

    private static String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    @GetMapping({
            "/documents/{type}", "/stock-issue/{type}", "/delivery-challan/{type}",
            "/supplier-invoice/{type}", "/return-management/{type}", "/allotment/{type}",
            "/adjustment/{type}", "/store-receipt/{type}"})
    Map<String, Object> list(@PathVariable String type, @RequestParam Map<String, String> q) {
        return svc.list(type, q);
    }

    @PostMapping({
            "/documents/{type}", "/stock-issue/{type}", "/delivery-challan/{type}",
            "/supplier-invoice/{type}", "/return-management/{type}", "/allotment/{type}",
            "/adjustment/{type}", "/store-receipt/{type}"})
    Map<String, Object> create(@PathVariable String type, @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(svc.create(type, b, principalName(p)));
    }

    @GetMapping({
            "/documents/{type}/{id}", "/stock-issue/{type}/{id}", "/delivery-challan/{type}/{id}",
            "/supplier-invoice/{type}/{id}", "/return-management/{type}/{id}", "/allotment/{type}/{id}",
            "/adjustment/{type}/{id}", "/store-receipt/{type}/{id}"})
    Map<String, Object> get(@PathVariable String type, @PathVariable Long id) {
        return svc.getRow(type, id);
    }

    @PutMapping({
            "/documents/{type}/{id}", "/stock-issue/{type}/{id}", "/delivery-challan/{type}/{id}",
            "/supplier-invoice/{type}/{id}", "/return-management/{type}/{id}", "/allotment/{type}/{id}",
            "/adjustment/{type}/{id}", "/store-receipt/{type}/{id}"})
    Map<String, Object> update(@PathVariable String type, @PathVariable Long id,
                               @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(svc.update(type, id, b, principalName(p)));
    }

    @DeleteMapping({
            "/documents/{type}/{id}", "/stock-issue/{type}/{id}", "/delivery-challan/{type}/{id}",
            "/supplier-invoice/{type}/{id}", "/return-management/{type}/{id}", "/allotment/{type}/{id}",
            "/adjustment/{type}/{id}", "/store-receipt/{type}/{id}"})
    void del(@PathVariable String type, @PathVariable Long id, Principal p) {
        svc.remove(type, id, principalName(p));
    }

    @GetMapping({
            "/documents/{type}/by-number/{docNo}", "/stock-issue/{type}/by-number/{docNo}",
            "/delivery-challan/{type}/by-number/{docNo}", "/supplier-invoice/{type}/by-number/{docNo}",
            "/return-management/{type}/by-number/{docNo}", "/allotment/{type}/by-number/{docNo}",
            "/adjustment/{type}/by-number/{docNo}", "/store-receipt/{type}/by-number/{docNo}"})
    Map<String, Object> getByNumber(@PathVariable String type, @PathVariable String docNo) {
        return svc.getRow(type, svc.getByNumber(type, docNo).getId());
    }

    @GetMapping({
            "/documents/{type}/next-number", "/stock-issue/{type}/next-number",
            "/delivery-challan/{type}/next-number", "/supplier-invoice/{type}/next-number",
            "/return-management/{type}/next-number", "/allotment/{type}/next-number",
            "/adjustment/{type}/next-number", "/store-receipt/{type}/next-number"})
    Map<String, Object> next(@PathVariable String type, @RequestParam Map<String, String> q) {
        if ("issue-internal-external".equals(type)) {
            String issueType = q.get("issueType");
            if (issueType != null && !issueType.isBlank()) {
                String prefix = "INTERNAL".equalsIgnoreCase(issueType) ? "INT" : "EXT";
                return Map.of("prefix", prefix, "nextNumber", svc.peekNumber(type, prefix));
            }
        }
        return Map.of("nextNumber", svc.peekNumber(type));
    }

    @PostMapping({
            "/documents/{type}/{id}/actions/{action}", "/stock-issue/{type}/{id}/actions/{action}",
            "/delivery-challan/{type}/{id}/actions/{action}", "/supplier-invoice/{type}/{id}/actions/{action}",
            "/return-management/{type}/{id}/actions/{action}", "/allotment/{type}/{id}/actions/{action}",
            "/adjustment/{type}/{id}/actions/{action}", "/store-receipt/{type}/{id}/actions/{action}"})
    Map<String, Object> act(@PathVariable String type, @PathVariable Long id, @PathVariable String action,
                            @RequestBody(required = false) Map<String, Object> b, Principal p) {
        Map<String, Object> opts = b == null ? Map.of() : b;
        String note = String.valueOf(opts.getOrDefault("note", ""));
        return svc.toRow(svc.action(type, id, action, note, principalName(p), opts));
    }

    @GetMapping({
            "/documents/{type}/export", "/stock-issue/{type}/export", "/delivery-challan/{type}/export",
            "/supplier-invoice/{type}/export", "/return-management/{type}/export", "/allotment/{type}/export",
            "/adjustment/{type}/export", "/store-receipt/{type}/export"})
    ResponseEntity<byte[]> export(@PathVariable String type, @RequestParam Map<String, String> q) {
        Map<String, Object> page = svc.list(type, q);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) page.getOrDefault("content", List.of());
        String format = q.getOrDefault("format", "xlsx");
        byte[] bytes = export.build(rows, format, type);
        return fileResponse(bytes, format, type);
    }

    @GetMapping("/stock-issue-request")
    Map<String, Object> sirL(@RequestParam Map<String, String> q) { return svc.list("stock-issue-request", q); }

    @PostMapping("/stock-issue-request")
    Map<String, Object> sirC(@RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(svc.create("stock-issue-request", b, principalName(p)));
    }

    @GetMapping("/stock-issue-request/next-number")
    Map<String, Object> sirN() { return Map.of("nextNumber", svc.peekNumber("stock-issue-request")); }

    @GetMapping("/stock-issue-request/{id}")
    Map<String, Object> sirG(@PathVariable Long id) { return svc.toRow(svc.get("stock-issue-request", id)); }

    @PutMapping("/stock-issue-request/{id}")
    Map<String, Object> sirU(@PathVariable Long id, @RequestBody Map<String, Object> b, Principal p) {
        return svc.toRow(svc.update("stock-issue-request", id, b, principalName(p)));
    }

    @DeleteMapping("/stock-issue-request/{id}")
    void sirD(@PathVariable Long id, Principal p) { svc.remove("stock-issue-request", id, principalName(p)); }

    @PostMapping("/stock-issue-request/{id}/actions/{action}")
    Map<String, Object> sirA(@PathVariable Long id, @PathVariable String action,
                             @RequestBody(required = false) Map<String, Object> b, Principal p) {
        Map<String, Object> body = b == null ? new HashMap<>() : b;
        String note = body.get("note") == null ? "" : String.valueOf(body.get("note"));
        if ("approve".equals(action)) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> lines =
                    (List<Map<String, Object>>) body.getOrDefault("lines", List.of());
            return svc.toRow(svc.approveWithLines("stock-issue-request", id, note, lines, principalName(p)));
        }
        return svc.toRow(svc.action("stock-issue-request", id, action, note, principalName(p)));
    }

    @GetMapping("/stock-issue-request/export")
    ResponseEntity<byte[]> sirE(@RequestParam Map<String, String> q) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows =
                (List<Map<String, Object>>) svc.list("stock-issue-request", q).getOrDefault("content", List.of());
        return fileResponse(export.build(rows, q.getOrDefault("format", "xlsx"), "stock-issue-request"),
                q.getOrDefault("format", "xlsx"), "stock-issue-request");
    }

    /** Printable PDF of a single delivery challan (inline for print, attachment when download=true). */
    @GetMapping("/delivery-challan/{type}/{id}/print")
    ResponseEntity<byte[]> printDc(@PathVariable String type, @PathVariable Long id,
                                   @RequestParam(defaultValue = "false") boolean download) {
        Map<String, Object> row = svc.toRow(svc.get(type, id));
        String docNo = String.valueOf(row.getOrDefault("docNo", type)).replaceAll("[^A-Za-z0-9_-]", "_");
        String disposition = download ? "attachment" : "inline";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition + "; filename=\"" + docNo + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(printer.deliveryChallan(row, type));
    }

    /** Printable PDF of a GRN / Store Receipt (inline for print, attachment when download=true). */
    @GetMapping({"/store-receipt/{type}/{id}/print"})
    ResponseEntity<byte[]> printGrn(@PathVariable String type, @PathVariable Long id,
                                    @RequestParam(defaultValue = "false") boolean download) {
        Map<String, Object> row = svc.getRow(type, id);
        String docNo = String.valueOf(row.getOrDefault("docNo", type)).replaceAll("[^A-Za-z0-9_-]", "_");
        String disposition = download ? "attachment" : "inline";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition + "; filename=\"" + docNo + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(printer.grn(row));
    }

    /** Generic printable PDF for any inventory document type. */
    @GetMapping({
            "/documents/{type}/{id}/print",
            "/stock-issue/{type}/{id}/print",
            "/supplier-invoice/{type}/{id}/print",
            "/return-management/{type}/{id}/print",
            "/allotment/{type}/{id}/print",
            "/adjustment/{type}/{id}/print"})
    ResponseEntity<byte[]> printGeneric(@PathVariable String type, @PathVariable Long id,
                                         @RequestParam(defaultValue = "false") boolean download) {
        Map<String, Object> row = svc.getRow(type, id);
        String docNo = String.valueOf(row.getOrDefault("docNo", type)).replaceAll("[^A-Za-z0-9_-]", "_");
        String disposition = download ? "attachment" : "inline";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition + "; filename=\"" + docNo + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(printer.salesDoc(row, type));
    }

    /** Printable PDF for stock-issue-request. */
    @GetMapping("/stock-issue-request/{id}/print")
    ResponseEntity<byte[]> printSir(@PathVariable Long id,
                                     @RequestParam(defaultValue = "false") boolean download) {
        Map<String, Object> row = svc.getRow("stock-issue-request", id);
        String docNo = String.valueOf(row.getOrDefault("docNo", "stock-issue-request")).replaceAll("[^A-Za-z0-9_-]", "_");
        String disposition = download ? "attachment" : "inline";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition + "; filename=\"" + docNo + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(printer.salesDoc(row, "stock-issue-request"));
    }

    /** Uploads up to 3 attachment files for a supplier invoice (purchase / subcontract). */
    @PostMapping("/supplier-invoice/{type}/{id}/attachments")
    Map<String, Object> uploadAttachments(@PathVariable String type, @PathVariable Long id,
                                          @RequestParam("files") MultipartFile[] files) throws Exception {
        if (files == null || files.length == 0)
            throw new IllegalArgumentException("No file selected");
        int room = DocumentFacade.MAX_ATTACHMENTS - svc.attachmentsMeta(type, id).size();
        if (room <= 0 || files.length > room)
            throw new IllegalArgumentException("Maximum " + DocumentFacade.MAX_ATTACHMENTS
                    + " attachments allowed");
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty())
                throw new IllegalArgumentException("No file selected");
            if (file.getSize() > 10 * 1024 * 1024)
                throw new IllegalArgumentException("File '" + file.getOriginalFilename()
                        + "' exceeds 10 MB limit");
            svc.addAttachment(type, id, file.getOriginalFilename(), file.getBytes());
        }
        return svc.getRow(type, id);
    }

    /** Lists the attachment metadata (id + fileName) of a supplier invoice. */
    @GetMapping("/supplier-invoice/{type}/{id}/attachments")
    List<Map<String, Object>> listAttachments(@PathVariable String type, @PathVariable Long id) {
        return svc.attachmentsMeta(type, id);
    }

    /** Downloads one attachment of a supplier invoice. */
    @GetMapping("/supplier-invoice/{type}/{id}/attachments/{attachmentId}")
    ResponseEntity<byte[]> downloadAttachment(@PathVariable String type, @PathVariable Long id,
                                              @PathVariable Long attachmentId) {
        DocumentFacade.AttachmentInfo a = svc.attachment(type, id, attachmentId);
        String safe = a.name().replaceAll("[^A-Za-z0-9._-]", "_");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + safe + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(a.data());
    }

    /** Removes one attachment of a supplier invoice. */
    @DeleteMapping("/supplier-invoice/{type}/{id}/attachments/{attachmentId}")
    Map<String, Object> removeAttachment(@PathVariable String type, @PathVariable Long id,
                                         @PathVariable Long attachmentId) {
        svc.removeAttachment(type, id, attachmentId);
        return svc.getRow(type, id);
    }

    private ResponseEntity<byte[]> fileResponse(byte[] bytes, String format, String title) {
        MediaType media = "pdf".equalsIgnoreCase(format)
                ? MediaType.APPLICATION_PDF
                : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        String ext = "pdf".equalsIgnoreCase(format) ? "pdf" : "xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + title.replace("/", "_") + "." + ext + "\"")
                .contentType(media)
                .body(bytes);
    }
}
