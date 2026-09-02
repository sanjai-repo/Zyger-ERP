package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.CostRollupService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/maintenance/costs")
@RequiredArgsConstructor
public class CostRollupController {

    private final CostRollupService costRollupService;

    @GetMapping("/summary")
    public Object summary(@RequestParam(required = false) String machineCode,
                          @RequestParam(defaultValue = "12") int months) {
        return costRollupService.getCostSummary(machineCode, months);
    }

    @GetMapping("/tco")
    public Object tco(@RequestParam String machineCode) {
        return costRollupService.getTcoSummary(machineCode);
    }

    @PostMapping("/refresh")
    public Object refresh() {
        costRollupService.refresh();
        return java.util.Map.of("status", "refreshed");
    }
}
