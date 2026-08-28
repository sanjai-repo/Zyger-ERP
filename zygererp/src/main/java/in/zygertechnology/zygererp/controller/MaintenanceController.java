package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.service.DocNumberService;
import in.zygertechnology.zygererp.service.MaintenanceService;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequirePermission(module = "MAINTENANCE", screen = "*", action = "VIEW")
@Slf4j
@RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceService svc;
    private final DocNumberService docNumbers;

    private String pn(Principal p) { return p != null ? p.getName() : "system"; }

    // ===========================
    // ---- BREAKDOWN INTIMATION
    // ===========================

    @GetMapping("/api/v1/maintenance/breakdowns/next-code")
    public Map<String, Object> nextBreakdownCode() {
        return Map.of("code", docNumbers.peek("breakdown-intimation", "BDI"));
    }

    @GetMapping("/api/v1/maintenance/breakdowns")
    public List<Map<String, Object>> listBreakdowns() { return svc.listBreakdowns(); }

    @PostMapping("/api/v1/maintenance/breakdowns")
    public BreakdownIntimation createBreakdown(@RequestBody BreakdownIntimation bd, Principal principal) {
        return svc.createBreakdown(bd, principal);
    }

    @GetMapping("/api/v1/maintenance/breakdowns/{id}")
    public BreakdownIntimation getBreakdown(@PathVariable Long id) {
        return svc.getBreakdown(id);
    }

    @PutMapping("/api/v1/maintenance/breakdowns/{id}")
    public BreakdownIntimation updateBreakdown(@PathVariable Long id, @RequestBody BreakdownIntimation bd, Principal principal) {
        return svc.updateBreakdown(id, bd, principal);
    }

    @DeleteMapping("/api/v1/maintenance/breakdowns/{id}")
    public void deleteBreakdown(@PathVariable Long id) { svc.deleteBreakdown(id); }

    @PostMapping("/api/v1/maintenance/breakdowns/{id}/actions/{action}")
    public Map<String, Object> breakdownAction(@PathVariable Long id, @PathVariable String action,
                                                @RequestBody(required = false) Map<String, String> body, Principal principal) {
        return svc.breakdownAction(id, action, body, principal);
    }

    // ===========================
    // ---- BREAKDOWN RECTIFICATION
    // ===========================

    @GetMapping("/api/v1/maintenance/breakdown-rectifications")
    public List<BreakdownRectification> listRectifications() { return svc.listRectifications(); }

    @PostMapping("/api/v1/maintenance/breakdown-rectifications")
    public BreakdownRectification createRectification(@RequestBody BreakdownRectification r, Principal principal) {
        return svc.createRectification(r, principal);
    }

    @GetMapping("/api/v1/maintenance/breakdown-rectifications/{id}")
    public BreakdownRectification getRectification(@PathVariable Long id) { return svc.getRectification(id); }

    @PutMapping("/api/v1/maintenance/breakdown-rectifications/{id}")
    public BreakdownRectification updateRectification(@PathVariable Long id, @RequestBody BreakdownRectification r, Principal principal) {
        return svc.updateRectification(id, r, principal);
    }

    @DeleteMapping("/api/v1/maintenance/breakdown-rectifications/{id}")
    public void deleteRectification(@PathVariable Long id) { svc.deleteRectification(id); }

    @PostMapping("/api/v1/maintenance/breakdown-rectifications/{id}/actions/{action}")
    public BreakdownRectification rectificationAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        return svc.rectificationAction(id, action, principal);
    }

    // ===========================
    // ---- PM PLAN
    // ===========================

    @GetMapping("/api/v1/maintenance/pm-plans")
    public List<PMPlan> listPMPlans() { return svc.listPMPlans(); }

    @PostMapping("/api/v1/maintenance/pm-plans")
    public PMPlan createPMPlan(@RequestBody PMPlan p, Principal principal) { return svc.createPMPlan(p, principal); }

    @GetMapping("/api/v1/maintenance/pm-plans/{id}")
    public PMPlan getPMPlan(@PathVariable Long id) { return svc.getPMPlan(id); }

    @PutMapping("/api/v1/maintenance/pm-plans/{id}")
    public PMPlan updatePMPlan(@PathVariable Long id, @RequestBody PMPlan p, Principal principal) {
        return svc.updatePMPlan(id, p, principal);
    }

    @DeleteMapping("/api/v1/maintenance/pm-plans/{id}")
    public void deletePMPlan(@PathVariable Long id) { svc.deletePMPlan(id); }

    @PostMapping("/api/v1/maintenance/pm-plans/{id}/actions/{action}")
    public PMPlan pmPlanAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        return svc.pmPlanAction(id, action, principal);
    }

    @PostMapping("/api/v1/maintenance/pm-plans/{id}/generate-schedule")
    public Map<String, Object> generatePMSchedule(@PathVariable Long id, Principal principal) {
        return svc.generatePMSchedule(id, principal);
    }

    // ===========================
    // ---- PM SCHEDULE
    // ===========================

    @GetMapping("/api/v1/maintenance/pm-schedules")
    public List<Map<String, Object>> listPMSchedules() { return svc.listPMSchedules(); }

    @PostMapping("/api/v1/maintenance/pm-schedules")
    public PMSchedule createPMSchedule(@RequestBody PMSchedule s, Principal principal) { return svc.createPMSchedule(s, principal); }

    @GetMapping("/api/v1/maintenance/pm-schedules/{id}")
    public PMSchedule getPMSchedule(@PathVariable Long id) { return svc.getPMSchedule(id); }

    @PutMapping("/api/v1/maintenance/pm-schedules/{id}")
    public PMSchedule updatePMSchedule(@PathVariable Long id, @RequestBody PMSchedule s, Principal principal) {
        return svc.updatePMSchedule(id, s, principal);
    }

    @DeleteMapping("/api/v1/maintenance/pm-schedules/{id}")
    public void deletePMSchedule(@PathVariable Long id) { svc.deletePMSchedule(id); }

    @PostMapping("/api/v1/maintenance/pm-schedules/{id}/actions/{action}")
    public PMSchedule pmScheduleAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        return svc.pmScheduleAction(id, action, principal);
    }

    // ===========================
    // ---- PM COMPLETION
    // ===========================

    @GetMapping("/api/v1/maintenance/pm-completions")
    public List<PMCompletion> listPMCompletions() { return svc.listPMCompletions(); }

    @PostMapping("/api/v1/maintenance/pm-completions")
    public PMCompletion createPMCompletion(@RequestBody PMCompletion c, Principal principal) { return svc.createPMCompletion(c, principal); }

    @GetMapping("/api/v1/maintenance/pm-completions/{id}")
    public PMCompletion getPMCompletion(@PathVariable Long id) { return svc.getPMCompletion(id); }

    @PutMapping("/api/v1/maintenance/pm-completions/{id}")
    public PMCompletion updatePMCompletion(@PathVariable Long id, @RequestBody PMCompletion c, Principal principal) {
        return svc.updatePMCompletion(id, c, principal);
    }

    @DeleteMapping("/api/v1/maintenance/pm-completions/{id}")
    public void deletePMCompletion(@PathVariable Long id) { svc.deletePMCompletion(id); }

    @PostMapping("/api/v1/maintenance/pm-completions/{id}/actions/{action}")
    public Map<String, Object> pmCompletionAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        return svc.pmCompletionAction(id, action, principal);
    }

    // ===========================
    // ---- TOOL SERVICE
    // ===========================

    @GetMapping("/api/v1/maintenance/tool-services")
    public List<ToolServiceIntimation> listToolServices() { return svc.listToolServices(); }

    @PostMapping("/api/v1/maintenance/tool-services")
    public ToolServiceIntimation createToolService(@RequestBody ToolServiceIntimation t, Principal principal) { return svc.createToolService(t, principal); }

    @GetMapping("/api/v1/maintenance/tool-services/{id}")
    public ToolServiceIntimation getToolService(@PathVariable Long id) { return svc.getToolService(id); }

    @PutMapping("/api/v1/maintenance/tool-services/{id}")
    public ToolServiceIntimation updateToolService(@PathVariable Long id, @RequestBody ToolServiceIntimation t, Principal principal) {
        return svc.updateToolService(id, t, principal);
    }

    @DeleteMapping("/api/v1/maintenance/tool-services/{id}")
    public void deleteToolService(@PathVariable Long id) { svc.deleteToolService(id); }

    @PostMapping("/api/v1/maintenance/tool-services/{id}/actions/{action}")
    public ToolServiceIntimation toolServiceAction(@PathVariable Long id, @PathVariable String action,
                                                    @RequestBody(required = false) Map<String, String> body, Principal principal) {
        return svc.toolServiceAction(id, action, body, principal);
    }

    // ===========================
    // ---- TOOL RECTIFICATION
    // ===========================

    @GetMapping("/api/v1/maintenance/tool-rectifications")
    public List<ToolServiceRectification> listToolRectifications() { return svc.listToolRectifications(); }

    @PostMapping("/api/v1/maintenance/tool-rectifications")
    public ToolServiceRectification createToolRectification(@RequestBody ToolServiceRectification r, Principal principal) { return svc.createToolRectification(r, principal); }

    @GetMapping("/api/v1/maintenance/tool-rectifications/{id}")
    public ToolServiceRectification getToolRectification(@PathVariable Long id) { return svc.getToolRectification(id); }

    @PutMapping("/api/v1/maintenance/tool-rectifications/{id}")
    public ToolServiceRectification updateToolRectification(@PathVariable Long id, @RequestBody ToolServiceRectification r, Principal principal) {
        return svc.updateToolRectification(id, r, principal);
    }

    @DeleteMapping("/api/v1/maintenance/tool-rectifications/{id}")
    public void deleteToolRectification(@PathVariable Long id) { svc.deleteToolRectification(id); }

    @PostMapping("/api/v1/maintenance/tool-rectifications/{id}/actions/{action}")
    public ToolServiceRectification toolRectificationAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        return svc.toolRectificationAction(id, action, principal);
    }

    // ===========================
    // ---- CALIBRATION SCHEDULE
    // ===========================

    @GetMapping("/api/v1/maintenance/calibration-schedules")
    public List<CalibrationSchedule> listCalSchedules() { return svc.listCalSchedules(); }

    @PostMapping("/api/v1/maintenance/calibration-schedules")
    public CalibrationSchedule createCalSchedule(@RequestBody CalibrationSchedule cs, Principal principal) { return svc.createCalSchedule(cs, principal); }

    @GetMapping("/api/v1/maintenance/calibration-schedules/{id}")
    public CalibrationSchedule getCalSchedule(@PathVariable Long id) { return svc.getCalSchedule(id); }

    @PutMapping("/api/v1/maintenance/calibration-schedules/{id}")
    public CalibrationSchedule updateCalSchedule(@PathVariable Long id, @RequestBody CalibrationSchedule cs, Principal principal) {
        return svc.updateCalSchedule(id, cs, principal);
    }

    @DeleteMapping("/api/v1/maintenance/calibration-schedules/{id}")
    public void deleteCalSchedule(@PathVariable Long id) { svc.deleteCalSchedule(id); }

    @PostMapping("/api/v1/maintenance/calibration-schedules/{id}/actions/{action}")
    public CalibrationSchedule calScheduleAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        return svc.calScheduleAction(id, action, principal);
    }

    // ===========================
    // ---- CALIBRATION ENTRY
    // ===========================

    @GetMapping("/api/v1/maintenance/calibration-entries")
    public List<CalibrationEntry> listCalEntries() { return svc.listCalEntries(); }

    @PostMapping("/api/v1/maintenance/calibration-entries")
    public CalibrationEntry createCalEntry(@RequestBody CalibrationEntry ce, Principal principal) { return svc.createCalEntry(ce, principal); }

    @GetMapping("/api/v1/maintenance/calibration-entries/{id}")
    public CalibrationEntry getCalEntry(@PathVariable Long id) { return svc.getCalEntry(id); }

    @PutMapping("/api/v1/maintenance/calibration-entries/{id}")
    public CalibrationEntry updateCalEntry(@PathVariable Long id, @RequestBody CalibrationEntry ce, Principal principal) {
        return svc.updateCalEntry(id, ce, principal);
    }

    @DeleteMapping("/api/v1/maintenance/calibration-entries/{id}")
    public void deleteCalEntry(@PathVariable Long id) { svc.deleteCalEntry(id); }

    @PostMapping("/api/v1/maintenance/calibration-entries/{id}/actions/{action}")
    public CalibrationEntry calEntryAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        return svc.calEntryAction(id, action, principal);
    }

    // ===========================
    // ---- POWER CONSUMPTION
    // ===========================

    @GetMapping("/api/v1/maintenance/power-consumptions")
    public List<PowerConsumption> listPowerConsumptions() { return svc.listPowerConsumptions(); }

    @PostMapping("/api/v1/maintenance/power-consumptions")
    public PowerConsumption createPowerConsumption(@RequestBody PowerConsumption pc, Principal principal) { return svc.createPowerConsumption(pc, principal); }

    @GetMapping("/api/v1/maintenance/power-consumptions/{id}")
    public PowerConsumption getPowerConsumption(@PathVariable Long id) { return svc.getPowerConsumption(id); }

    @PutMapping("/api/v1/maintenance/power-consumptions/{id}")
    public PowerConsumption updatePowerConsumption(@PathVariable Long id, @RequestBody PowerConsumption pc, Principal principal) {
        return svc.updatePowerConsumption(id, pc, principal);
    }

    @DeleteMapping("/api/v1/maintenance/power-consumptions/{id}")
    public void deletePowerConsumption(@PathVariable Long id) { svc.deletePowerConsumption(id); }

    @PostMapping("/api/v1/maintenance/power-consumptions/{id}/actions/{action}")
    public PowerConsumption powerConsumptionAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        return svc.powerConsumptionAction(id, action, principal);
    }

    // ===========================
    // ---- WATER CONSUMPTION
    // ===========================

    @GetMapping("/api/v1/maintenance/water-consumptions")
    public List<WaterConsumption> listWaterConsumptions() { return svc.listWaterConsumptions(); }

    @PostMapping("/api/v1/maintenance/water-consumptions")
    public WaterConsumption createWaterConsumption(@RequestBody WaterConsumption wc, Principal principal) { return svc.createWaterConsumption(wc, principal); }

    @GetMapping("/api/v1/maintenance/water-consumptions/{id}")
    public WaterConsumption getWaterConsumption(@PathVariable Long id) { return svc.getWaterConsumption(id); }

    @PutMapping("/api/v1/maintenance/water-consumptions/{id}")
    public WaterConsumption updateWaterConsumption(@PathVariable Long id, @RequestBody WaterConsumption wc, Principal principal) {
        return svc.updateWaterConsumption(id, wc, principal);
    }

    @DeleteMapping("/api/v1/maintenance/water-consumptions/{id}")
    public void deleteWaterConsumption(@PathVariable Long id) { svc.deleteWaterConsumption(id); }

    @PostMapping("/api/v1/maintenance/water-consumptions/{id}/actions/{action}")
    public WaterConsumption waterConsumptionAction(@PathVariable Long id, @PathVariable String action, Principal principal) {
        return svc.waterConsumptionAction(id, action, principal);
    }

    // ===========================
    // ---- RCA
    // ===========================

    @GetMapping("/api/v1/maintenance/rca")
    public List<RootCauseAnalysis> listRCA() { return svc.listRCA(); }

    @PostMapping("/api/v1/maintenance/rca")
    public RootCauseAnalysis createRCA(@RequestBody RootCauseAnalysis rca, Principal principal) { return svc.createRCA(rca, principal); }

    @GetMapping("/api/v1/maintenance/rca/{id}")
    public RootCauseAnalysis getRCA(@PathVariable Long id) { return svc.getRCA(id); }

    @PutMapping("/api/v1/maintenance/rca/{id}")
    public RootCauseAnalysis updateRCA(@PathVariable Long id, @RequestBody RootCauseAnalysis rca, Principal principal) {
        return svc.updateRCA(id, rca, principal);
    }

    @DeleteMapping("/api/v1/maintenance/rca/{id}")
    public void deleteRCA(@PathVariable Long id) { svc.deleteRCA(id); }

    @PostMapping("/api/v1/maintenance/rca/{id}/actions/{action}")
    public RootCauseAnalysis rcaAction(@PathVariable Long id, @PathVariable String action,
                                        @RequestBody(required = false) Map<String, String> body, Principal principal) {
        return svc.rcaAction(id, action, body, principal);
    }

    // ===========================
    // ---- DASHBOARD / ANALYSIS
    // ===========================

    @GetMapping("/api/v1/maintenance/dashboard")
    public Map<String, Object> dashboard() { return svc.dashboard(); }

    @GetMapping("/api/v1/maintenance/mtbf/{machineCode}")
    public Map<String, Object> mtbf(@PathVariable String machineCode) { return svc.mtbf(machineCode); }

    @GetMapping("/api/v1/maintenance/analysis/downtime")
    public List<Map<String, Object>> downtimeAnalysis() { return svc.downtimeAnalysis(); }

    @GetMapping("/api/v1/maintenance/analysis/downtime/categories")
    public Map<String, Long> downtimeByCategory() { return svc.downtimeByCategory(); }

    @GetMapping("/api/v1/maintenance/analysis/downtime/priority")
    public Map<String, Long> downtimeByPriority() { return svc.downtimeByPriority(); }

    @GetMapping("/api/v1/maintenance/analysis/mtbf")
    public List<Map<String, Object>> mtbfAnalysis() { return svc.mtbfAnalysis(); }

    @GetMapping("/api/v1/maintenance/analysis/cost")
    public List<Map<String, Object>> maintenanceCostAnalysis() { return svc.maintenanceCostAnalysis(); }

    // ===========================
    // ---- REPORTS
    // ===========================

    @GetMapping("/api/v1/maintenance/reports/breakdown")
    public Map<String, Object> breakdownReport(@RequestParam(required = false) String machineCode,
                                                @RequestParam(required = false) String category,
                                                @RequestParam(required = false) String status) {
        return svc.breakdownReport(machineCode, category, status);
    }

    @GetMapping("/api/v1/maintenance/reports/pm")
    public Map<String, Object> pmReport(@RequestParam(required = false) String machineCode,
                                         @RequestParam(required = false) String status) {
        return svc.pmReport(machineCode, status);
    }

    @GetMapping("/api/v1/maintenance/reports/machine-history/{machineCode}")
    public Map<String, Object> machineHistory(@PathVariable String machineCode) { return svc.machineHistory(machineCode); }

    @GetMapping("/api/v1/maintenance/reports/spare-parts")
    public Map<String, Object> sparePartsReport() { return svc.sparePartsReport(); }

    @GetMapping("/api/v1/maintenance/reports/cost")
    public Map<String, Object> costReport(@RequestParam(required = false) String from,
                                           @RequestParam(required = false) String to) {
        return svc.costReport(from, to);
    }

    @GetMapping("/api/v1/maintenance/downtime/summary")
    public Map<String, Object> downtimeSummary() { return svc.downtimeSummary(); }

    @GetMapping("/api/v1/maintenance/reports/downtime-cost")
    public Map<String, Object> downtimeCostReport() { return svc.downtimeCostReport(); }

    // ===========================
    // ---- MASTERS
    // ===========================

    @GetMapping("/api/v1/maintenance/departments")
    public List<DepartmentMaster> listDepartments() { return svc.listDepartments(); }
    @PostMapping("/api/v1/maintenance/departments")
    public DepartmentMaster createDepartment(@RequestBody DepartmentMaster d, Principal principal) { return svc.createDepartment(d, principal); }
    @PutMapping("/api/v1/maintenance/departments/{id}")
    public DepartmentMaster updateDepartment(@PathVariable Long id, @RequestBody DepartmentMaster d, Principal principal) { return svc.updateDepartment(id, d, principal); }

    @GetMapping("/api/v1/maintenance/technicians")
    public List<TechnicianMaster> listTechnicians() { return svc.listTechnicians(); }
    @PostMapping("/api/v1/maintenance/technicians")
    public TechnicianMaster createTechnician(@RequestBody TechnicianMaster t, Principal principal) { return svc.createTechnician(t, principal); }
    @PutMapping("/api/v1/maintenance/technicians/{id}")
    public TechnicianMaster updateTechnician(@PathVariable Long id, @RequestBody TechnicianMaster t, Principal principal) { return svc.updateTechnician(id, t, principal); }

    @GetMapping("/api/v1/maintenance/breakdown-categories")
    public List<BreakdownCategoryMaster> listBreakdownCategories() { return svc.listBreakdownCategories(); }
    @PostMapping("/api/v1/maintenance/breakdown-categories")
    public BreakdownCategoryMaster createBreakdownCategory(@RequestBody BreakdownCategoryMaster bc, Principal principal) { return svc.createBreakdownCategory(bc, principal); }

    @GetMapping("/api/v1/maintenance/failure-codes")
    public List<FailureCodeMaster> listFailureCodes() { return svc.listFailureCodes(); }
    @PostMapping("/api/v1/maintenance/failure-codes")
    public FailureCodeMaster createFailureCode(@RequestBody FailureCodeMaster fc, Principal principal) { return svc.createFailureCode(fc, principal); }

    @GetMapping("/api/v1/maintenance/root-cause-codes")
    public List<RootCauseCodeMaster> listRootCauseCodes() { return svc.listRootCauseCodes(); }
    @PostMapping("/api/v1/maintenance/root-cause-codes")
    public RootCauseCodeMaster createRootCauseCode(@RequestBody RootCauseCodeMaster rc, Principal principal) { return svc.createRootCauseCode(rc, principal); }

    @GetMapping("/api/v1/maintenance/activities")
    public List<MaintenanceActivityMaster> listActivities() { return svc.listActivities(); }
    @PostMapping("/api/v1/maintenance/activities")
    public MaintenanceActivityMaster createActivity(@RequestBody MaintenanceActivityMaster a, Principal principal) { return svc.createActivity(a, principal); }

    @GetMapping("/api/v1/maintenance/pm-checklist-templates")
    public List<PmChecklistTemplate> listPmChecklistTemplates() { return svc.listPmChecklistTemplates(); }
    @PostMapping("/api/v1/maintenance/pm-checklist-templates")
    public PmChecklistTemplate createPmChecklistTemplate(@RequestBody PmChecklistTemplate t, Principal principal) { return svc.createPmChecklistTemplate(t, principal); }

    // Breakdown Assignments
    @GetMapping("/api/v1/maintenance/breakdowns/{id}/assignments")
    public List<BreakdownAssignment> listBreakdownAssignments(@PathVariable Long id) { return svc.listBreakdownAssignments(id); }
    @PostMapping("/api/v1/maintenance/breakdowns/{id}/assignments")
    public BreakdownAssignment createBreakdownAssignment(@PathVariable Long id, @RequestBody BreakdownAssignment a, Principal principal) {
        return svc.createBreakdownAssignment(id, a, principal);
    }

    // PM Checklist Items
    @GetMapping("/api/v1/maintenance/pm-completions/{id}/checklist")
    public List<PmCompletionChecklistItem> listPmChecklistItems(@PathVariable Long id) { return svc.listPmChecklistItems(id); }
    @PostMapping("/api/v1/maintenance/pm-completions/{id}/checklist/batch")
    public List<PmCompletionChecklistItem> createPmChecklistBatch(@PathVariable Long id, @RequestBody List<PmCompletionChecklistItem> items) {
        return svc.createPmChecklistBatch(id, items);
    }

    // Attachments
    @GetMapping("/api/v1/maintenance/attachments")
    public List<MaintenanceAttachment> listAttachments(@RequestParam String sourceType, @RequestParam Long sourceId) {
        return svc.listAttachments(sourceType, sourceId);
    }
    @PostMapping("/api/v1/maintenance/attachments")
    public MaintenanceAttachment createAttachment(@RequestBody MaintenanceAttachment a, Principal principal) { return svc.createAttachment(a, principal); }

    // Downtime
    @GetMapping("/api/v1/maintenance/downtime")
    public List<DowntimeTransaction> listDowntime(@RequestParam(required = false) Long machineId) { return svc.listDowntime(machineId); }

    // Notifications
    @GetMapping("/api/v1/maintenance/notifications")
    public List<NotificationLog> listNotifications(@RequestParam(required = false) String recipient,
                                                   @RequestParam(required = false) String sourceType,
                                                   @RequestParam(required = false) Long sourceId) {
        return svc.listNotifications(recipient, sourceType, sourceId);
    }
    @PostMapping("/api/v1/maintenance/notifications")
    public NotificationLog createNotification(@RequestBody NotificationLog n) { return svc.createNotification(n); }
}
