package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.SpcAnalyticsService;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequirePermission(module = "QUALITY", screen = "SPC", action = "VIEW")
@RequiredArgsConstructor
public class SpcController {

    private final SpcAnalyticsService spcService;

    /** §6.6: X-bar chart data + control limits for a characteristic. */
    @GetMapping("/api/v1/quality/spc/xbar")
    public Map<String, Object> xbarChart(
            @RequestParam String itemCode,
            @RequestParam String characteristicCode,
            @RequestParam(defaultValue = "50") int lastN) {
        return spcService.getXBarChart(itemCode, characteristicCode, lastN);
    }

    /** §6.6: Process capability (Cp/Cpk) for a characteristic. */
    @GetMapping("/api/v1/quality/spc/capability")
    public Map<String, Object> capability(
            @RequestParam String itemCode,
            @RequestParam String characteristicCode) {
        return spcService.getXBarChart(itemCode, characteristicCode, 100);
    }

    /** §6.6: Basic statistics (pass/fail/yield/min/max). */
    @GetMapping("/api/v1/quality/spc/stats")
    public Map<String, Object> stats(
            @RequestParam String itemCode,
            @RequestParam String characteristicCode) {
        return spcService.getStats(itemCode, characteristicCode);
    }

    /** §6.6: List measurable characteristics for an item (for SPC dropdown). */
    @GetMapping("/api/v1/quality/spc/characteristics")
    public List<Map<String, Object>> characteristics(@RequestParam String itemCode) {
        return spcService.getCharacteristicsForItem(itemCode);
    }
}
