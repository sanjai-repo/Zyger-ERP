package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductionEntryValidationServiceTest {

    @Mock
    private RouteSheetRepository routeSheetRepo;

    @Mock
    private JobCardRepository jobCardRepo;

    @Mock
    private JobCardSubjobRepository subjobRepo;

    @Mock
    private MachineMasterRepository machineRepo;

    @Mock
    private ProductionEntryRepository productionEntryRepo;

    @InjectMocks
    private ProductionEntryValidationService validationService;

    private ProductionEntry validEntry;

    @BeforeEach
    void setUp() {
        validEntry = ProductionEntry.builder()
                .productionType("GENERAL")
                .supervisorCode("SUP001")
                .jobCardNumber("JC1001")
                .workOrderNumber("WO1001")
                .operationCode("TURNING")
                .processQty(new BigDecimal("100"))
                .goodQuantity(new BigDecimal("100"))
                .rejectedQuantity(BigDecimal.ZERO)
                .reworkQuantity(BigDecimal.ZERO)
                .scrapQuantity(BigDecimal.ZERO)
                .pendingSequenceOnly(true)
                .build();
    }

    @Test
    @DisplayName("V-01: Production Type is mandatory")
    void testMissingProductionType() {
        validEntry.setProductionType(null);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validationService.validate(validEntry));
        assertTrue(ex.getMessage().contains("Production Type is mandatory"));
    }

    @Test
    @DisplayName("V-02: Supervisor is mandatory")
    void testMissingSupervisor() {
        validEntry.setSupervisorCode("");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validationService.validate(validEntry));
        assertTrue(ex.getMessage().contains("Supervisor is mandatory"));
    }

    @Test
    @DisplayName("V-05: Process quantity must be greater than zero")
    void testZeroProcessQuantity() {
        validEntry.setProcessQty(BigDecimal.ZERO);
        validEntry.setProducedQuantity(BigDecimal.ZERO);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validationService.validate(validEntry));
        assertTrue(ex.getMessage().contains("Process quantity must be greater than zero"));
    }

    @Test
    @DisplayName("V-08 & V-10: Rejected quantity requires rejection reason matching rejected qty")
    void testRejectionReasonValidation() {
        validEntry.setRejectedQuantity(new BigDecimal("10"));
        validEntry.setGoodQuantity(new BigDecimal("90"));

        // No reason provided
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, () -> validationService.validate(validEntry));
        assertTrue(ex1.getMessage().contains("Rejection reason is mandatory"));

        // Reason provided but total quantity mismatched
        ProductionEntryRejection rej = ProductionEntryRejection.builder()
                .reasonCode("R01")
                .quantity(new BigDecimal("5"))
                .build();
        validEntry.setRejectionReasons(List.of(rej));

        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, () -> validationService.validate(validEntry));
        assertTrue(ex2.getMessage().contains("Reason-wise rejection quantity must equal rejected quantity"));
    }

    @Test
    @DisplayName("V-12: Idle time cannot exceed operation elapsed time")
    void testIdleTimeExceedsElapsed() {
        Instant start = Instant.now();
        Instant end = start.plusSeconds(1800); // 30 mins
        validEntry.setStartTime(start);
        validEntry.setEndTime(end);
        validEntry.setIdleTime(new BigDecimal("45")); // 45 mins idle > 30 mins elapsed
        validEntry.setIdleReason("MACHINE_BREAKDOWN");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validationService.validate(validEntry));
        assertTrue(ex.getMessage().contains("Idle time cannot exceed operation elapsed time"));
    }

    @Test
    @DisplayName("V-17: Cannot post out of sequence operation when Pending Sequence Only is enabled")
    void testOutofSequenceOperation() {
        JobCardSubjob sj1 = JobCardSubjob.builder().sequenceNo(1).operationCode("TURNING").status("IN_PROGRESS").build();
        JobCardSubjob sj2 = JobCardSubjob.builder().sequenceNo(2).operationCode("MILLING").status("PENDING").build();

        when(subjobRepo.findByJobCardJobCardNumber("JC1001")).thenReturn(new ArrayList<>(List.of(sj1, sj2)));

        // Attempting MILLING when TURNING is not COMPLETED/POSTED
        validEntry.setOperationCode("MILLING");
        validEntry.setPendingSequenceOnly(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validationService.validateSequenceAndPending(validEntry));
        assertTrue(ex.getMessage().contains("not currently eligible according to the Route Sheet sequence"));
    }

    @Test
    @DisplayName("V-06 & V-18: Cannot over-consume pending quantity including draft soft reservations")
    void testOverConsumePendingQuantityWithDrafts() {
        JobCardSubjob sj1 = JobCardSubjob.builder()
                .sequenceNo(1)
                .operationCode("TURNING")
                .status("IN_PROGRESS")
                .plannedQuantity(new BigDecimal("100"))
                .completedQuantity(new BigDecimal("60"))
                .build();

        when(subjobRepo.findByJobCardJobCardNumber("JC1001")).thenReturn(new ArrayList<>(List.of(sj1)));

        // Other draft entry taking 20 units
        ProductionEntry draftEntry = ProductionEntry.builder()
                .id(99L)
                .processQty(new BigDecimal("20"))
                .status("DRAFT")
                .build();
        when(productionEntryRepo.findByJobCardNumberAndOperationCodeAndStatus("JC1001", "TURNING", "DRAFT"))
                .thenReturn(List.of(draftEntry));

        // Available pending = 100 - 60 - 20 = 20. Attempting 30.
        validEntry.setProcessQty(new BigDecimal("30"));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validationService.validateSequenceAndPending(validEntry));
        assertTrue(ex.getMessage().contains("exceeds the available pending quantity"));
    }
}
