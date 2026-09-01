package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.QualityInspection;
import in.zygertechnology.zygererp.repo.InstrumentMasterRepository;
import in.zygertechnology.zygererp.repo.QualityCalibrationInstrumentRepository;
import in.zygertechnology.zygererp.repository.InspectionPlanRepository;
import in.zygertechnology.zygererp.repository.QualityCharacteristicMeasurementRepository;
import in.zygertechnology.zygererp.repository.SamplingPlanMasterRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class QualityInspectionServiceTest {

    @Mock
    private EntityManager em;

    @Mock
    private ObjectMapper mapper;

    @Mock
    private DocNumberService docNumberService;

    @Mock
    private DocumentFacade documentFacade;

    @Mock
    private QualityCalibrationInstrumentRepository instruments;

    @Mock
    private InstrumentMasterRepository instrumentMasters;

    @Mock
    private InspectionPlanRepository inspectionPlanRepo;

    @Mock
    private SamplingPlanMasterRepository samplingRepo;

    @Mock
    private QualityCharacteristicMeasurementRepository spcRepo;

    @InjectMocks
    private QualityInspectionService qualityInspectionService;

    @Test
    @DisplayName("Should delegate nextNumber generation to DocNumberService.nextFy")
    void testNextNumberDelegation() {
        when(docNumberService.nextFy("IQC")).thenReturn("IQC/25-26/00001");

        String number = qualityInspectionService.nextNumber("IQC");
        assertEquals("IQC/25-26/00001", number);

        verify(docNumberService, times(1)).nextFy("IQC");
    }

    @Test
    @DisplayName("Should return quality inspection when found via DocumentFacade")
    void testGetInspectionFound() {
        QualityInspection inspection = new QualityInspection();
        inspection.setId(100L);
        inspection.setDocNo("IQC/25-26/00005");

        when(documentFacade.get("quality-inspection", 100L)).thenReturn(inspection);

        QualityInspection result = qualityInspectionService.get(100L);
        assertNotNull(result);
        assertEquals("IQC/25-26/00005", result.getDocNo());
    }

    @Test
    @DisplayName("Should return null or throw exception when quality inspection not found via DocumentFacade")
    void testGetInspectionNotFound() {
        when(documentFacade.get("quality-inspection", 999L)).thenThrow(new RuntimeException("Inspection document not found"));

        assertThrows(RuntimeException.class, () -> qualityInspectionService.get(999L));
    }
}
