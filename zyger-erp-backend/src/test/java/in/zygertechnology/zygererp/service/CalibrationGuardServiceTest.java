package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.config.BusinessRuleException;
import in.zygertechnology.zygererp.entity.QualityCalibrationInstrument;
import in.zygertechnology.zygererp.repo.QualityCalibrationInstrumentRepository;
import in.zygertechnology.zygererp.security.RbacServiceBridge;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CalibrationGuardServiceTest {

    @Mock
    private QualityCalibrationInstrumentRepository instrumentsRepo;

    @Mock
    private RbacServiceBridge rbacBridge;

    @InjectMocks
    private CalibrationGuardService calibrationGuardService;

    @Test
    @DisplayName("Should pass when instrument has valid future calibration due date")
    void testValidCalibration() {
        QualityCalibrationInstrument inst = new QualityCalibrationInstrument();
        inst.setInstrumentCode("CAL-001");
        inst.setCalibrationPolicy("BLOCK");
        inst.setNextDueDate(LocalDate.now().plusDays(45));

        when(instrumentsRepo.findByInstrumentCode("CAL-001")).thenReturn(Optional.of(inst));

        assertDoesNotThrow(() -> calibrationGuardService.enforcePolicy("CAL-001"));
    }

    @Test
    @DisplayName("Should block inspection when calibration is overdue and policy is BLOCK")
    void testOverdueCalibrationBlock() {
        QualityCalibrationInstrument inst = new QualityCalibrationInstrument();
        inst.setInstrumentCode("CAL-002");
        inst.setCalibrationPolicy("BLOCK");
        inst.setNextDueDate(LocalDate.now().minusDays(5));

        when(instrumentsRepo.findByInstrumentCode("CAL-002")).thenReturn(Optional.of(inst));

        BusinessRuleException ex = assertThrows(BusinessRuleException.class,
                () -> calibrationGuardService.enforcePolicy("CAL-002"));

        assertEquals("CALIBRATION_OVERDUE", ex.getRuleCode());
        assertEquals("CAL-002", ex.getDetails().get("instrumentCode"));
    }

    @Test
    @DisplayName("Should allow override when user has OVERRIDE permission and provides reason")
    void testCalibrationOverrideWithPermission() {
        QualityCalibrationInstrument inst = new QualityCalibrationInstrument();
        inst.setInstrumentCode("CAL-003");
        inst.setCalibrationPolicy("BLOCK");
        inst.setNextDueDate(LocalDate.now().minusDays(5));

        when(instrumentsRepo.findByInstrumentCode("CAL-003")).thenReturn(Optional.of(inst));
        when(rbacBridge.hasPermission("quality_manager", "QUALITY", "CALIBRATION", "OVERRIDE")).thenReturn(true);

        assertDoesNotThrow(() -> calibrationGuardService.enforcePolicy("CAL-003", "Urgent production batch", "quality_manager"));
    }

    @Test
    @DisplayName("Should deny override when user lacks OVERRIDE permission")
    void testCalibrationOverrideDeniedWithoutPermission() {
        QualityCalibrationInstrument inst = new QualityCalibrationInstrument();
        inst.setInstrumentCode("CAL-004");
        inst.setCalibrationPolicy("BLOCK");
        inst.setNextDueDate(LocalDate.now().minusDays(5));

        when(instrumentsRepo.findByInstrumentCode("CAL-004")).thenReturn(Optional.of(inst));
        when(rbacBridge.hasPermission("operator", "QUALITY", "CALIBRATION", "OVERRIDE")).thenReturn(false);

        BusinessRuleException ex = assertThrows(BusinessRuleException.class,
                () -> calibrationGuardService.enforcePolicy("CAL-004", "Urgent production batch", "operator"));

        assertEquals("CALIBRATION_OVERRIDE_DENIED", ex.getRuleCode());
    }
}
