package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.SupplierScorecardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/quality/suppliers")
@RequiredArgsConstructor
public class SupplierScorecardController {

    private final SupplierScorecardService scorecardService;

    @GetMapping("/scorecard")
    public Object scorecard(@RequestParam(required = false) String supplierCode,
                            @RequestParam(defaultValue = "6") int months) {
        return scorecardService.getMonthlyScorecard(supplierCode, months);
    }

    @GetMapping("/ncr-details")
    public Object ncrDetails(@RequestParam(required = false) String supplierCode) {
        return scorecardService.getNcrDetails(supplierCode);
    }

    @PostMapping("/refresh")
    public Object refresh() {
        scorecardService.refresh();
        return java.util.Map.of("status", "refreshed");
    }
}
