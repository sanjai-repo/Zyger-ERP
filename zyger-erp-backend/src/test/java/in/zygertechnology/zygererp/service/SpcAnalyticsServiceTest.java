package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.QualityCharacteristicMeasurement;
import in.zygertechnology.zygererp.repository.QualityCharacteristicMeasurementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SpcAnalyticsServiceTest {

    @Mock
    private QualityCharacteristicMeasurementRepository qcRepo;

    @InjectMocks
    private SpcAnalyticsService spcAnalyticsService;

    private QualityCharacteristicMeasurement m1;
    private QualityCharacteristicMeasurement m2;
    private QualityCharacteristicMeasurement m3;

    @BeforeEach
    void setUp() {
        m1 = new QualityCharacteristicMeasurement();
        m1.setItemCode("ITEM-001");
        m1.setCharacteristicCode("DIAMETER");
        m1.setCharacteristicName("Outer Diameter");
        m1.setActualValue(new BigDecimal("10.05"));
        m1.setActualAvg(new BigDecimal("10.05"));
        m1.setActualMin(new BigDecimal("10.00"));
        m1.setActualMax(new BigDecimal("10.10"));
        m1.setUpperLimit(new BigDecimal("10.20"));
        m1.setLowerLimit(new BigDecimal("9.80"));
        m1.setResult("PASS");
        m1.setMeasuredAt(Instant.now());

        m2 = new QualityCharacteristicMeasurement();
        m2.setItemCode("ITEM-001");
        m2.setCharacteristicCode("DIAMETER");
        m2.setCharacteristicName("Outer Diameter");
        m2.setActualValue(new BigDecimal("10.00"));
        m2.setActualAvg(new BigDecimal("10.00"));
        m2.setActualMin(new BigDecimal("9.95"));
        m2.setActualMax(new BigDecimal("10.05"));
        m2.setUpperLimit(new BigDecimal("10.20"));
        m2.setLowerLimit(new BigDecimal("9.80"));
        m2.setResult("PASS");
        m2.setMeasuredAt(Instant.now());

        m3 = new QualityCharacteristicMeasurement();
        m3.setItemCode("ITEM-001");
        m3.setCharacteristicCode("DIAMETER");
        m3.setCharacteristicName("Outer Diameter");
        m3.setActualValue(new BigDecimal("10.10"));
        m3.setActualAvg(new BigDecimal("10.10"));
        m3.setActualMin(new BigDecimal("10.02"));
        m3.setActualMax(new BigDecimal("10.18"));
        m3.setUpperLimit(new BigDecimal("10.20"));
        m3.setLowerLimit(new BigDecimal("9.80"));
        m3.setResult("PASS");
        m3.setMeasuredAt(Instant.now());
    }

    @Test
    @DisplayName("getXBarChart should compute correct control limits and stats")
    void testGetXBarChart() {
        when(qcRepo.findByItemCodeAndCharacteristicCode("ITEM-001", "DIAMETER"))
                .thenReturn(List.of(m1, m2, m3));

        Map<String, Object> chart = spcAnalyticsService.getXBarChart("ITEM-001", "DIAMETER", 10);

        assertNotNull(chart);
        assertEquals(3, chart.get("sampleSize"));
        assertNotNull(chart.get("xBarBar"));
        assertNotNull(chart.get("ucl"));
        assertNotNull(chart.get("lcl"));
    }

    @Test
    @DisplayName("calculateCapability should return capability metrics Cp and Cpk")
    void testCalculateCapability() {
        Map<String, Object> capability = spcAnalyticsService.calculateCapability("ITEM-001", "DIAMETER", List.of(m1, m2, m3));

        assertNotNull(capability);
        assertEquals(3, capability.get("count"));
        assertNotNull(capability.get("cp"));
        assertNotNull(capability.get("cpk"));
        assertNotNull(capability.get("capabilityClass"));
    }

    @Test
    @DisplayName("getStats should return pass, fail count and yield percentage")
    void testGetStats() {
        when(qcRepo.findByItemCodeAndCharacteristicCode("ITEM-001", "DIAMETER"))
                .thenReturn(List.of(m1, m2, m3));

        Map<String, Object> stats = spcAnalyticsService.getStats("ITEM-001", "DIAMETER");

        assertNotNull(stats);
        assertEquals(3, stats.get("count"));
        assertEquals(3L, stats.get("pass"));
        assertEquals(0L, stats.get("fail"));
    }
}
