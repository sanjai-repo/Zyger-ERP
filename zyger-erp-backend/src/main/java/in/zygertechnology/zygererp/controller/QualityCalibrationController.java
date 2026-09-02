package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.repo.QualityCalibrationInstrumentRepository;
import in.zygertechnology.zygererp.service.QualitySupportService;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/**
 * Calibration instrument master + Quality dashboard endpoints.
 */
@RestController
@RequestMapping("/api/v1/quality")
@RequirePermission(module = "QUALITY", screen = "CALIBRATION_INSTRUMENT", action = "VIEW")
@RequiredArgsConstructor
public class QualityCalibrationController {

    private final QualitySupportService support;
    private final QualityCalibrationInstrumentRepository instruments;

    @GetMapping("/calibration/instruments")
    public List<Map<String, Object>> instruments(@RequestParam(required = false) String status) {
        List<in.zygertechnology.zygererp.entity.QualityCalibrationInstrument> all = instruments.findAll();
        all.sort(Comparator.comparing(
                i -> i.getNextDueDate() == null ? java.time.LocalDate.MAX : i.getNextDueDate()));
        List<Map<String, Object>> out = new ArrayList<>();
        for (var i : all) {
            if (status != null && !status.isBlank() && !status.equals(i.getStatus())) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", i.getId());
            row.put("instrumentCode", i.getInstrumentCode());
            row.put("instrumentName", i.getInstrumentName());
            row.put("instrumentType", i.getInstrumentType());
            row.put("serialNumber", i.getSerialNumber());
            row.put("location", i.getLocation());
            row.put("calibrationFrequencyDays", i.getCalibrationFrequencyDays());
            row.put("lastCalibrationDate", i.getLastCalibrationDate());
            row.put("nextDueDate", i.getNextDueDate());
            row.put("status", i.getStatus());
            row.put("calibrationPolicy", i.getCalibrationPolicy());
            out.add(row);
        }
        return out;
    }

    @PostMapping("/calibration/instruments")
    public Map<String, Object> saveInstrument(@RequestBody Map<String, Object> body) {
        return support.saveInstrument(body);
    }

    @DeleteMapping("/calibration/instruments/{id}")
    public void retire(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        support.retireInstrument(id, body == null ? "retired" : body.getOrDefault("reason", "retired"));
    }

    @GetMapping("/calibration/stats")
    public Map<String, Object> calibrationStats() {
        return support.calibrationStats();
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return support.dashboard();
    }
}
