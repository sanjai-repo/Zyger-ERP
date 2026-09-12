package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @Mock private BreakdownIntimationRepository breakdowns;
    @Mock private BreakdownRectificationRepository rectifications;
    @Mock private PMPlanRepository pmPlans;
    @Mock private PMScheduleRepository pmSchedules;
    @Mock private PMCompletionRepository pmCompletions;
    @Mock private ToolServiceIntimationRepository toolServices;
    @Mock private ToolServiceRectificationRepository toolRectifications;
    @Mock private CalibrationScheduleRepository calSchedules;
    @Mock private CalibrationEntryRepository calEntries;
    @Mock private PowerConsumptionRepository powerConsumptions;
    @Mock private WaterConsumptionRepository waterConsumptions;
    @Mock private RootCauseAnalysisRepository rootCauseAnalyses;
    @Mock private DocNumberService numbers;
    @Mock private MachineMasterRepository machines;
    @Mock private DocumentWorkflowEngine workflowEngine;
    @Mock private SparePartStockService sparePartStockService;
    @Mock private DepartmentMasterRepository departments;
    @Mock private TechnicianMasterRepository technicians;
    @Mock private BreakdownCategoryMasterRepository breakdownCategories;
    @Mock private FailureCodeMasterRepository failureCodes;
    @Mock private RootCauseCodeMasterRepository rootCauseCodes;
    @Mock private MaintenanceActivityMasterRepository activities;
    @Mock private PmChecklistTemplateRepository pmChecklistTemplates;
    @Mock private BreakdownAssignmentRepository breakdownAssignments;
    @Mock private PmCompletionChecklistItemRepository pmChecklistItems;
    @Mock private DowntimeTransactionRepository downtimeTransactions;
    @Mock private MaintenanceAttachmentRepository maintenanceAttachments;
    @Mock private NotificationLogRepository notificationLogs;
    @Mock private NotificationService notificationService;
    @Mock private InstrumentMasterRepository instruments;
    @Mock private MaintenanceCostTransactionRepository maintenanceCosts;
    @Mock private VendorMasterRepository vendors;
    @Mock private MachineOperatingHoursRepository operatingHoursRepo;
    @Mock private MaintenanceCostAdjustmentRepository costAdjustments;
    @InjectMocks private MaintenanceService maintenanceService;

    @Nested
    @DisplayName("Helper methods")
    class Helpers {
        @Test
        @DisplayName("principalName should return system for null principal")
        void nullPrincipal() {
            assertEquals("system", maintenanceService.principalName(null));
        }

        @Test
        @DisplayName("audit should set updatedAt on entity")
        void auditSetsTimestamp() {
            BreakdownIntimation bi = new BreakdownIntimation();
            maintenanceService.audit(bi, "admin");
            assertNotNull(bi.getUpdatedAt());
            assertEquals("admin", bi.getUpdatedBy());
        }

        @Test
        @DisplayName("setCreated should set createdBy and createdAt")
        void setCreated() {
            BreakdownIntimation bi = new BreakdownIntimation();
            maintenanceService.setCreated(bi, "operator1");
            assertEquals("operator1", bi.getCreatedBy());
            assertNotNull(bi.getCreatedAt());
        }

        @Test
        @DisplayName("calculateNextDate should compute next monthly date")
        void calculateNextDate() {
            LocalDate result = maintenanceService.calculateNextDate(LocalDate.of(2026, 1, 15), "MONTHLY");
            assertEquals(LocalDate.of(2026, 2, 15), result);
        }

        @Test
        @DisplayName("calculateNextDate should compute next weekly date")
        void calculateNextDateWeekly() {
            LocalDate result = maintenanceService.calculateNextDate(LocalDate.of(2026, 1, 15), "WEEKLY");
            assertEquals(LocalDate.of(2026, 1, 22), result);
        }

        @Test
        @DisplayName("calculateNextDate should compute next quarterly date")
        void calculateNextDateQuarterly() {
            LocalDate result = maintenanceService.calculateNextDate(LocalDate.of(2026, 1, 15), "QUARTERLY");
            assertEquals(LocalDate.of(2026, 4, 15), result);
        }
    }

    @Nested
    @DisplayName("Breakdown Intimation")
    class BreakdownIntimationTests {
        @Test
        @DisplayName("Should list all rectifications")
        void listRectifications() {
            BreakdownRectification r = new BreakdownRectification();
            when(rectifications.findAll()).thenReturn(List.of(r));

            List<BreakdownRectification> result = maintenanceService.listRectifications();
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should get breakdown by ID")
        void getBreakdown() {
            BreakdownIntimation bd = new BreakdownIntimation();
            bd.setId(1L);
            when(breakdowns.findById(1L)).thenReturn(Optional.of(bd));

            BreakdownIntimation result = maintenanceService.getBreakdown(1L);
            assertNotNull(result);
            assertEquals(1L, result.getId());
        }
    }

    @Nested
    @DisplayName("PM Plan")
    class PmPlanTests {
        @Test
        @DisplayName("Should list all PM plans")
        void listPmPlans() {
            PMPlan p1 = new PMPlan();
            when(pmPlans.findAll()).thenReturn(List.of(p1));

            List<PMPlan> result = maintenanceService.listPMPlans();
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should get PM plan by ID")
        void getPmPlan() {
            PMPlan p = new PMPlan();
            p.setId(1L);
            when(pmPlans.findById(1L)).thenReturn(Optional.of(p));

            PMPlan result = maintenanceService.getPMPlan(1L);
            assertNotNull(result);
        }
    }

    @Nested
    @DisplayName("PM Completions")
    class PmCompletionTests {
        @Test
        @DisplayName("Should list PM completions")
        void listPmCompletions() {
            PMCompletion c = new PMCompletion();
            when(pmCompletions.findAll()).thenReturn(List.of(c));

            List<PMCompletion> result = maintenanceService.listPMCompletions();
            assertEquals(1, result.size());
        }
    }

    @Nested
    @DisplayName("Tool Services")
    class ToolServiceTests {
        @Test
        @DisplayName("Should list tool services")
        void listToolServices() {
            ToolServiceIntimation t = new ToolServiceIntimation();
            when(toolServices.findAll()).thenReturn(List.of(t));

            List<ToolServiceIntimation> result = maintenanceService.listToolServices();
            assertEquals(1, result.size());
        }
    }

    @Nested
    @DisplayName("Power Consumption")
    class PowerConsumptionTests {
        @Test
        @DisplayName("Should list power consumptions")
        void listPowerConsumptions() {
            PowerConsumption pc = new PowerConsumption();
            when(powerConsumptions.findAll()).thenReturn(List.of(pc));

            List<PowerConsumption> result = maintenanceService.listPowerConsumptions();
            assertEquals(1, result.size());
        }
    }

    @Nested
    @DisplayName("Water Consumption")
    class WaterConsumptionTests {
        @Test
        @DisplayName("Should list water consumptions")
        void listWaterConsumptions() {
            WaterConsumption wc = new WaterConsumption();
            when(waterConsumptions.findAll()).thenReturn(List.of(wc));

            List<WaterConsumption> result = maintenanceService.listWaterConsumptions();
            assertEquals(1, result.size());
        }
    }

    @Nested
    @DisplayName("Vendors")
    class VendorTests {
        @Test
        @DisplayName("Should list vendors")
        void listVendors() {
            VendorMaster v = new VendorMaster();
            when(vendors.findAll()).thenReturn(List.of(v));

            List<VendorMaster> result = maintenanceService.listVendors();
            assertEquals(1, result.size());
        }
    }
}
