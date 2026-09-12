package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController @RequestMapping("/api/inventory/stock") @RequiredArgsConstructor
@RequirePermission(module = "INVENTORY", screen = "STOCK_BALANCE", action = "VIEW")
public class StockController {
    private final StockService stock;

    @GetMapping("/balance")
    public Map<String,Object> balance(@RequestParam String itemCode,
                                      @RequestParam(required=false) String location,
                                      @RequestParam(required=false) String batchNo) {
        return Map.of("itemCode", itemCode,
                "location", location == null ? "" : location,
                "onHand", stock.onHand(itemCode, location, batchNo),
                "available", stock.available(itemCode, location),
                "qcHold", stock.qcHold(itemCode, location));
    }

    @GetMapping("/summary")
    public Map<String,Object> summary(@RequestParam(required=false) String location) {
        Map<String, StockService.Balance> all = stock.balances();
        double totalOnHand = 0, totalAvailable = 0, totalReserved = 0, totalQcHold = 0;
        for (StockService.Balance b : all.values()) {
            if (location != null && !location.isEmpty() && !b.loc().equals(location)) continue;
            totalOnHand += b.onHand();
            totalAvailable += b.available();
            totalReserved += b.reserved();
            totalQcHold += b.qcHold();
        }
        return Map.of("totalOnHand", totalOnHand, "totalAvailable", totalAvailable,
                "totalReserved", totalReserved, "totalQcHold", totalQcHold);
    }

    @GetMapping("/by-item")
    public List<Map<String,Object>> byItem(@RequestParam String itemCode,
                                           @RequestParam(required=false) String location) {
        Map<String, StockService.Balance> all = stock.balances();
        return all.values().stream()
                .filter(b -> b.item().equals(itemCode)
                        && (location == null || location.isEmpty() || b.loc().equals(location)))
                .map(b -> Map.<String,Object>of(
                        "itemCode", b.item(), "location", b.loc(),
                        "batchNo", b.batch(), "heatNo", b.heat(),
                        "onHand", b.onHand(), "available", b.available(),
                        "reserved", b.reserved(), "qcHold", b.qcHold()))
                .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/availability/check")
    public List<Map<String,Object>> check(@RequestBody Map<String,Object> body) {
        List<Map<String,Object>> lines = (List<Map<String,Object>>) body.getOrDefault("lines", List.of());
        List<Map<String,Object>> out = new ArrayList<>();
        for (Map<String,Object> l : lines) {
            String item = String.valueOf(l.get("itemCode"));
            String loc = String.valueOf(l.get("location"));
            out.add(Map.of("itemCode", item, "location", loc,
                    "availableQty", stock.available(item, loc),
                    "qcHoldQty", stock.qcHold(item, loc)));
        }
        return out;
    }
}
