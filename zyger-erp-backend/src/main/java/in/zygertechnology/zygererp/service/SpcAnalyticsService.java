package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.QualityCharacteristicMeasurement;
import in.zygertechnology.zygererp.repository.QualityCharacteristicMeasurementRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SpcAnalyticsService {

    private final QualityCharacteristicMeasurementRepository qcRepo;

    public SpcAnalyticsService(QualityCharacteristicMeasurementRepository qcRepo) {
        this.qcRepo = qcRepo;
    }

    public void recordMeasurement(QualityCharacteristicMeasurement m) {
        qcRepo.save(m);
    }

    /** §6.6: X-bar chart with control limits (UCL/LCL) + process capability (Cp/Cpk). */
    public Map<String, Object> getXBarChart(String itemCode, String characteristicCode, int lastN) {
        List<QualityCharacteristicMeasurement> all = qcRepo.findByItemCodeAndCharacteristicCode(itemCode, characteristicCode);
        List<QualityCharacteristicMeasurement> recent = all.stream()
                .filter(m -> m.getActualAvg() != null)
                .sorted(Comparator.comparing(QualityCharacteristicMeasurement::getMeasuredAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(lastN)
                .toList();

        if (recent.isEmpty()) return Map.of("data", List.of(), "count", 0);

        List<Map<String, Object>> data = new ArrayList<>();
        BigDecimal sumXBar = BigDecimal.ZERO;
        BigDecimal sumR = BigDecimal.ZERO;

        for (QualityCharacteristicMeasurement m : recent) {
            sumXBar = sumXBar.add(m.getActualAvg());
            BigDecimal range = (m.getActualMin() != null && m.getActualMax() != null)
                    ? m.getActualMax().subtract(m.getActualMin())
                    : BigDecimal.ZERO;
            sumR = sumR.add(range);
            data.add(Map.of(
                    "date", m.getMeasuredAt() != null ? m.getMeasuredAt().toString() : "",
                    "xBar", m.getActualAvg(),
                    "range", range,
                    "inspectionNumber", m.getInspectionNumber() != null ? m.getInspectionNumber() : ""
            ));
        }

        int n = recent.size();
        BigDecimal xBarBar = sumXBar.divide(BigDecimal.valueOf(n), 6, RoundingMode.HALF_UP);
        BigDecimal rBar = sumR.divide(BigDecimal.valueOf(n), 6, RoundingMode.HALF_UP);

        // A2 for subgroup size 5
        BigDecimal a2 = new BigDecimal("0.577");
        BigDecimal uclXBar = xBarBar.add(a2.multiply(rBar));
        BigDecimal lclXBar = xBarBar.subtract(a2.multiply(rBar));

        // D3, D4 for R chart (n=5)
        BigDecimal d3 = BigDecimal.ZERO;
        BigDecimal d4 = new BigDecimal("2.114");
        BigDecimal uclR = d4.multiply(rBar);
        BigDecimal lclR = d3.multiply(rBar);

        // Cp / Cpk from individual values
        Map<String, Object> capability = calculateCapability(itemCode, characteristicCode, recent);

        return Map.of(
                "data", data,
                "xBarBar", xBarBar,
                "ucl", uclXBar,
                "lcl", lclXBar,
                "rBar", rBar,
                "uclR", uclR,
                "lclR", lclR,
                "sampleSize", n,
                "capability", capability
        );
    }

    /** §6.6: Process capability indices Cp, Cpk, Pp, Ppk. */
    public Map<String, Object> calculateCapability(String itemCode, String characteristicCode,
                                                    List<QualityCharacteristicMeasurement> measurements) {
        List<BigDecimal> values = measurements.stream()
                .map(QualityCharacteristicMeasurement::getActualValue)
                .filter(Objects::nonNull)
                .toList();

        if (values.size() < 2) return Map.of("count", values.size(), "cp", null, "cpk", null);

        BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal mean = sum.divide(BigDecimal.valueOf(values.size()), 6, RoundingMode.HALF_UP);

        // Sample standard deviation
        BigDecimal sumSqDiff = values.stream()
                .map(v -> v.subtract(mean).pow(2))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal stdDev = BigDecimal.valueOf(Math.sqrt(
                sumSqDiff.divide(BigDecimal.valueOf(values.size() - 1), 10, RoundingMode.HALF_UP).doubleValue()));

        // Get spec limits from the first measurement that has them
        BigDecimal usl = null, lsl = null;
        for (QualityCharacteristicMeasurement m : measurements) {
            if (m.getUpperLimit() != null) { usl = m.getUpperLimit(); break; }
        }
        for (QualityCharacteristicMeasurement m : measurements) {
            if (m.getLowerLimit() != null) { lsl = m.getLowerLimit(); break; }
        }

        if (usl == null && lsl == null) {
            return Map.of("count", values.size(), "mean", mean, "stdDev", stdDev, "cp", null, "cpk", null);
        }

        BigDecimal threeSigma = stdDev.multiply(BigDecimal.valueOf(3));
        if (threeSigZeros(threeSigma)) {
            return Map.of("count", values.size(), "mean", mean, "stdDev", stdDev, "cp", null, "cpk", null);
        }

        BigDecimal cp = BigDecimal.ZERO;
        if (usl != null && lsl != null) {
            cp = usl.subtract(lsl).divide(threeSigma, 4, RoundingMode.HALF_UP);
        }

        BigDecimal cpk = BigDecimal.ZERO;
        if (usl != null && lsl != null) {
            BigDecimal cpu = usl.subtract(mean).divide(threeSigma, 4, RoundingMode.HALF_UP);
            BigDecimal cpl = mean.subtract(lsl).divide(threeSigma, 4, RoundingMode.HALF_UP);
            cpk = cpu.min(cpl);
        } else if (usl != null) {
            cpk = usl.subtract(mean).divide(threeSigma, 4, RoundingMode.HALF_UP);
        } else if (lsl != null) {
            cpk = mean.subtract(lsl).divide(threeSigma, 4, RoundingMode.HALF_UP);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("count", values.size());
        result.put("mean", mean);
        result.put("stdDev", stdDev.setScale(6, RoundingMode.HALF_UP));
        result.put("cp", cp);
        result.put("cpk", cpk);
        result.put("usl", usl);
        result.put("lsl", lsl);
        if (usl != null && lsl != null) {
            result.put("target", usl.add(lsl).divide(BigDecimal.valueOf(2), 6, RoundingMode.HALF_UP));
        }
        // Cpk classification per FRS
        String capabilityClass = "INSUFFICIENT";
        if (cpk.compareTo(new BigDecimal("1.67")) >= 0) capabilityClass = "CAPABLE";
        else if (cpk.compareTo(new BigDecimal("1.33")) >= 0) capabilityClass = "MARGINAL";
        else if (cpk.compareTo(new BigDecimal("1.00")) >= 0) capabilityClass = "LOW";
        result.put("capabilityClass", capabilityClass);

        return result;
    }

    /** §6.6: Basic stats for a characteristic across all inspections. */
    public Map<String, Object> getStats(String itemCode, String characteristicCode) {
        List<QualityCharacteristicMeasurement> all = qcRepo.findByItemCodeAndCharacteristicCode(itemCode, characteristicCode);
        List<QualityCharacteristicMeasurement> withValue = all.stream()
                .filter(m -> m.getActualValue() != null)
                .toList();

        if (withValue.isEmpty()) return Map.of("count", 0);

        BigDecimal min = withValue.stream().map(QualityCharacteristicMeasurement::getActualValue).filter(Objects::nonNull).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal max = withValue.stream().map(QualityCharacteristicMeasurement::getActualValue).filter(Objects::nonNull).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        long pass = withValue.stream().filter(m -> "PASS".equals(m.getResult())).count();
        long fail = withValue.stream().filter(m -> "FAIL".equals(m.getResult())).count();
        BigDecimal yield = BigDecimal.ZERO;
        if (!withValue.isEmpty()) {
            yield = BigDecimal.valueOf(pass).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(withValue.size()), 2, RoundingMode.HALF_UP);
        }

        return Map.of(
                "count", withValue.size(),
                "pass", pass,
                "fail", fail,
                "yield", yield,
                "min", min,
                "max", max
        );
    }

    /** §6.6: List distinct characteristics measured for an item, for SPC dropdown. */
    public List<Map<String, Object>> getCharacteristicsForItem(String itemCode) {
        List<QualityCharacteristicMeasurement> all = qcRepo.findByItemCode(itemCode);
        return all.stream()
                .filter(m -> m.getCharacteristicCode() != null)
                .collect(Collectors.groupingBy(QualityCharacteristicMeasurement::getCharacteristicCode,
                        Collectors.collectingAndThen(Collectors.toList(), list -> {
                            Map<String, Object> info = new LinkedHashMap<>();
                            info.put("code", list.get(0).getCharacteristicCode());
                            info.put("name", list.get(0).getCharacteristicName());
                            info.put("measurementCount", list.size());
                            return info;
                        })))
                .values().stream().toList();
    }

    private boolean threeSigZeros(BigDecimal v) {
        return v.compareTo(BigDecimal.ZERO) == 0;
    }
}
