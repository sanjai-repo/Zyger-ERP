package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * §5.3 PM Work Order: a releasable, assignable task flowing through the state machine
 * DRAFT → RELEASED → ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED (or CANCELLED).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PmWorkOrderService {

    private final PmWorkOrderRepository workOrders;
    private final PMScheduleRepository pmSchedules;
    private final PMCompletionRepository pmCompletions;
    private final MachineMasterRepository machines;
    private final TechnicianMasterRepository technicians;
    private final DocNumberService numbers;
    private final NotificationService notificationService;
    private final NotificationLogRepository notificationLogs;

    private String pn(Principal p) { return p != null ? p.getName() : "system"; }

    private void created(Object e, String user) {
        try {
            e.getClass().getMethod("setCreatedAt", Instant.class).invoke(e, Instant.now());
            e.getClass().getMethod("setCreatedBy", String.class).invoke(e, user);
        } catch (Exception ignored) {}
    }

    private void audit(Object e, String user) {
        try {
            e.getClass().getMethod("setUpdatedAt", Instant.class).invoke(e, Instant.now());
            e.getClass().getMethod("setUpdatedBy", String.class).invoke(e, user);
        } catch (Exception ignored) {}
    }

    private void notify(String event, String entityType, Long entityId, String sev, String msg, String ref) {
        try {
            NotificationLog nl = new NotificationLog();
            nl.setRecipient("maintenance-supervisor");
            nl.setSourceType("PM_WORK_ORDER");
            nl.setSourceId(entityId);
            nl.setSubject(msg);
            nl.setBody(msg);
            nl.setStatus("SENT");
            nl.setSentAt(Instant.now());
            notificationLogs.save(nl);
            notificationService.notify(event, "MAINTENANCE", entityType, entityId, sev, msg, ref);
        } catch (Exception ex) {
            log.error("notification failed for PM WO id={}", entityId, ex);
        }
    }

    // ---- listing / read ----

    public List<Map<String, Object>> list(String status) {
        List<PmWorkOrder> all = (status == null || status.isBlank())
                ? workOrders.findAll()
                : workOrders.findByStatus(status);
        all.sort(Comparator.comparing(PmWorkOrder::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        return all.stream().map(w -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", w.getId());
            m.put("workOrderNumber", w.getWorkOrderNumber());
            m.put("scheduleId", w.getScheduleId());
            m.put("scheduleNumber", w.getScheduleNumber());
            m.put("planNumber", w.getPlanNumber());
            m.put("machineCode", w.getMachineCode());
            m.put("title", w.getTitle());
            m.put("description", w.getDescription());
            m.put("priority", w.getPriority());
            m.put("status", w.getStatus());
            m.put("assignedTo", w.getAssignedTo());
            m.put("assignedTechnicianId", w.getAssignedTechnicianId());
            m.put("releasedDate", w.getReleasedDate());
            m.put("startedAt", w.getStartedAt());
            m.put("completedAt", w.getCompletedAt());
            m.put("verifiedBy", w.getVerifiedBy());
            m.put("verdict", w.getVerdict());
            m.put("remarks", w.getRemarks());
            m.put("createdAt", w.getCreatedAt());
            return m;
        }).toList();
    }

    public List<Map<String, Object>> myQueue(Long technicianId) {
        List<String> active = List.of("RELEASED", "ASSIGNED", "IN_PROGRESS");
        List<PmWorkOrder> all = technicianId == null
                ? workOrders.findByStatusIn(active)
                : workOrders.findByAssignedTechnicianIdAndStatusIn(technicianId, active);
        return all.stream().map(w -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", w.getId());
            m.put("workOrderNumber", w.getWorkOrderNumber());
            m.put("machineCode", w.getMachineCode());
            m.put("title", w.getTitle());
            m.put("priority", w.getPriority());
            m.put("status", w.getStatus());
            m.put("dueDate", w.getReleasedDate());
            return m;
        }).toList();
    }

    public Map<String, Object> get(Long id) {
        PmWorkOrder w = workOrders.findById(id).orElseThrow(() -> new IllegalStateException("PM Work Order not found"));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", w.getId());
        m.put("workOrderNumber", w.getWorkOrderNumber());
        m.put("scheduleId", w.getScheduleId());
        m.put("scheduleNumber", w.getScheduleNumber());
        m.put("planNumber", w.getPlanNumber());
        m.put("machineCode", w.getMachineCode());
        m.put("title", w.getTitle());
        m.put("description", w.getDescription());
        m.put("priority", w.getPriority());
        m.put("status", w.getStatus());
        m.put("assignedTo", w.getAssignedTo());
        m.put("assignedTechnicianId", w.getAssignedTechnicianId());
        m.put("releasedDate", w.getReleasedDate());
        m.put("startedAt", w.getStartedAt());
        m.put("completedAt", w.getCompletedAt());
        m.put("verifiedBy", w.getVerifiedBy());
        m.put("verdict", w.getVerdict());
        m.put("remarks", w.getRemarks());
        return m;
    }

    // ---- create (from schedule) ----

    public PmWorkOrder create(Long scheduleId, String title, String description, Principal principal) {
        PMSchedule sched = pmSchedules.findById(scheduleId)
                .orElseThrow(() -> new IllegalStateException("PM Schedule not found"));
        PmWorkOrder wo = new PmWorkOrder();
        wo.setWorkOrderNumber(numbers.next("pm-work-order", "PWO"));
        wo.setScheduleId(sched.getId());
        wo.setScheduleNumber(sched.getScheduleNumber());
        wo.setPlanNumber(sched.getPlanNumber());
        wo.setMachineCode(sched.getMachineCode());
        wo.setTitle(title != null ? title : "PM Work Order for " + sched.getMachineCode());
        wo.setDescription(description);
        wo.setPriority(sched.getPriority() != null ? sched.getPriority() : "MEDIUM");
        wo.setStatus("RELEASED");
        wo.setReleasedDate(LocalDate.now());
        created(wo, pn(principal));
        PmWorkOrder saved = workOrders.save(wo);
        notify("PM_WO_RELEASED", "PM_WORK_ORDER", saved.getId(), "INFO",
                "PM Work Order " + saved.getWorkOrderNumber() + " released for " + sched.getMachineCode(),
                sched.getMachineCode());
        // align schedule to IN_PROGRESS
        sched.setStatus("IN_PROGRESS");
        audit(sched, pn(principal));
        pmSchedules.save(sched);
        return saved;
    }

    // ---- actions ----

    public Map<String, Object> action(Long id, String action, Map<String, Object> body, Principal principal) {
        PmWorkOrder w = workOrders.findById(id).orElseThrow(() -> new IllegalStateException("PM Work Order not found"));
        Map<String, Object> result = new LinkedHashMap<>();
        switch (action.toLowerCase()) {
            case "assign": {
                Object tid = body != null ? body.get("assignedTechnicianId") : null;
                if (tid == null) throw new IllegalStateException("assignedTechnicianId is required to assign");
                Long technicianId = Long.valueOf(tid.toString());
                TechnicianMaster tech = technicians.findById(technicianId)
                        .orElseThrow(() -> new IllegalStateException("Technician not found"));
                if (!"RELEASED".equals(w.getStatus()) && !"ASSIGNED".equals(w.getStatus()))
                    throw new IllegalStateException("Can only assign a RELEASED/ASSIGNED work order");
                w.setAssignedTechnicianId(technicianId);
                w.setAssignedTo(tech.getCode());
                w.setStatus("ASSIGNED");
                break;
            }
            case "start": {
                if (!"ASSIGNED".equals(w.getStatus()) && !"RELEASED".equals(w.getStatus()))
                    throw new IllegalStateException("Can only start an ASSIGNED work order");
                w.setStatus("IN_PROGRESS");
                w.setStartedAt(Instant.now());
                break;
            }
            case "complete": {
                if (!"IN_PROGRESS".equals(w.getStatus()))
                    throw new IllegalStateException("Can only complete an IN_PROGRESS work order");
                w.setStatus("COMPLETED");
                w.setCompletedAt(Instant.now());
                break;
            }
            case "verify": {
                if (!"COMPLETED".equals(w.getStatus()))
                    throw new IllegalStateException("Can only verify a COMPLETED work order");
                Object verdict = body != null ? body.get("verdict") : null;
                if (verdict == null) throw new IllegalStateException("verdict (PASS/FAIL) is required to verify");
                w.setVerdict(verdict.toString());
                w.setStatus("VERIFIED");
                w.setVerifiedBy(pn(principal));
                if (w.getScheduleId() != null) {
                    pmSchedules.findById(w.getScheduleId()).ifPresent(s -> {
                        s.setStatus("COMPLETED");
                        s.setCompletedDate(LocalDate.now());
                        audit(s, pn(principal));
                        pmSchedules.save(s);
                    });
                }
                break;
            }
            case "cancel": {
                if ("COMPLETED".equals(w.getStatus()) || "VERIFIED".equals(w.getStatus()))
                    throw new IllegalStateException("Cannot cancel a COMPLETED/VERIFIED work order");
                w.setStatus("CANCELLED");
                break;
            }
            default:
                throw new IllegalStateException("Unknown action: " + action);
        }
        audit(w, pn(principal));
        workOrders.save(w);
        result.put("success", true);
        result.put("status", w.getStatus());
        return result;
    }
}
