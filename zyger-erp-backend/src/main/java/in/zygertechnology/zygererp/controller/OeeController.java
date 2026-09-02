package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.OeeDaily;
import in.zygertechnology.zygererp.repository.OeeDailyRepository;
import in.zygertechnology.zygererp.repository.PlantMasterRepository;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/oee")
public class OeeController {

    private final OeeDailyRepository oeeRepo;
    private final PlantMasterRepository plantRepo;

    public OeeController(OeeDailyRepository oeeRepo, PlantMasterRepository plantRepo) {
        this.oeeRepo = oeeRepo;
        this.plantRepo = plantRepo;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "1") Long plantId,
                                           @RequestParam(required = false) String from,
                                           @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(30);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();
        List<OeeDaily> data = oeeRepo.findByOeeDateBetweenAndPlantId(fromDate, toDate, plantId);
        return data.stream().map(this::toMap).toList();
    }

    @PostMapping
    public Map<String, Object> save(@RequestBody Map<String, Object> body) {
        Long plantId = ((Number) body.getOrDefault("plantId", 1L)).longValue();
        Long machineId = body.get("machineId") != null ? ((Number) body.get("machineId")).longValue() : null;
        LocalDate oeeDate = LocalDate.parse((String) body.get("oeeDate"));

        Optional<OeeDaily> existing = oeeRepo.findByPlantIdAndMachineIdAndOeeDate(plantId, machineId, oeeDate);
        OeeDaily oee = existing.orElseGet(OeeDaily::new);

        oee.setPlant(plantRepo.findById(plantId).orElse(null));
        oee.setMachineId(machineId);
        oee.setMachineCode((String) body.get("machineCode"));
        oee.setOeeDate(oeeDate);
        oee.setPlannedTimeMin(toBD(body.get("plannedTimeMin")));
        oee.setRunTimeMin(toBD(body.get("runTimeMin")));
        oee.setDowntimeMin(toBD(body.get("downtimeMin")));
        oee.setIdealCycleTimeSec(toBD(body.get("idealCycleTimeSec")));
        oee.setGoodQty(toBD(body.get("goodQty")));
        oee.setTotalQty(toBD(body.get("totalQty")));

        // Auto-calculate
        BigDecimal planned = oee.getPlannedTimeMin() != null ? oee.getPlannedTimeMin() : BigDecimal.ZERO;
        BigDecimal run = oee.getRunTimeMin() != null ? oee.getRunTimeMin() : BigDecimal.ZERO;
        BigDecimal total = oee.getTotalQty() != null ? oee.getTotalQty() : BigDecimal.ZERO;
        BigDecimal good = oee.getGoodQty() != null ? oee.getGoodQty() : BigDecimal.ZERO;

        if (planned.compareTo(BigDecimal.ZERO) > 0 && run.compareTo(BigDecimal.ZERO) > 0) {
            oee.setAvailability(run.divide(planned, 4, RoundingMode.HALF_UP));

            // Performance = (idealCycleTime × totalQty) / runTime
            // idealCycleTime is in seconds, runTime is in minutes
            BigDecimal idealCycle = oee.getIdealCycleTimeSec() != null ? oee.getIdealCycleTimeSec() : BigDecimal.ZERO;
            if (idealCycle.compareTo(BigDecimal.ZERO) > 0 && total.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal idealRunMin = idealCycle.multiply(total).divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
                BigDecimal perf = idealRunMin.divide(run, 4, RoundingMode.HALF_UP);
                if (perf.compareTo(BigDecimal.ONE) > 0) perf = BigDecimal.ONE;
                oee.setPerformance(perf);
            } else {
                oee.setPerformance(run.divide(planned, 4, RoundingMode.HALF_UP));
            }

            if (total.compareTo(BigDecimal.ZERO) > 0) {
                oee.setQualityRate(good.divide(total, 4, RoundingMode.HALF_UP));
            }
            if (oee.getAvailability() != null && oee.getPerformance() != null && oee.getQualityRate() != null) {
                oee.setOee(oee.getAvailability().multiply(oee.getPerformance()).multiply(oee.getQualityRate())
                        .setScale(4, RoundingMode.HALF_UP));
            }
        }

        oeeRepo.save(oee);
        return toMap(oee);
    }

    private Map<String, Object> toMap(OeeDaily oee) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", oee.getId());
        m.put("machineCode", oee.getMachineCode());
        m.put("oeeDate", oee.getOeeDate().toString());
        m.put("plannedTimeMin", oee.getPlannedTimeMin());
        m.put("runTimeMin", oee.getRunTimeMin());
        m.put("downtimeMin", oee.getDowntimeMin());
        m.put("goodQty", oee.getGoodQty());
        m.put("totalQty", oee.getTotalQty());
        m.put("availability", oee.getAvailability());
        m.put("performance", oee.getPerformance());
        m.put("qualityRate", oee.getQualityRate());
        m.put("oee", oee.getOee());
        return m;
    }

    private BigDecimal toBD(Object v) {
        return v != null ? new BigDecimal(v.toString()) : null;
    }
}
