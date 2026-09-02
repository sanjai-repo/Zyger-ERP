package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.doc.DocTypes;
import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.ItemRepository;
import in.zygertechnology.zygererp.repo.LedgerRepository;
import in.zygertechnology.zygererp.service.DocumentFacade;
import in.zygertechnology.zygererp.service.ExportService;
import in.zygertechnology.zygererp.service.StockService;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController @RequiredArgsConstructor
@RequirePermission(module = "REPORTS", screen = "*", action = "VIEW")
public class ReportController {

    private final DocumentFacade docs;
    private final StockService stock;
    private final ItemRepository items;
    private final LedgerRepository ledger;
    private final ExportService export;

    private static final String[] INWARD_KEYS = {"po-inward", "lo-inward", "jo-inward", "general-inward"};
    private static final String[] INWARD_LABELS = {"PO_INWARD", "LO_INWARD", "JO_INWARD", "GENERAL_INWARD"};

    @GetMapping("/api/inventory/dashboard/summary")
    Map<String, Object> dashboard() {
        Map<String, StockService.Balance> bal = stock.balances();
        double onHand = 0, reserved = 0, available = 0;
        for (StockService.Balance b : bal.values()) {
            onHand += b.onHand();
            reserved += b.reserved();
            available += b.available();
        }
        long pendingInward = 0, pendingApproval = 0;
        for (DocEntity d : docs.findAll("po-inward")) {
            if ("SUBMITTED".equals(d.getStatus())) pendingApproval++;
            if (List.of("SUBMITTED", "APPROVED").contains(d.getStatus())) pendingInward++;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalOnHand", round(onHand));
        m.put("reservedQty", round(reserved));
        m.put("availableQty", round(available));
        m.put("lowStockCount", lowStockItems().size());
        m.put("pendingInwardCount", pendingInward);
        m.put("pendingApprovalCount", pendingApproval);
        m.put("ledgerEntryCount", ledger.count());
        return m;
    }

    @GetMapping("/api/inventory-transactions")
    Map<String, Object> transactions(@RequestParam Map<String, String> q) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (StockLedger e : ledger.findTop8ByOrderByTxDateDesc()) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", e.getId());
            r.put("date", e.getTxDate() == null ? "" : e.getTxDate().toString());
            r.put("documentNo", e.getDocNo());
            r.put("transactionType", e.getTxType());
            r.put("itemCode", e.getItemCode());
            r.put("inQty", bd(e.getInQty()));
            r.put("outQty", bd(e.getOutQty()));
            rows.add(r);
        }
        return docs.paginate(rows, q);
    }

    @GetMapping("/api/inventory/low-stock")
    Map<String, Object> lowStock(@RequestParam Map<String, String> q) {
        return docs.paginate(lowStockItems().stream()
                .map(m -> { m.put("id", m.get("itemCode")); return m; })
                .collect(Collectors.toList()), q);
    }

    private List<Map<String, Object>> lowStockItems() {
        Map<String, Double> onHand = new LinkedHashMap<>();
        for (StockService.Balance b : stock.balances().values())
            onHand.merge(b.item(), b.onHand(), Double::sum);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ItemMaster it : items.findAll()) {
            double qty = onHand.getOrDefault(it.getCode(), 0d);
            double safety = it.getSafetyStock() == null ? 0 : it.getSafetyStock().doubleValue();
            if (qty >= safety) continue;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("itemCode", it.getCode());
            r.put("itemName", it.getDescription());
            r.put("onHandQty", round(qty));
            r.put("safetyQty", safety);
            out.add(r);
        }
        return out;
    }

    @GetMapping("/api/inventory/inward/dashboard")
    Map<String, Object> inwardDashboard(@RequestParam(required = false) String fromDate,
                                        @RequestParam(required = false) String toDate) {
        Map<String, double[]> acc = new LinkedHashMap<>();
        acc.put("total", new double[3]);
        for (String key : INWARD_KEYS) acc.put(key, new double[3]);
        for (String key : INWARD_KEYS) {
            for (DocEntity d : docs.findAll(key)) {
                if (!"POSTED".equals(d.getStatus())) continue;
                if (outOfRange(d, fromDate, toDate)) continue;
                double qty = d.getLines().stream().mapToDouble(l -> l.getQty().doubleValue()).sum();
                double amt = d.getLines().stream()
                        .mapToDouble(l -> (l.getRate() == null ? 0 : l.getRate().doubleValue()) * l.getQty().doubleValue()).sum();
                acc.get("total")[0] += 1;
                acc.get("total")[1] += qty;
                acc.get("total")[2] += amt;
                double[] a = acc.get(key);
                a[0] += 1; a[1] += qty; a[2] += amt;
            }
        }
        Map<String, Object> byType = new LinkedHashMap<>();
        for (int i = 0; i < INWARD_KEYS.length; i++)
            byType.put(INWARD_LABELS[i], slice(acc.get(INWARD_KEYS[i])));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", slice(acc.get("total")));
        m.put("byType", byType);

        double[] pendingAcc = new double[3];
        for (String key : INWARD_KEYS) {
            for (DocEntity d : docs.findAll(key)) {
                if (!List.of("SUBMITTED", "APPROVED").contains(d.getStatus())) continue;
                double qty = d.getLines().stream().mapToDouble(l -> l.getQty().doubleValue()).sum();
                double amt = d.getLines().stream()
                        .mapToDouble(l -> (l.getRate() == null ? 0 : l.getRate().doubleValue()) * l.getQty().doubleValue()).sum();
                pendingAcc[0] += 1; pendingAcc[1] += qty; pendingAcc[2] += amt;
            }
        }
        m.put("pending", slice(pendingAcc));
        return m;
    }

    @GetMapping("/api/inventory/inward/log")
    List<Map<String, Object>> inwardLog() {
        return inwardRows(Set.of("DRAFT", "SUBMITTED", "APPROVED", "POSTED", "REJECTED", "CANCELLED"));
    }

    @GetMapping("/api/inventory/inward/pending")
    List<Map<String, Object>> inwardPending() {
        return inwardRows(Set.of("SUBMITTED", "APPROVED"));
    }

    private List<Map<String, Object>> inwardRows(Set<String> statuses) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < INWARD_KEYS.length; i++) {
            for (DocEntity d : docs.findAll(INWARD_KEYS[i])) {
                if (statuses != null && !statuses.contains(d.getStatus())) continue;
                Map<String, Object> r = docs.toRow(d);
                r.put("type", INWARD_LABELS[i]);
                out.add(r);
            }
        }
        out.sort((a, b) -> {
            String da = String.valueOf(a.get("date"));
            String db = String.valueOf(b.get("date"));
            int c = db.compareTo(da);
            if (c != 0) return c;
            long ia = ((Number) a.get("id")).longValue();
            long ib = ((Number) b.get("id")).longValue();
            return Long.compare(ib, ia);
        });
        return out;
    }

    @GetMapping("/api/inventory/inward/chart")
    List<Map<String, Object>> inwardChart(@RequestParam(required = false) String fromDate,
                                          @RequestParam(required = false) String toDate,
                                          @RequestParam(defaultValue = "COUNT") String metric) {
        Map<String, double[]> acc = new TreeMap<>();
        for (String key : INWARD_KEYS) {
            for (DocEntity d : docs.findAll(key)) {
                if (!"POSTED".equals(d.getStatus())) continue;
                if (outOfRange(d, fromDate, toDate)) continue;
                double qty = d.getLines().stream().mapToDouble(l -> l.getQty().doubleValue()).sum();
                double amt = d.getLines().stream()
                        .mapToDouble(l -> (l.getRate() == null ? 0 : l.getRate().doubleValue()) * l.getQty().doubleValue()).sum();
                double v = switch (metric) {
                    case "QTY" -> qty;
                    case "AMOUNT" -> amt;
                    default -> 1;
                };
                double[] a = acc.computeIfAbsent(String.valueOf(d.getDocDate()), x -> new double[4]);
                a[Arrays.asList(INWARD_KEYS).indexOf(key)] += v;
            }
        }
        List<Map<String, Object>> out = new ArrayList<>();
        acc.forEach((date, a) -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("date", date);
            for (int i = 0; i < INWARD_KEYS.length; i++) r.put(INWARD_LABELS[i], round(a[i]));
            out.add(r);
        });
        return out;
    }

    @GetMapping("/api/inventory/reports/overview")
    Map<String, Object> overview(@RequestParam(required = false) String fromDate,
                                 @RequestParam(required = false) String toDate) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("kpis", kpis());
        out.put("monthlyStatus", monthlyStatus());
        out.put("categoryDistribution", categoryDistribution());
        out.put("locationDistribution", locationDistribution());
        out.put("inwardIssueTrend", trend());
        out.put("topItemsByValue", topItems());
        return out;
    }

    @GetMapping("/api/inventory/reports/stock-ledger")
    Map<String, Object> stockLedger(@RequestParam Map<String, String> q) {
        return docs.paginate(ledgerRows(q), q);
    }

    @GetMapping("/api/inventory/reports/current-stock")
    Map<String, Object> currentStock(@RequestParam Map<String, String> q) {
        return docs.paginate(currentStockRows(q), q);
    }

    @GetMapping("/api/inventory/reports/drilldown/{type}")
    Map<String, Object> drilldown(@PathVariable String type, @RequestParam Map<String, String> q) {
        return docs.paginate(drilldownRows(type, q), q);
    }

    @GetMapping("/api/inventory/reports/drilldown/{type}/export")
    ResponseEntity<byte[]> drilldownExport(@PathVariable String type, @RequestParam Map<String, String> q) {
        return file(export.build(drilldownRows(type, q), q.getOrDefault("format", "xlsx"), type), q.getOrDefault("format", "xlsx"), type);
    }

    @GetMapping("/api/inventory/reports/stock-ledger/export")
    ResponseEntity<byte[]> ledgerExport(@RequestParam Map<String, String> q) {
        return file(export.build(ledgerRows(q), q.getOrDefault("format", "xlsx"), "stock-ledger"),
                q.getOrDefault("format", "xlsx"), "stock-ledger");
    }

    @GetMapping("/api/inventory/reports/current-stock/export")
    ResponseEntity<byte[]> currentExport(@RequestParam Map<String, String> q) {
        return file(export.build(currentStockRows(q), q.getOrDefault("format", "xlsx"), "current-stock"),
                q.getOrDefault("format", "xlsx"), "current-stock");
    }

    @GetMapping("/api/inventory/reports/stock-summary")
    Map<String, Object> stockSummary() {
        Map<String, StockService.Balance> bal = stock.balances();
        Map<String, Double> onHand = new LinkedHashMap<>();
        Map<String, Double> available = new LinkedHashMap<>();
        for (StockService.Balance b : bal.values()) {
            onHand.merge(b.item(), b.onHand(), Double::sum);
            available.merge(b.item(), b.available(), Double::sum);
        }
        Map<String, double[]> byGroup = new LinkedHashMap<>();
        for (ItemMaster it : items.findAll()) {
            String g = groupName(it);
            double oh = onHand.getOrDefault(it.getCode(), 0d);
            double avail = available.getOrDefault(it.getCode(), 0d);
            double safety = it.getSafetyStock() == null ? 0 : it.getSafetyStock().doubleValue();
            double rate = it.getDefaultRate() == null ? 0 : it.getDefaultRate().doubleValue();
            double[] a = byGroup.computeIfAbsent(g, x -> new double[6]);
            a[0] += 1;                             // itemCount
            a[1] += oh;                            // qtyOnHand
            a[2] += oh * rate;                     // value
            if (avail <= 0) a[3] += 1;             // notAvailableCount
            if (oh < safety) a[4] += 1;            // lowStockCount
            a[5] += avail;                         // qtyAvailable
        }
        List<Map<String, Object>> groups = new ArrayList<>();
        double[] totals = new double[6];
        for (Map.Entry<String, double[]> en : byGroup.entrySet()) {
            Map<String, Object> r = new LinkedHashMap<>();
            double[] a = en.getValue();
            r.put("group", en.getKey());
            r.put("itemCount", (long) a[0]);
            r.put("qtyOnHand", round(a[1]));
            r.put("qtyAvailable", round(a[5]));
            r.put("value", round(a[2]));
            r.put("notAvailableCount", (long) a[3]);
            r.put("lowStockCount", (long) a[4]);
            for (int i = 0; i < 6; i++) totals[i] += a[i];
            groups.add(r);
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("groups", groups);
        m.put("totals", Map.of(
                "itemCount", (long) totals[0],
                "qtyOnHand", round(totals[1]),
                "qtyAvailable", round(totals[5]),
                "value", round(totals[2]),
                "notAvailableCount", (long) totals[3],
                "lowStockCount", (long) totals[4]));
        m.put("notAvailableItems", notAvailableRows());
        return m;
    }

    private List<Map<String, Object>> notAvailableRows() {
        Map<String, StockService.Balance> bal = stock.balances();
        Map<String, Double> available = new LinkedHashMap<>();
        for (StockService.Balance b : bal.values())
            available.merge(b.item(), b.available(), Double::sum);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ItemMaster it : items.findAll()) {
            double avail = available.getOrDefault(it.getCode(), 0d);
            if (avail > 0) continue;
            out.add(itemSummaryRow(it, 0));
        }
        return out;
    }

    private Map<String, Object> itemSummaryRow(ItemMaster it, double avail) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("itemCode", it.getCode());
        r.put("itemName", it.getDescription());
        r.put("category", str(it.getCategory()));
        r.put("itemType", str(it.getItemType()));
        r.put("itemGroup", str(groupName(it)));
        r.put("uom", str(it.getUom()));
        r.put("defaultWarehouse", str(it.getDefaultWarehouse()));
        r.put("available", round(avail));
        r.put("status", avail <= 0 ? "NOT_AVAILABLE" : "AVAILABLE");
        return r;
    }

    private String groupName(ItemMaster it) {
        if (it == null) return "Uncategorized";
        ItemGroup g = it.getItemGroup();
        if (g == null) return "Uncategorized";
        String nm = g.getName();
        if (nm == null || nm.isBlank()) nm = g.getCode();
        return nm == null || nm.isBlank() ? "Uncategorized" : nm;
    }

    @GetMapping("/api/inventory/reports/simple")
    Map<String, Object> simple() {
        Map<String, Object> summary = stockSummary();
        @SuppressWarnings("unchecked")
        Map<String, Object> totals = (Map<String, Object>) summary.get("totals");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> groups = (List<Map<String, Object>>) summary.get("groups");
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totals", totals);
        m.put("groups", groups);
        m.put("reorderList", lowStockItems());
        return m;
    }

    @GetMapping("/api/inventory/reports/not-available")
    Map<String, Object> notAvailable(@RequestParam Map<String, String> q) {
        return docs.paginate(notAvailableRows(), q);
    }

    @GetMapping("/api/inventory/reports/simple/export")
    ResponseEntity<byte[]> simpleExport(@RequestParam(defaultValue = "pdf") String format) {
        List<Map<String, Object>> rows = simpleExportRows();
        return file(export.build(rows, format, "stock-snapshot"), format, "stock-snapshot");
    }

    private List<Map<String, Object>> simpleExportRows() {
        Map<String, Object> simple = simple();
        @SuppressWarnings("unchecked")
        Map<String, Object> t = (Map<String, Object>) simple.get("totals");
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(Map.of("Section", "STOCK SNAPSHOT", "Item", "", "Qty", "", "Value", ""));
        rows.add(Map.of("Section", "Total items", "Item", t.get("itemCount"), "Qty", "", "Value", ""));
        rows.add(Map.of("Section", "Total quantity in store", "Item", "", "Qty", t.get("qtyOnHand"), "Value", ""));
        rows.add(Map.of("Section", "Total stock value", "Item", "", "Qty", "", "Value", t.get("value")));
        rows.add(Map.of("Section", "Items not available", "Item", t.get("notAvailableCount"), "Qty", "", "Value", ""));
        rows.add(Map.of("Section", "Low stock items", "Item", t.get("lowStockCount"), "Qty", "", "Value", ""));
        rows.add(Map.of("Section", "", "Item", "", "Qty", "", "Value", ""));
        rows.add(Map.of("Section", "GROUP WISE BREAKDOWN", "Item", "", "Qty", "", "Value", ""));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> groups = (List<Map<String, Object>>) simple.get("groups");
        for (Map<String, Object> g : groups) {
            rows.add(Map.of("Section", "  " + g.get("group"),
                    "Item", g.get("itemCount"),
                    "Qty", g.get("qtyOnHand"),
                    "Value", g.get("value")));
        }
        return rows;
    }

    private List<Map<String, Object>> drilldownRows(String type, Map<String, String> q) {
        return switch (type) {
            case "current-stock" -> currentStockRows(q);
            case "low-stock" -> lowStockRows();
            case "not-available" -> notAvailableRows();
            case "reservations" -> reservationRows();
            case "pending-inward" -> pendingRows(false, q);
            case "pending-approvals" -> pendingRows(true, q);
            case "inventory-log" -> ledgerRows(q);
            default -> {
                if (!docs.isRegistered(type))
                    throw new IllegalArgumentException("Unknown report type: " + type);
                List<Map<String, Object>> rows = new ArrayList<>();
                for (DocEntity d : docs.findAll(type)) {
                    if (!inRange(d.getDocDate(), q.get("fromDate"), q.get("toDate"))) continue;
                    Map<String, Object> r = docs.toRow(d);
                    r.put("docType", label(type));
                    rows.add(r);
                }
                yield rows;
            }
        };
    }

    private List<Map<String, Object>> ledgerRows(Map<String, String> q) {
        List<Map<String, Object>> rows = new ArrayList<>();
        double run = 0;
        for (StockLedger e : ledger.findAllByOrderByTxDateAsc()) {
            if (!inRange(e.getTxDate(), q.get("fromDate"), q.get("toDate"))) continue;
            if (!isEmpty(q.get("itemCode")) && !q.get("itemCode").equals(e.getItemCode())) continue;
            if (!isEmpty(q.get("location")) && !q.get("location").equals(e.getLocation())) continue;
            if (!isEmpty(q.get("txType")) && !q.get("txType").equalsIgnoreCase(e.getTxType())) continue;
            double in = bd(e.getInQty());
            double out = bd(e.getOutQty());
            run += in - out;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", e.getId());
            r.put("date", e.getTxDate() == null ? "" : e.getTxDate().toString());
            r.put("docNo", e.getDocNo());
            r.put("txType", e.getTxType());
            r.put("itemCode", e.getItemCode());
            r.put("itemName", items.findByCode(e.getItemCode())
                    .map(ItemMaster::getDescription).orElse(""));
            r.put("location", e.getLocation());
            r.put("batchNo", e.getBatchNo());
            r.put("inQty", round(in));
            r.put("outQty", round(out));
            r.put("runningBalance", round(run));
            rows.add(r);
        }
        return rows;
    }

    private List<Map<String, Object>> currentStockRows(Map<String, String> q) {
        List<Map<String, Object>> rows = new ArrayList<>();
        boolean includeZero = "true".equals(q.get("includeZero"));
        Set<String> seenItems = new LinkedHashSet<>();
        long n = 0;
        for (Map.Entry<String, StockService.Balance> en : stock.balances().entrySet()) {
            StockService.Balance b = en.getValue();
            if (b.onHand() <= 0 && b.reserved() <= 0) continue;
            if (!isEmpty(q.get("location")) && !q.get("location").equals(b.loc())) continue;
            if (!isEmpty(q.get("itemCode")) && !q.get("itemCode").equals(b.item())) continue;
            ItemMaster it = items.findByCode(b.item()).orElse(null);
            boolean low = it != null && b.onHand() < (it.getSafetyStock() == null ? 0 : it.getSafetyStock().doubleValue());
            if ("true".equals(q.get("lowStockOnly")) && !low) continue;
            double rate = it == null || it.getDefaultRate() == null ? 0 : it.getDefaultRate().doubleValue();
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", "s" + (++n));
            r.put("itemCode", b.item());
            r.put("itemName", it == null ? "" : it.getDescription());
            r.put("category", it == null ? "" : it.getCategory());
            r.put("itemType", it == null ? "" : str(it.getItemType()));
            r.put("itemGroup", it == null ? "" : groupName(it));
            r.put("uom", it == null ? "" : it.getUom());
            r.put("location", b.loc());
            r.put("batchNo", b.batch());
            r.put("heatNo", b.heat());
            r.put("onHand", round(b.onHand()));
            r.put("reserved", round(b.reserved()));
            r.put("qcHold", round(b.qcHold()));
            r.put("available", round(b.available()));
            r.put("rate", rate);
            r.put("value", round(b.onHand() * rate));
            r.put("safetyStock", it == null ? 0 : round(it.getSafetyStock() == null ? 0 : it.getSafetyStock().doubleValue()));
            r.put("reorderPoint", it == null ? 0 : (it.getReorderPoint() == null ? 0 : round(it.getReorderPoint().doubleValue())));
            r.put("lowStock", low);
            r.put("status", availabilityStatus(b.onHand(), b.available(), low));
            rows.add(r);
            seenItems.add(b.item());
        }
        if (includeZero) {
            Map<String, StockService.Balance> bal = stock.balances();
            Map<String, Double> onByItem = new HashMap<>();
            Map<String, Double> availByItem = new HashMap<>();
            for (StockService.Balance b : bal.values()) {
                onByItem.merge(b.item(), b.onHand(), Double::sum);
                availByItem.merge(b.item(), b.available(), Double::sum);
            }
            Set<String> withStock = new LinkedHashSet<>(onByItem.keySet());
            for (ItemMaster it : items.findAll()) {
                if (hasStockOnHand(it.getCode(), onByItem)) continue;
                if (withStock.contains(it.getCode())) continue;
                if (seenItems.contains(it.getCode())) continue;
                if (!isEmpty(q.get("location"))) continue;
                if ("true".equals(q.get("lowStockOnly"))) continue;
                double rate = it.getDefaultRate() == null ? 0 : it.getDefaultRate().doubleValue();
                double safety = it.getSafetyStock() == null ? 0 : it.getSafetyStock().doubleValue();
                boolean low = 0 < safety;
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("id", "z" + (++n));
                r.put("itemCode", it.getCode());
                r.put("itemName", it.getDescription());
                r.put("category", str(it.getCategory()));
                r.put("itemType", str(it.getItemType()));
                r.put("itemGroup", groupName(it));
                r.put("uom", str(it.getUom()));
                r.put("location", it.getDefaultWarehouse() == null ? "" : it.getDefaultWarehouse());
                r.put("batchNo", "");
                r.put("heatNo", "");
                r.put("onHand", 0d);
                r.put("reserved", 0d);
                r.put("qcHold", 0d);
                r.put("available", 0d);
                r.put("rate", rate);
                r.put("value", 0d);
                r.put("safetyStock", round(safety));
                r.put("reorderPoint", it.getReorderPoint() == null ? 0 : round(it.getReorderPoint().doubleValue()));
                r.put("lowStock", low);
                r.put("status", "NOT_AVAILABLE");
                rows.add(r);
            }
        }
        return rows;
    }

    private boolean hasStockOnHand(String item, Map<String, Double> onByItem) {
        Double v = onByItem.get(item);
        return v != null && v > 0;
    }

    private String availabilityStatus(double onHand, double available, boolean low) {
        if (available <= 0 && onHand <= 0) return "NOT_AVAILABLE";
        if (low) return "LOW";
        return "AVAILABLE";
    }

    private List<Map<String, Object>> lowStockRows() {
        Map<String, Double> onHand = new LinkedHashMap<>();
        for (StockService.Balance b : stock.balances().values())
            onHand.merge(b.item(), b.onHand(), Double::sum);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ItemMaster it : items.findAll()) {
            double qty = onHand.getOrDefault(it.getCode(), 0d);
            double safety = it.getSafetyStock() == null ? 0 : it.getSafetyStock().doubleValue();
            if (qty >= safety) continue;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", it.getCode());
            r.put("itemCode", it.getCode());
            r.put("itemName", it.getDescription());
            r.put("location", "");
            r.put("onHand", round(qty));
            r.put("safetyQty", safety);
            r.put("shortage", round(safety - qty));
            out.add(r);
        }
        return out;
    }

    private List<Map<String, Object>> reservationRows() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (DocEntity a : docs.findAll("stock-allotment")) {
            if (!"APPROVED".equals(a.getStatus())) continue;
            Map<String, Object> r = docs.toRow(a);
            r.put("reservedQty", r.get("qty"));
            r.put("docType", "STOCK_ALLOTMENT");
            out.add(r);
        }
        return out;
    }

    private List<Map<String, Object>> pendingRows(boolean approvalsOnly, Map<String, String> q) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (String key : docs.keys()) {
            DocTypes.Effect eff = DocTypes.get(key).effect();
            if (approvalsOnly) {
                if (eff == DocTypes.Effect.NONE) continue;
            } else {
                if (eff != DocTypes.Effect.IN) continue;
            }
            for (DocEntity d : docs.findAll(key)) {
                boolean ok = approvalsOnly ? "SUBMITTED".equals(d.getStatus())
                        : List.of("DRAFT", "SUBMITTED", "APPROVED").contains(d.getStatus());
                if (!ok) continue;
                if (!inRange(d.getDocDate(), q.get("fromDate"), q.get("toDate"))) continue;
                Map<String, Object> r = docs.toRow(d);
                r.put("docType", label(key));
                out.add(r);
            }
        }
        return out;
    }

    private String label(String key) {
        return key.replace('-', '_').toUpperCase();
    }

    private Map<String, Object> kpis() {
        Map<String, Object> k = new LinkedHashMap<>();
        Map<String, StockService.Balance> bal = stock.balances();
        double onHand = 0, reserved = 0, available = 0;
        for (StockService.Balance b : bal.values()) {
            onHand += b.onHand();
            reserved += b.reserved();
            available += b.available();
        }
        k.put("totalOnHand", round(onHand));
        k.put("stockValue", round(valueOf(bal)));
        k.put("reserved", round(reserved));
        k.put("available", round(available));
        k.put("lowStockCount", lowStockItems().size());
        k.put("pendingInward", docs.count("po-inward"));
        k.put("pendingApprovals", docs.countAll());
        k.put("ledgerEntries", ledger.count());
        k.put("accuracyPct", 100);
        return k;
    }

    private List<Map<String, Object>> monthlyStatus() {
        Map<String, double[]> acc = new TreeMap<>();
        double run = 0;
        for (StockLedger e : ledger.findAllByOrderByTxDateAsc()) {
            String m = String.valueOf(e.getTxDate()).substring(0, 7);
            double[] a = acc.computeIfAbsent(m, x -> new double[3]);
            a[0] += bd(e.getInQty());
            a[1] += bd(e.getOutQty());
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map.Entry<String, double[]> en : acc.entrySet()) {
            run += en.getValue()[0] - en.getValue()[1];
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("month", en.getKey());
            r.put("received", round(en.getValue()[0]));
            r.put("issued", round(en.getValue()[1]));
            r.put("onHand", round(run));
            out.add(r);
        }
        return out;
    }

    private List<Map<String, Object>> categoryDistribution() {
        Map<String, Double> acc = new LinkedHashMap<>();
        Map<String, StockService.Balance> bal = stock.balances();
        Map<String, Double> onHand = new LinkedHashMap<>();
        for (StockService.Balance b : bal.values())
            onHand.merge(b.item(), b.onHand(), Double::sum);
        for (Map.Entry<String, Double> e : onHand.entrySet()) {
            ItemMaster it = items.findByCode(e.getKey()).orElse(null);
            double rate = it == null || it.getDefaultRate() == null ? 0 : it.getDefaultRate().doubleValue();
            String cat = it == null || it.getCategory() == null || it.getCategory().isEmpty()
                    ? "Uncategorized" : it.getCategory();
            acc.merge(cat, e.getValue() * rate, Double::sum);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        acc.forEach((k, v) -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("category", k);
            r.put("value", round(v));
            out.add(r);
        });
        return out;
    }

    private List<Map<String, Object>> locationDistribution() {
        Map<String, Double> acc = new LinkedHashMap<>();
        for (StockService.Balance b : stock.balances().values())
            acc.merge(b.loc().isEmpty() ? "Unassigned" : b.loc(), b.onHand(), Double::sum);
        List<Map<String, Object>> out = new ArrayList<>();
        acc.forEach((k, v) -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("location", k);
            r.put("onHand", round(v));
            out.add(r);
        });
        return out;
    }

    private List<Map<String, Object>> trend() {
        Map<String, double[]> acc = new TreeMap<>();
        for (StockLedger e : ledger.findAllByOrderByTxDateAsc()) {
            String d = String.valueOf(e.getTxDate());
            double[] a = acc.computeIfAbsent(d, x -> new double[2]);
            a[0] += bd(e.getInQty());
            a[1] += bd(e.getOutQty());
        }
        List<Map<String, Object>> out = new ArrayList<>();
        acc.forEach((k, v) -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("date", k);
            r.put("inward", round(v[0]));
            r.put("issued", round(v[1]));
            out.add(r);
        });
        return out;
    }

    private List<Map<String, Object>> topItems() {
        Map<String, StockService.Balance> bal = stock.balances();
        Map<String, Double> onHand = new LinkedHashMap<>();
        for (StockService.Balance b : bal.values())
            onHand.merge(b.item(), b.onHand(), Double::sum);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<String, Double> e : onHand.entrySet()) {
            ItemMaster it = items.findByCode(e.getKey()).orElse(null);
            double rate = it == null || it.getDefaultRate() == null ? 0 : it.getDefaultRate().doubleValue();
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("itemCode", e.getKey());
            r.put("itemName", it == null ? "" : it.getDescription());
            r.put("value", round(e.getValue() * rate));
            rows.add(r);
        }
        rows.sort((a, b) -> Double.compare((double) b.get("value"), (double) a.get("value")));
        return rows.stream().limit(5).collect(Collectors.toList());
    }

    private double valueOf(Map<String, StockService.Balance> bal) {
        Map<String, Double> onHand = new LinkedHashMap<>();
        for (StockService.Balance b : bal.values())
            onHand.merge(b.item(), b.onHand(), Double::sum);
        double v = 0;
        for (Map.Entry<String, Double> e : onHand.entrySet()) {
            ItemMaster it = items.findByCode(e.getKey()).orElse(null);
            v += e.getValue() * (it == null || it.getDefaultRate() == null ? 0 : it.getDefaultRate().doubleValue());
        }
        return v;
    }

    private double bd(BigDecimal v) { return v == null ? 0 : v.doubleValue(); }

    private Map<String, Object> slice(double[] a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("count", (long) a[0]);
        m.put("qty", round(a[1]));
        m.put("amount", round(a[2]));
        return m;
    }

    private boolean outOfRange(DocEntity d, String from, String to) {
        LocalDate dd = d.getDocDate();
        if (dd == null) return true;
        if (!isEmpty(from) && dd.isBefore(LocalDate.parse(from))) return true;
        if (!isEmpty(to) && dd.isAfter(LocalDate.parse(to))) return true;
        return false;
    }

    private boolean inRange(LocalDate d, String from, String to) {
        if (d == null) return false;
        if (!isEmpty(from) && d.isBefore(LocalDate.parse(from))) return false;
        if (!isEmpty(to) && d.isAfter(LocalDate.parse(to))) return false;
        return true;
    }

    private boolean isEmpty(String s) { return s == null || s.isEmpty(); }

    private static String str(String s) { return s == null ? "" : s; }

    private double round(double v) { return Math.round(v * 100.0) / 100.0; }

    private ResponseEntity<byte[]> file(byte[] bytes, String format, String title) {
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
