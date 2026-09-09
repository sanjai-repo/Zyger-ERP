package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.DocEntity;
import in.zygertechnology.zygererp.entity.DocLink;
import in.zygertechnology.zygererp.entity.StockLedger;
import in.zygertechnology.zygererp.repo.LedgerRepository;
import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.service.DocLinkService;
import in.zygertechnology.zygererp.service.DocumentFacade;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.*;

/**
 * DOCUMENT 02 v2.0 §03.3 — Traceability Viewer. Walks doc_links (recorded by
 * DocumentFacade.recordDocLinks) both forward and backward from a seed document,
 * or seeds from stock_ledger when searching by item + batch/heat. Distinct from
 * the existing Production/Quality TraceabilityController, which is a different
 * feature (Sales Order -> Work Order -> Job Card genealogy).
 */
@RestController
@RequirePermission(module = "INVENTORY", screen = "traceability-viewer", action = "VIEW")
public class TraceabilityInventoryController {

    private final DocumentFacade docs;
    private final DocLinkService docLinks;
    private final LedgerRepository ledger;

    public TraceabilityInventoryController(DocumentFacade docs, DocLinkService docLinks, LedgerRepository ledger) {
        this.docs = docs;
        this.docLinks = docLinks;
        this.ledger = ledger;
    }

    private record NodeKey(String type, Long id) {}

    @GetMapping("/api/inventory/traceability")
    Map<String, Object> chain(@RequestParam(required = false) String docType,
                              @RequestParam(required = false) String docNo,
                              @RequestParam(required = false) String itemCode,
                              @RequestParam(required = false) String batchNo,
                              @RequestParam(required = false) String heatNo) {
        Set<NodeKey> seeds = new LinkedHashSet<>();

        if (docType != null && !docType.isBlank() && docNo != null && !docNo.isBlank()) {
            try {
                DocEntity d = docs.getByNumber(docType, docNo);
                seeds.add(new NodeKey(docType, d.getId()));
            } catch (IllegalArgumentException ex) {
                return Map.of("nodes", List.of(), "edges", List.of(), "error", "Document not found: " + docNo);
            }
        } else if (itemCode != null && !itemCode.isBlank()) {
            for (StockLedger l : ledger.findAllByOrderByTxDateAsc()) {
                if (!itemCode.equals(l.getItemCode())) continue;
                if (batchNo != null && !batchNo.isBlank() && !batchNo.equals(l.getBatchNo())) continue;
                if (heatNo != null && !heatNo.isBlank() && !heatNo.equals(l.getHeatNo())) continue;
                try {
                    DocEntity d = docs.getByNumber(l.getDocType(), l.getDocNo());
                    seeds.add(new NodeKey(l.getDocType(), d.getId()));
                } catch (IllegalArgumentException ignored) { }
            }
        } else {
            return Map.of("nodes", List.of(), "edges", List.of(),
                    "error", "Provide either docType+docNo, or itemCode (optionally with batchNo/heatNo)");
        }

        Set<NodeKey> visited = new LinkedHashSet<>(seeds);
        Deque<NodeKey> frontier = new ArrayDeque<>(seeds);
        Set<String> seenEdges = new LinkedHashSet<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        while (!frontier.isEmpty()) {
            NodeKey n = frontier.poll();
            for (DocLink link : docLinks.linksFrom(n.type(), n.id())) {
                NodeKey target = new NodeKey(link.getTargetDocType(), link.getTargetDocId());
                if (seenEdges.add(nodeId(n) + ">" + nodeId(target))) {
                    edges.add(Map.of("from", nodeId(n), "to", nodeId(target)));
                }
                if (visited.add(target)) frontier.add(target);
            }
            for (DocLink link : docLinks.linksTo(n.type(), n.id())) {
                NodeKey source = new NodeKey(link.getSourceDocType(), link.getSourceDocId());
                if (seenEdges.add(nodeId(source) + ">" + nodeId(n))) {
                    edges.add(Map.of("from", nodeId(source), "to", nodeId(n)));
                }
                if (visited.add(source)) frontier.add(source);
            }
        }

        List<Map<String, Object>> nodes = new ArrayList<>();
        for (NodeKey n : visited) {
            Map<String, Object> summary = summarize(n);
            if (summary != null) nodes.add(summary);
        }

        return Map.of("nodes", nodes, "edges", edges);
    }

    private String nodeId(NodeKey n) { return n.type() + ":" + n.id(); }

    /** BR-INV-WF-2: only POSTED documents appear in the genealogy. Returns null to exclude. */
    private Map<String, Object> summarize(NodeKey n) {
        DocEntity d;
        try {
            d = docs.get(n.type(), n.id());
        } catch (Exception ex) {
            return null;
        }
        if (!"POSTED".equals(d.getStatus())) return null;

        Map<String, Object> row = docs.toRow(d);
        BigDecimal qty = BigDecimal.ZERO;
        String location = "", batchNo = "", heatNo = "";
        Object linesObj = row.get("lines");
        if (linesObj instanceof List<?> lines) {
            for (Object lo : lines) {
                if (!(lo instanceof Map<?, ?> line)) continue;
                Object q = line.get("qty");
                if (q instanceof Number num) qty = qty.add(BigDecimal.valueOf(num.doubleValue()));
                if (location.isEmpty() && line.get("location") != null) location = String.valueOf(line.get("location"));
                if (batchNo.isEmpty() && line.get("batchNo") != null) batchNo = String.valueOf(line.get("batchNo"));
                if (heatNo.isEmpty() && line.get("heatNo") != null) heatNo = String.valueOf(line.get("heatNo"));
            }
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("nodeId", nodeId(n));
        m.put("docType", n.type());
        m.put("docNo", d.getDocNo());
        m.put("date", row.get("date"));
        m.put("status", d.getStatus());
        m.put("qty", qty);
        m.put("location", location);
        m.put("batchNo", batchNo);
        m.put("heatNo", heatNo);
        m.put("actor", d.getCreatedBy());
        return m;
    }
}
