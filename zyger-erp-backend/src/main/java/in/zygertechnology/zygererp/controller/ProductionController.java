package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import in.zygertechnology.zygererp.service.DocNumberService;
import in.zygertechnology.zygererp.service.PrintService;
import in.zygertechnology.zygererp.service.StockService;
import in.zygertechnology.zygererp.repo.ItemRepository;
import in.zygertechnology.zygererp.repo.MachineMasterRepository;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;
import jakarta.servlet.http.HttpServletRequest;

import java.security.Principal;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequirePermission(module = "PRODUCTION", screen = "*", action = "VIEW")
@RequiredArgsConstructor
public class ProductionController {

    private final JobCardRepository jobCards;
    private final JobCardSubjobRepository jobCardSubjobs;
    private final ProductionEntryRepository productionEntries;
    private final ProductConversionRepository productConversions;
    private final ProductionReturnRepository productionReturns;
    private final ProductionLogSheetRepository productionLogSheets;
    private final ProductionLogActivityRepository productionLogActivities;
    private final IdleTimeEntryRepository idleTimeEntries;
    private final WorkOrderRepository workOrders;
    private final WorkOrderRepository woRepo;
    private final RouteSheetRepository routeSheets;
    private final ProductionBOMRepository productionBoms;
    private final ProductionReturnRepository productionReturnsRef;
    private final DocNumberService numbers;
    private final ItemRepository items;
    private final MachineMasterRepository machines;
    private final PrintService printer;
    @Lazy private final StockService stockService;
    private final jakarta.persistence.EntityManager em;
    private final in.zygertechnology.zygererp.service.WorkflowStateMachine stateMachine;
    private final in.zygertechnology.zygererp.service.ProductionRollupService rollupService;
    private final in.zygertechnology.zygererp.service.ProductionEntryValidationService entryValidator;
    private final PostingIdempotencyKeyRepository idempotencyKeys;
    private final ProductionEntryAuditLogRepository auditLogs;

    private static String principalName(Principal p) { return p != null ? p.getName() : "system"; }

    // ===========================
    // ---- JOB CARD -------------
    // ===========================

    @GetMapping("/api/v1/production/job-cards")
    public List<JobCard> listJobCards() { return jobCards.findAll(); }

    @PostMapping("/api/v1/production/job-cards")
    public JobCard createJobCard(@RequestBody JobCard jc, Principal p) {
        jc.setId(null);
        // Validate FK references
        if (jc.getWorkOrderNumber() != null && !jc.getWorkOrderNumber().isBlank()) {
            List<WorkOrder> woList = workOrders.findByWoNumber(jc.getWorkOrderNumber());
            if (woList.isEmpty()) throw new RuntimeException("Work Order not found: " + jc.getWorkOrderNumber());
        }
        if (jc.getPartCode() != null && !jc.getPartCode().isBlank()) {
            if (!items.existsByCode(jc.getPartCode())) {
                throw new RuntimeException("Item code '" + jc.getPartCode() + "' does not exist");
            }
        }
        jc.setJobCardNumber(numbers.next("job-card", "JCF"));
        if (jc.getPlannedQuantity() == null) jc.setPlannedQuantity(BigDecimal.ZERO);
        if (jc.getCompletedQuantity() == null) jc.setCompletedQuantity(BigDecimal.ZERO);
        if (jc.getReworkQuantity() == null) jc.setReworkQuantity(BigDecimal.ZERO);
        if (jc.getRejectedQuantity() == null) jc.setRejectedQuantity(BigDecimal.ZERO);
        if (jc.getScrapQuantity() == null) jc.setScrapQuantity(BigDecimal.ZERO);
        if (jc.getStatus() == null) jc.setStatus("DRAFT");
        jc.setCreatedBy(principalName(p));
        jc.setCreatedAt(Instant.now());
        return jobCards.save(jc);
    }

    @PostMapping("/api/v1/production/job-cards/from-work-order")
    public JobCard createFromWorkOrder(@RequestBody Map<String, Object> body, Principal p) {
        String woNumber = (String) body.get("workOrderNumber");
        if (woNumber == null || woNumber.isBlank()) throw new RuntimeException("Work Order Number is required");

        // Try by woNumber first, then by docNo
        List<WorkOrder> woList = workOrders.findByWoNumber(woNumber);
        if (woList.isEmpty()) {
            // Try looking up by the document number in the generic doc system
            woList = workOrders.findAll().stream()
                .filter(w -> woNumber.equalsIgnoreCase(w.getWoNumber()) || woNumber.equalsIgnoreCase(w.getDocNo()))
                .collect(Collectors.toList());
        }
        if (woList.isEmpty()) throw new RuntimeException("Work Order not found: " + woNumber);
        WorkOrder wo = woList.get(0);

        if ("DRAFT".equals(wo.getStatus())) {
            wo.setStatus("APPROVED");
            workOrders.save(wo);
        } else if (!"APPROVED".equals(wo.getStatus()) && !"RELEASED".equals(wo.getStatus())) {
            throw new RuntimeException("Work Order must be DRAFT, APPROVED or RELEASED. Current status: " + wo.getStatus());
        }

        JobCard jc = new JobCard();
        jc.setJobCardNumber(numbers.next("job-card", "JCF"));
        jc.setWorkOrderNumber(wo.getDocNo() != null ? wo.getDocNo() : wo.getWoNumber());
        jc.setPartCode(wo.getItemCode());
        jc.setPartDescription(wo.getItemCode());
        jc.setRevision(wo.getItemRevision());
        jc.setPlannedQuantity(wo.getOrderQuantity());
        jc.setPriority(wo.getPriority() != null ? wo.getPriority() : "MEDIUM");
        if (wo.getPlannedStartDate() != null) jc.setPlannedStartDate(wo.getPlannedStartDate().atStartOfDay(ZoneId.systemDefault()).toInstant());
        if (wo.getDueDate() != null) jc.setPlannedEndDate(wo.getDueDate().atStartOfDay(ZoneId.systemDefault()).toInstant());
        jc.setCustomerCode(wo.getCustomerCode());
        jc.setCompletedQuantity(BigDecimal.ZERO);
        jc.setReworkQuantity(BigDecimal.ZERO);
        jc.setRejectedQuantity(BigDecimal.ZERO);
        jc.setScrapQuantity(BigDecimal.ZERO);
        jc.setStatus("DRAFT");

        // Link BOM and Route
        if (wo.getRouteId() != null) {
            routeSheets.findById(wo.getRouteId()).ifPresent(route -> {
                jc.setRouteSheetNumber(route.getRouteNumber());
            });
        }
        if (wo.getBomId() != null) {
            productionBoms.findById(wo.getBomId()).ifPresent(bom -> {
                jc.setBomNumber(bom.getBomNumber());
            });
        }

        jc.setCreatedBy(principalName(p));
        jc.setCreatedAt(Instant.now());
        JobCard saved = jobCards.save(jc);

        // Auto-create subjobs from Route Sheet operations
        if (wo.getRouteId() != null) {
            routeSheets.findById(wo.getRouteId()).ifPresent(route -> {
                int seqNo = 1;
                for (RouteOperation op : route.getOperations()) {
                    JobCardSubjob sub = new JobCardSubjob();
                    sub.setJobCard(saved);
                    sub.setSubjobNumber(saved.getJobCardNumber() + "-S" + String.format("%02d", seqNo));
                    sub.setOperationCode(op.getOperationCode());
                    sub.setOperationDescription(op.getOperationDescription());
                    sub.setSequenceNo(op.getSequenceNo() != null ? op.getSequenceNo() : seqNo);
                    sub.setMachineCode(op.getMachineCode());
                    sub.setWorkCenterCode(op.getWorkCenterCode());
                    sub.setPlannedQuantity(saved.getPlannedQuantity());
                    sub.setCompletedQuantity(BigDecimal.ZERO);
                    sub.setReworkQuantity(BigDecimal.ZERO);
                    sub.setRejectedQuantity(BigDecimal.ZERO);
                    sub.setScrapQuantity(BigDecimal.ZERO);
                    sub.setStatus("PENDING");
                    sub.setInspectionRequired(op.isInspectionRequired());
                    sub.setCreatedAt(Instant.now());
                    jobCardSubjobs.save(sub);
                    seqNo++;
                }
            });
        }

        return jobCards.findById(saved.getId()).orElse(saved);
    }

    @GetMapping("/api/v1/production/job-cards/{id}")
    public JobCard getJobCard(@PathVariable Long id) {
        return jobCards.findById(id).orElseThrow(() -> new RuntimeException("Job Card not found"));
    }

    @PutMapping("/api/v1/production/job-cards/{id}")
    public JobCard updateJobCard(@PathVariable Long id, @RequestBody JobCard jc, Principal p) {
        JobCard e = jobCards.findById(id).orElseThrow(() -> new RuntimeException("Job Card not found"));
        if (!"DRAFT".equals(e.getStatus()) && !"ON_HOLD".equals(e.getStatus())) {
            throw new RuntimeException("Only DRAFT or ON_HOLD job cards can be edited");
        }
        jc.setId(id);
        jc.setJobCardNumber(e.getJobCardNumber());
        jc.setCreatedAt(e.getCreatedAt());
        jc.setCreatedBy(e.getCreatedBy());
        jc.setUpdatedAt(Instant.now());
        jc.setUpdatedBy(principalName(p));
        return jobCards.save(jc);
    }

    @DeleteMapping("/api/v1/production/job-cards/{id}")
    public void deleteJobCard(@PathVariable Long id) {
        JobCard e = jobCards.findById(id).orElseThrow(() -> new RuntimeException("Job Card not found"));
        if (!"DRAFT".equals(e.getStatus())) throw new RuntimeException("Only DRAFT job cards can be deleted");
        jobCardSubjobs.findByJobCardId(id).forEach(l -> jobCardSubjobs.deleteById(l.getId()));
        jobCards.deleteById(id);
    }

    @PostMapping("/api/v1/production/job-cards/{id}/actions/{action}")
    public Map<String, Object> jobCardAction(@PathVariable Long id, @PathVariable String action,
                                              @RequestBody(required = false) Map<String, String> body,
                                              Principal p) {
        JobCard jc = jobCards.findById(id).orElseThrow(() -> new RuntimeException("Job Card not found"));
        String note = body != null ? body.getOrDefault("note", "") : "";
        Map<String, Object> result = new LinkedHashMap<>();
        List<String> errors = new ArrayList<>();

        switch (action.toLowerCase()) {
            case "approve": {
                jc.setStatus("APPROVED");
                break;
            }
            case "release": {
                // Validate: must have subjobs
                List<JobCardSubjob> subs = jobCardSubjobs.findByJobCardId(id);
                if (subs.isEmpty()) {
                    errors.add("Job Card must have at least one subjob/operation before release");
                }
                // Validate: BOM and Route should be linked
                if (jc.getBomNumber() == null || jc.getBomNumber().isBlank()) {
                    errors.add("Production BOM must be linked before release");
                }
                if (jc.getRouteSheetNumber() == null || jc.getRouteSheetNumber().isBlank()) {
                    errors.add("Route Sheet must be linked before release");
                }
                if (!errors.isEmpty()) {
                    result.put("success", false);
                    result.put("errors", errors);
                    return result;
                }
                jc.setStatus("RELEASED");
                jc.setReleaseRemarks(note);
                break;
            }
            case "start": {
                jc.setStatus("IN_PROGRESS");
                jc.setActualStartDate(Instant.now());
                break;
            }
            case "hold": {
                jc.setStatus("ON_HOLD");
                jc.setHoldReason(note);
                break;
            }
            case "quality-hold": {
                jc.setStatus("QUALITY_HOLD");
                jc.setHoldReason(note);
                break;
            }
            case "production-hold": {
                jc.setStatus("PRODUCTION_HOLD");
                jc.setHoldReason(note);
                break;
            }
            case "release-hold": {
                if (!"QUALITY_HOLD".equals(jc.getStatus()) && !"PRODUCTION_HOLD".equals(jc.getStatus())) {
                    errors.add("Job Card must be on QUALITY_HOLD or PRODUCTION_HOLD to release hold");
                    result.put("success", false);
                    result.put("errors", errors);
                    return result;
                }
                jc.setStatus("RELEASED");
                break;
            }
            case "reopen": {
                if (!"COMPLETED".equals(jc.getStatus())) {
                    errors.add("Only COMPLETED job cards can be reopened");
                    result.put("success", false);
                    result.put("errors", errors);
                    return result;
                }
                jc.setStatus("RELEASED");
                break;
            }
            case "resume": {
                jc.setStatus("IN_PROGRESS");
                break;
            }
            case "complete": {
                // Validate all subjobs completed
                List<JobCardSubjob> subs = jobCardSubjobs.findByJobCardId(id);
                List<String> incomplete = new ArrayList<>();
                for (JobCardSubjob s : subs) {
                    if (!"COMPLETED".equals(s.getStatus())) {
                        incomplete.add(s.getSubjobNumber() + " (" + s.getOperationCode() + ") - " + s.getStatus());
                    }
                }
                if (!incomplete.isEmpty()) {
                    errors.add("The following subjobs are not completed: " + String.join("; ", incomplete));
                }

                // Validate quantities reconcile
                BigDecimal totalPlanned = subs.stream()
                    .map(s -> s.getPlannedQuantity() == null ? BigDecimal.ZERO : s.getPlannedQuantity())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal totalCompleted = subs.stream()
                    .map(s -> s.getCompletedQuantity() == null ? BigDecimal.ZERO : s.getCompletedQuantity())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

                // Update JC quantities from subjobs
                BigDecimal totalGood = BigDecimal.ZERO;
                BigDecimal totalRework = BigDecimal.ZERO;
                BigDecimal totalReject = BigDecimal.ZERO;
                BigDecimal totalScrap = BigDecimal.ZERO;
                for (JobCardSubjob s : subs) {
                    totalGood = totalGood.add(s.getCompletedQuantity() == null ? BigDecimal.ZERO : s.getCompletedQuantity());
                    totalRework = totalRework.add(s.getReworkQuantity() == null ? BigDecimal.ZERO : s.getReworkQuantity());
                    totalReject = totalReject.add(s.getRejectedQuantity() == null ? BigDecimal.ZERO : s.getRejectedQuantity());
                    totalScrap = totalScrap.add(s.getScrapQuantity() == null ? BigDecimal.ZERO : s.getScrapQuantity());
                }
                jc.setCompletedQuantity(totalGood);
                jc.setReworkQuantity(totalRework);
                jc.setRejectedQuantity(totalReject);
                jc.setScrapQuantity(totalScrap);

                // Validate quality: check if any subjob with inspection required is on quality hold
                boolean qualityPending = subs.stream().anyMatch(s ->
                    Boolean.TRUE.equals(s.getInspectionRequired()) && "COMPLETED".equals(s.getStatus())
                    && !"QUALITY_HOLD".equals(s.getStatus()));
                if (qualityPending) {
                    // Allow completion but warn
                }

                // Overproduction check: total output must not exceed planned + 10% tolerance
                BigDecimal plannedQty = jc.getPlannedQuantity() == null ? BigDecimal.ZERO : jc.getPlannedQuantity();
                BigDecimal totalOutput = totalGood.add(totalRework);
                BigDecimal tolerance = plannedQty.multiply(new BigDecimal("0.10"));
                if (plannedQty.compareTo(BigDecimal.ZERO) > 0 && totalOutput.compareTo(plannedQty.add(tolerance)) > 0) {
                    errors.add("Overproduction detected: completed " + totalOutput + " against planned " + plannedQty + " (max allowed: " + plannedQty.add(tolerance) + ")");
                }

                if (!errors.isEmpty()) {
                    result.put("success", false);
                    result.put("errors", errors);
                    return result;
                }

                jc.setStatus("COMPLETED");
                jc.setActualEndDate(Instant.now());
                jc.setCompleteRemarks(note);
                jc.setCompletionStatus("COMPLETE");

                if (totalGood.compareTo(BigDecimal.ZERO) > 0 && jc.getPartCode() != null) {
                    stockService.recordStockIn(
                        jc.getJobCardNumber(), "job-card-complete", "FG_RECEIPT",
                        jc.getPartCode(), "STORE", null, null,
                        totalGood, LocalDate.now(), principalName(p), "FREE");
                }

                // FRS §8: Auto-create IPQC inspection on production completion
                if (totalGood.compareTo(BigDecimal.ZERO) > 0 && jc.getPartCode() != null) {
                    try {
                        QualityInspection qi = new QualityInspection();
                        qi.setDocNo(numbers.next("QUALITY_INSPECTION", "QC"));
                        qi.setInspectionType(QualityInspectionType.IPQC);
                        qi.setSourceType("PRODUCTION");
                        qi.setSourceNumber(jc.getJobCardNumber());
                        qi.setDocDate(LocalDate.now());
                        qi.setInspectionDate(LocalDate.now());
                        qi.setItemCode(jc.getPartCode());
                        qi.setReceivedQuantity(totalGood);
                        qi.setInspectionQuantity(totalGood);
                        qi.setInspectionStatus("DRAFT");
                        qi.setDecisionStatus("PENDING");
                        qi.setCreatedBy(principalName(p));
                        qi.setCreatedAt(Instant.now());
                        qi.setUpdatedAt(Instant.now());
                        em.persist(qi);
                    } catch (Exception ignored) {}
                }
                break;
            }
            case "close": {
                if (!"COMPLETED".equals(jc.getStatus())) {
                    errors.add("Job Card must be COMPLETED before closing");
                    result.put("success", false);
                    result.put("errors", errors);
                    return result;
                }
                jc.setStatus("CLOSED");
                break;
            }
            case "cancel": {
                if ("CLOSED".equals(jc.getStatus())) {
                    errors.add("CLOSED job cards cannot be cancelled");
                    result.put("success", false);
                    result.put("errors", errors);
                    return result;
                }
                jc.setStatus("CANCELLED");
                break;
            }
            default:
                throw new RuntimeException("Unknown action: " + action);
        }
        jc.setUpdatedAt(Instant.now());
        jc.setUpdatedBy(principalName(p));
        jobCards.save(jc);

        result.put("success", true);
        result.put("jobCard", jobCards.findById(id).orElse(jc));
        return result;
    }

    // ---- Completion Check (dry run) ----

    @GetMapping("/api/v1/production/job-cards/{id}/completion-check")
    public Map<String, Object> completionCheck(@PathVariable Long id) {
        JobCard jc = jobCards.findById(id).orElseThrow(() -> new RuntimeException("Job Card not found"));
        List<JobCardSubjob> subs = jobCardSubjobs.findByJobCardId(id);
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> checks = new ArrayList<>();

        // Check 1: All subjobs completed
        boolean allCompleted = subs.stream().allMatch(s -> "COMPLETED".equals(s.getStatus()));
        checks.add(Map.of(
            "check", "All Operations Complete",
            "passed", allCompleted,
            "detail", subs.stream().map(s -> s.getSubjobNumber() + ": " + s.getStatus()).collect(Collectors.joining(", "))
        ));

        // Check 2: Required quantity accounted for
        BigDecimal totalPlanned = subs.stream()
            .map(s -> s.getPlannedQuantity() == null ? BigDecimal.ZERO : s.getPlannedQuantity())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCompleted = subs.stream()
            .map(s -> s.getCompletedQuantity() == null ? BigDecimal.ZERO : s.getCompletedQuantity())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean qtyOk = totalCompleted.compareTo(BigDecimal.ZERO) > 0;
        checks.add(Map.of(
            "check", "Quantity Accounted For",
            "passed", qtyOk,
            "detail", "Completed: " + totalCompleted + " / Planned: " + totalPlanned
        ));

        // Check 3: Quality inspection
        boolean qualityOk = subs.stream()
            .filter(s -> Boolean.TRUE.equals(s.getInspectionRequired()))
            .allMatch(s -> "COMPLETED".equals(s.getStatus()));
        checks.add(Map.of(
            "check", "Quality Inspection",
            "passed", qualityOk,
            "detail", "Inspection required operations: " +
                subs.stream().filter(s -> Boolean.TRUE.equals(s.getInspectionRequired())).count()
        ));

        // Check 4: Rework resolved
        long reworkCount = subs.stream()
            .filter(s -> s.getReworkQuantity() != null && s.getReworkQuantity().compareTo(BigDecimal.ZERO) > 0)
            .count();
        checks.add(Map.of(
            "check", "Rework Resolved",
            "passed", reworkCount == 0,
            "detail", reworkCount + " operations with rework"
        ));

        // Check 5: Scrap recorded
        long scrapCount = subs.stream()
            .filter(s -> s.getScrapQuantity() != null && s.getScrapQuantity().compareTo(BigDecimal.ZERO) > 0)
            .count();
        checks.add(Map.of(
            "check", "Scrap Recorded",
            "passed", true,
            "detail", scrapCount + " operations with scrap"
        ));

        boolean canComplete = allCompleted && qtyOk;
        result.put("jobCardNumber", jc.getJobCardNumber());
        result.put("canComplete", canComplete);
        result.put("checks", checks);
        return result;
    }

    // ---- Subjobs ----

    @GetMapping("/api/v1/production/job-cards/{id}/subjobs")
    public List<JobCardSubjob> getSubjobs(@PathVariable Long id) {
        return jobCardSubjobs.findByJobCardId(id);
    }

    @PostMapping("/api/v1/production/job-cards/{id}/subjobs")
    public JobCardSubjob addSubjob(@PathVariable Long id, @RequestBody JobCardSubjob sj, Principal p) {
        JobCard jc = jobCards.findById(id).orElseThrow(() -> new RuntimeException("Job Card not found"));
        if (!"DRAFT".equals(jc.getStatus()) && !"RELEASED".equals(jc.getStatus())) {
            throw new RuntimeException("Subjobs can only be added to DRAFT or RELEASED job cards");
        }
        if (sj.getMachineCode() != null && !sj.getMachineCode().isBlank()) {
            if (!machines.existsByCode(sj.getMachineCode())) {
                throw new RuntimeException("Machine code '" + sj.getMachineCode() + "' does not exist");
            }
        }
        sj.setId(null);
        sj.setJobCard(jc);
        if (sj.getPlannedQuantity() == null) sj.setPlannedQuantity(jc.getPlannedQuantity());
        if (sj.getCompletedQuantity() == null) sj.setCompletedQuantity(BigDecimal.ZERO);
        if (sj.getReworkQuantity() == null) sj.setReworkQuantity(BigDecimal.ZERO);
        if (sj.getRejectedQuantity() == null) sj.setRejectedQuantity(BigDecimal.ZERO);
        if (sj.getScrapQuantity() == null) sj.setScrapQuantity(BigDecimal.ZERO);
        if (sj.getStatus() == null) sj.setStatus("PENDING");
        sj.setCreatedAt(Instant.now());
        return jobCardSubjobs.save(sj);
    }

    @PutMapping("/api/v1/production/job-cards/subjobs/{lineId}")
    public JobCardSubjob updateSubjob(@PathVariable Long lineId, @RequestBody JobCardSubjob sj, Principal p) {
        JobCardSubjob e = jobCardSubjobs.findById(lineId).orElseThrow(() -> new RuntimeException("Subjob not found"));
        sj.setId(lineId);
        sj.setJobCard(e.getJobCard());
        sj.setCreatedAt(e.getCreatedAt());
        sj.setUpdatedAt(Instant.now());
        sj.setUpdatedBy(principalName(p));
        return jobCardSubjobs.save(sj);
    }

    @DeleteMapping("/api/v1/production/job-cards/subjobs/{lineId}")
    public void deleteSubjob(@PathVariable Long lineId) {
        JobCardSubjob e = jobCardSubjobs.findById(lineId).orElseThrow(() -> new RuntimeException("Subjob not found"));
        if (!"PENDING".equals(e.getStatus()) && !"RELEASED".equals(e.getStatus())) {
            throw new RuntimeException("Only PENDING or RELEASED subjobs can be deleted");
        }
        jobCardSubjobs.deleteById(lineId);
    }

    @PostMapping("/api/v1/production/job-cards/subjobs/{lineId}/actions/{action}")
    public JobCardSubjob subjobAction(@PathVariable Long lineId, @PathVariable String action, Principal p) {
        JobCardSubjob sj = jobCardSubjobs.findById(lineId).orElseThrow(() -> new RuntimeException("Subjob not found"));
        switch (action.toLowerCase()) {
            case "release": sj.setStatus("RELEASED"); break;
            case "start": sj.setStatus("IN_PROGRESS"); sj.setStartTime(Instant.now()); break;
            case "hold": sj.setStatus("ON_HOLD"); break;
            case "quality-hold": sj.setStatus("QUALITY_HOLD"); break;
            case "production-hold": sj.setStatus("PRODUCTION_HOLD"); break;
            case "release-hold": {
                if (!"QUALITY_HOLD".equals(sj.getStatus()) && !"PRODUCTION_HOLD".equals(sj.getStatus())) {
                    throw new RuntimeException("Subjob must be on QUALITY_HOLD or PRODUCTION_HOLD to release hold");
                }
                sj.setStatus("RELEASED");
                break;
            }
            case "resume": sj.setStatus("IN_PROGRESS"); break;
            case "complete": sj.setStatus("COMPLETED"); sj.setEndTime(Instant.now()); break;
            case "cancel": {
                if ("COMPLETED".equals(sj.getStatus()) || "CLOSED".equals(sj.getStatus())) {
                    throw new RuntimeException("COMPLETED/CLOSED subjobs cannot be cancelled");
                }
                sj.setStatus("CANCELLED");
                break;
            }
            default: throw new RuntimeException("Unknown action: " + action);
        }
        sj.setUpdatedAt(Instant.now());
        sj.setUpdatedBy(principalName(p));
        return jobCardSubjobs.save(sj);
    }

    // ===========================
    // ---- PRODUCTION ENTRY -----
    // ===========================

    @GetMapping("/api/v1/production/entries")
    public List<ProductionEntry> listProductionEntries() { return productionEntries.findAll(); }

    @PostMapping("/api/v1/production/entries")
    @Transactional
    public ProductionEntry createProductionEntry(@RequestBody ProductionEntry pe, Principal p) {
        pe.setId(null);
        pe.setEntryNumber(numbers.next("production-entry", "PE"));

        BigDecimal processQty = pe.getProcessQty() != null ? pe.getProcessQty() : (pe.getProducedQuantity() != null ? pe.getProducedQuantity() : BigDecimal.ZERO);
        BigDecimal good = pe.getGoodQuantity() != null ? pe.getGoodQuantity() : BigDecimal.ZERO;
        BigDecimal rework = pe.getReworkQuantity() != null ? pe.getReworkQuantity() : BigDecimal.ZERO;
        BigDecimal reject = pe.getRejectedQuantity() != null ? pe.getRejectedQuantity() : BigDecimal.ZERO;
        BigDecimal scrap = pe.getScrapQuantity() != null ? pe.getScrapQuantity() : BigDecimal.ZERO;

        // Auto-derive good quantity if not manually specified
        if (good.compareTo(BigDecimal.ZERO) == 0 && processQty.compareTo(BigDecimal.ZERO) > 0 && rework.add(reject).compareTo(BigDecimal.ZERO) > 0) {
            good = processQty.subtract(rework).subtract(reject);
            pe.setGoodQuantity(good);
        }

        pe.setProducedQuantity(processQty);
        pe.setProcessQty(processQty);

        if (pe.getStatus() == null) pe.setStatus("DRAFT");
        if (pe.getQualityStatus() == null) pe.setQualityStatus("PENDING");
        pe.setCreatedBy(principalName(p));
        pe.setCreatedAt(Instant.now());

        // Validate rules
        entryValidator.validate(pe);
        entryValidator.validateSequenceAndPending(pe);

        // Ensure proper JPA bi-directional linkages
        pe.setOperators(pe.getOperators());
        pe.setRejectionReasons(pe.getRejectionReasons());
        pe.setReworkReasons(pe.getReworkReasons());
        pe.setMaterials(pe.getMaterials());
        pe.setBatchAllocations(pe.getBatchAllocations());

        ProductionEntry saved = productionEntries.save(pe);

        // Audit Log Event
        try {
            auditLogs.save(ProductionEntryAuditLog.builder()
                    .entryId(saved.getId())
                    .eventType("CREATE")
                    .userId(principalName(p))
                    .timestamp(Instant.now())
                    .metadataJson("{\"entryNumber\":\"" + saved.getEntryNumber() + "\"}")
                    .build());
        } catch (Exception ignored) {}

        return saved;
    }

    @GetMapping("/api/v1/production/entries/{id}")
    public ProductionEntry getProductionEntry(@PathVariable Long id) {
        return productionEntries.findById(id).orElseThrow(() -> new RuntimeException("Production Entry not found"));
    }

    @GetMapping("/api/v1/production/entries/eligible-operations")
    public List<Map<String, Object>> getEligibleOperations(@RequestParam String jobCardNumber,
                                                           @RequestParam(defaultValue = "true") boolean pendingSequenceOnly) {
        List<Map<String, Object>> result = new ArrayList<>();
        List<JobCardSubjob> subjobs = jobCardSubjobs.findByJobCardJobCardNumber(jobCardNumber);
        subjobs.sort((a, b) -> Integer.compare(a.getSequenceNo() != null ? a.getSequenceNo() : 0, b.getSequenceNo() != null ? b.getSequenceNo() : 0));

        boolean priorCompleted = true;
        for (JobCardSubjob sj : subjobs) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("subjobNumber", sj.getSubjobNumber());
            map.put("operationCode", sj.getOperationCode());
            map.put("operationDescription", sj.getOperationDescription());
            map.put("sequenceNo", sj.getSequenceNo());
            map.put("machineCode", sj.getMachineCode());
            map.put("workCenterCode", sj.getWorkCenterCode());
            map.put("plannedQuantity", sj.getPlannedQuantity());
            map.put("completedQuantity", sj.getCompletedQuantity());
            BigDecimal pendingQty = (sj.getPlannedQuantity() != null ? sj.getPlannedQuantity() : BigDecimal.ZERO)
                    .subtract(sj.getCompletedQuantity() != null ? sj.getCompletedQuantity() : BigDecimal.ZERO);
            map.put("pendingQuantity", pendingQty);
            map.put("status", sj.getStatus());
            map.put("eligible", !pendingSequenceOnly || priorCompleted);

            result.add(map);

            if (!"COMPLETED".equalsIgnoreCase(sj.getStatus()) && !"POSTED".equalsIgnoreCase(sj.getStatus())) {
                priorCompleted = false;
            }
        }
        return result;
    }

    @PutMapping("/api/v1/production/entries/{id}")
    @Transactional
    public ProductionEntry updateProductionEntry(@PathVariable Long id, @RequestBody ProductionEntry pe, Principal p) {
        ProductionEntry e = productionEntries.findById(id).orElseThrow(() -> new RuntimeException("Production Entry not found"));

        // V-22: Posted entries cannot be modified directly
        if ("POSTED".equalsIgnoreCase(e.getStatus()) || "COMPLETED".equalsIgnoreCase(e.getStatus())) {
            throw new IllegalArgumentException("Posted Production Entry cannot be edited directly (V-22). Create a reversal/correction transaction.");
        }

        pe.setId(id);
        pe.setEntryNumber(e.getEntryNumber());

        BigDecimal processQty = pe.getProcessQty() != null ? pe.getProcessQty() : (pe.getProducedQuantity() != null ? pe.getProducedQuantity() : BigDecimal.ZERO);
        pe.setProducedQuantity(processQty);
        pe.setProcessQty(processQty);

        pe.setCreatedAt(e.getCreatedAt());
        pe.setCreatedBy(e.getCreatedBy());
        pe.setUpdatedAt(Instant.now());
        pe.setUpdatedBy(principalName(p));

        entryValidator.validate(pe);
        entryValidator.validateSequenceAndPending(pe);

        pe.setOperators(pe.getOperators());
        pe.setRejectionReasons(pe.getRejectionReasons());
        pe.setReworkReasons(pe.getReworkReasons());
        pe.setMaterials(pe.getMaterials());
        pe.setBatchAllocations(pe.getBatchAllocations());

        ProductionEntry saved = productionEntries.save(pe);

        // Audit Log Event
        try {
            auditLogs.save(ProductionEntryAuditLog.builder()
                    .entryId(saved.getId())
                    .eventType("DRAFT_SAVE")
                    .userId(principalName(p))
                    .timestamp(Instant.now())
                    .build());
        } catch (Exception ignored) {}

        return saved;
    }

    @DeleteMapping("/api/v1/production/entries/{id}")
    @Transactional
    public void deleteProductionEntry(@PathVariable Long id, Principal p) {
        ProductionEntry e = productionEntries.findById(id).orElseThrow(() -> new RuntimeException("Production Entry not found"));
        if (!"DRAFT".equals(e.getStatus())) throw new RuntimeException("Only DRAFT entries can be deleted");

        try {
            auditLogs.save(ProductionEntryAuditLog.builder()
                    .entryId(e.getId())
                    .eventType("CANCEL")
                    .userId(principalName(p))
                    .timestamp(Instant.now())
                    .metadataJson("{\"entryNumber\":\"" + e.getEntryNumber() + "\"}")
                    .build());
        } catch (Exception ignored) {}

        productionEntries.deleteById(id);
    }

    @PostMapping("/api/v1/production/entries/{id}/actions/{action}")
    @Transactional
    public ProductionEntry productionEntryAction(@PathVariable Long id, @PathVariable String action,
                                                  @RequestBody(required = false) Map<String, String> body,
                                                  HttpServletRequest request,
                                                  Principal p) {
        ProductionEntry pe = productionEntries.findById(id).orElseThrow(() -> new RuntimeException("Production Entry not found"));
        String act = action.toLowerCase();

        // Idempotency Key Guard for Post action (§4.3, §5.9, §9)
        String idempotencyKeyHeader = request != null ? request.getHeader("X-Idempotency-Key") : null;
        if (idempotencyKeyHeader == null && request != null) {
            idempotencyKeyHeader = request.getHeader("Idempotency-Key");
        }

        if ("post".equals(act) && idempotencyKeyHeader != null && !idempotencyKeyHeader.isBlank()) {
            Optional<PostingIdempotencyKey> existingKey = idempotencyKeys.findByIdempotencyKey(idempotencyKeyHeader);
            if (existingKey.isPresent() && "SUCCESS".equals(existingKey.get().getResultStatus())) {
                return pe; // Return already processed result idempotently (FR-45)
            }
        }

        switch (act) {
            case "submit": {
                if (pe.getProductionDate() != null && pe.getJobCardNumber() != null && !pe.getJobCardNumber().isBlank()) {
                    JobCard jc = jobCards.findByJobCardNumber(pe.getJobCardNumber()).stream().findFirst().orElse(null);
                    if (jc != null && jc.getActualStartDate() != null && pe.getProductionDate().isBefore(jc.getActualStartDate())) {
                        String reason = body != null ? body.get("backdatedReason") : null;
                        if (reason == null || reason.isBlank()) {
                            throw new IllegalArgumentException("Backdated entry requires a reason. Pass backdatedReason parameter.");
                        }
                    }
                }
                pe.setStatus("SUBMITTED");
                break;
            }
            case "approve": pe.setStatus("APPROVED"); break;
            case "post": {
                // Atomic Final Posting (§4.3)
                entryValidator.validate(pe);
                entryValidator.validateSequenceAndPending(pe);

                // Update subjob progress
                if (pe.getJobCardNumber() != null && pe.getOperationCode() != null) {
                    List<JobCardSubjob> subs = jobCardSubjobs.findByJobCardJobCardNumber(pe.getJobCardNumber());
                    for (JobCardSubjob sj : subs) {
                        if (pe.getOperationCode().equalsIgnoreCase(sj.getOperationCode())) {
                            BigDecimal currentCompleted = sj.getCompletedQuantity() != null ? sj.getCompletedQuantity() : BigDecimal.ZERO;
                            BigDecimal goodQty = pe.getGoodQuantity() != null ? pe.getGoodQuantity() : BigDecimal.ZERO;
                            sj.setCompletedQuantity(currentCompleted.add(goodQty));

                            BigDecimal currentReject = sj.getRejectedQuantity() != null ? sj.getRejectedQuantity() : BigDecimal.ZERO;
                            sj.setRejectedQuantity(currentReject.add(pe.getRejectedQuantity() != null ? pe.getRejectedQuantity() : BigDecimal.ZERO));

                            BigDecimal currentRework = sj.getReworkQuantity() != null ? sj.getReworkQuantity() : BigDecimal.ZERO;
                            sj.setReworkQuantity(currentRework.add(pe.getReworkQuantity() != null ? pe.getReworkQuantity() : BigDecimal.ZERO));

                            BigDecimal currentScrap = sj.getScrapQuantity() != null ? sj.getScrapQuantity() : BigDecimal.ZERO;
                            sj.setScrapQuantity(currentScrap.add(pe.getScrapQuantity() != null ? pe.getScrapQuantity() : BigDecimal.ZERO));

                            if (sj.getCompletedQuantity().compareTo(sj.getPlannedQuantity() != null ? sj.getPlannedQuantity() : BigDecimal.ZERO) >= 0) {
                                sj.setStatus("COMPLETED");
                                sj.setEndTime(Instant.now());
                            } else {
                                sj.setStatus("IN_PROGRESS");
                            }
                            jobCardSubjobs.save(sj);
                        }
                    }
                }

                pe.setStatus("POSTED");

                if (idempotencyKeyHeader != null && !idempotencyKeyHeader.isBlank()) {
                    try {
                        idempotencyKeys.save(PostingIdempotencyKey.builder()
                                .idempotencyKey(idempotencyKeyHeader)
                                .entryId(pe.getId())
                                .resultStatus("SUCCESS")
                                .createdAt(Instant.now())
                                .build());
                    } catch (Exception ignored) {}
                }

                try {
                    auditLogs.save(ProductionEntryAuditLog.builder()
                            .entryId(pe.getId())
                            .eventType("POST")
                            .userId(principalName(p))
                            .timestamp(Instant.now())
                            .build());
                } catch (Exception ignored) {}

                break;
            }
            case "reverse": {
                if (!"POSTED".equalsIgnoreCase(pe.getStatus()) && !"COMPLETED".equalsIgnoreCase(pe.getStatus())) {
                    throw new IllegalArgumentException("Only POSTED entries can be reversed.");
                }
                String reason = body != null ? body.get("reversalReason") : "Correction transaction";

                // Create Reversal record
                ProductionEntry rev = new ProductionEntry();
                rev.setEntryNumber(numbers.next("production-entry", "PE-REV"));
                rev.setEntryType("Reversal Entry");
                rev.setProductionType(pe.getProductionType());
                rev.setSupervisorCode(pe.getSupervisorCode());
                rev.setSupervisorName(pe.getSupervisorName());
                rev.setWorkOrderNumber(pe.getWorkOrderNumber());
                rev.setJobCardNumber(pe.getJobCardNumber());
                rev.setSubjobNumber(pe.getSubjobNumber());
                rev.setRouteSheetNumber(pe.getRouteSheetNumber());
                rev.setPartCode(pe.getPartCode());
                rev.setPartDescription(pe.getPartDescription());
                rev.setOperationCode(pe.getOperationCode());
                rev.setMachineCode(pe.getMachineCode());
                rev.setOperatorCode(pe.getOperatorCode());
                rev.setShiftCode(pe.getShiftCode());
                rev.setProductionDate(Instant.now());

                BigDecimal negGood = pe.getGoodQuantity() != null ? pe.getGoodQuantity().negate() : BigDecimal.ZERO;
                BigDecimal negRework = pe.getReworkQuantity() != null ? pe.getReworkQuantity().negate() : BigDecimal.ZERO;
                BigDecimal negReject = pe.getRejectedQuantity() != null ? pe.getRejectedQuantity().negate() : BigDecimal.ZERO;
                BigDecimal negScrap = pe.getScrapQuantity() != null ? pe.getScrapQuantity().negate() : BigDecimal.ZERO;
                BigDecimal negProcess = pe.getProcessQty() != null ? pe.getProcessQty().negate() : BigDecimal.ZERO;

                rev.setGoodQuantity(negGood);
                rev.setReworkQuantity(negRework);
                rev.setRejectedQuantity(negReject);
                rev.setScrapQuantity(negScrap);
                rev.setProducedQuantity(negProcess);
                rev.setProcessQty(negProcess);

                rev.setReversedFromEntryId(pe.getId());
                rev.setIsReversal(true);
                rev.setReversalReason(reason);
                rev.setStatus("POSTED");
                rev.setQualityStatus("REVERSED");
                rev.setCreatedBy(principalName(p));
                rev.setCreatedAt(Instant.now());

                // Reverse subjob numbers
                if (pe.getJobCardNumber() != null && pe.getOperationCode() != null) {
                    List<JobCardSubjob> subs = jobCardSubjobs.findByJobCardJobCardNumber(pe.getJobCardNumber());
                    for (JobCardSubjob sj : subs) {
                        if (pe.getOperationCode().equalsIgnoreCase(sj.getOperationCode())) {
                            BigDecimal current = sj.getCompletedQuantity() != null ? sj.getCompletedQuantity() : BigDecimal.ZERO;
                            BigDecimal adj = current.subtract(pe.getGoodQuantity() != null ? pe.getGoodQuantity() : BigDecimal.ZERO);
                            sj.setCompletedQuantity(adj.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : adj);
                            sj.setStatus("IN_PROGRESS");
                            jobCardSubjobs.save(sj);
                        }
                    }
                }

                pe.setStatus("REVERSED");
                pe.setReversalReason(reason);
                productionEntries.save(pe);

                ProductionEntry savedRev = productionEntries.save(rev);

                try {
                    auditLogs.save(ProductionEntryAuditLog.builder()
                            .entryId(pe.getId())
                            .eventType("REVERSE")
                            .userId(principalName(p))
                            .timestamp(Instant.now())
                            .metadataJson("{\"reversalEntryId\":" + savedRev.getId() + "}")
                            .build());
                } catch (Exception ignored) {}

                return savedRev;
            }
            case "reject": pe.setStatus("REJECTED"); break;
            case "cancel": pe.setStatus("CANCELLED"); break;
            case "quality-pass": pe.setQualityStatus("PASS"); break;
            case "quality-fail": pe.setQualityStatus("FAIL"); break;
            case "quality-hold": pe.setQualityStatus("HOLD"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        pe.setUpdatedAt(Instant.now());
        pe.setUpdatedBy(principalName(p));
        return productionEntries.save(pe);
    }

    // ---- Summary & Reporting Endpoints (§4.9 - Sourced strictly from POSTED entries per BR-12) ----

    @GetMapping("/api/v1/production/reports/rejection-summary")
    public List<Map<String, Object>> getRejectionSummary() {
        List<Map<String, Object>> list = new ArrayList<>();
        List<ProductionEntry> entries = productionEntries.findByStatus("POSTED");
        Map<String, BigDecimal> reasonMap = new LinkedHashMap<>();

        for (ProductionEntry pe : entries) {
            if (pe.getRejectionReasons() != null) {
                for (ProductionEntryRejection r : pe.getRejectionReasons()) {
                    String key = (r.getReasonCode() != null ? r.getReasonCode() : "UNKNOWN") + " - " + (r.getReasonDescription() != null ? r.getReasonDescription() : "");
                    reasonMap.put(key, reasonMap.getOrDefault(key, BigDecimal.ZERO).add(r.getQuantity() != null ? r.getQuantity() : BigDecimal.ZERO));
                }
            }
        }
        reasonMap.forEach((reason, qty) -> list.add(Map.of("reason", reason, "quantity", qty)));
        return list;
    }

    @GetMapping("/api/v1/production/reports/rework-summary")
    public List<Map<String, Object>> getReworkSummary() {
        List<Map<String, Object>> list = new ArrayList<>();
        List<ProductionEntry> entries = productionEntries.findByStatus("POSTED");
        Map<String, Map<String, Object>> map = new LinkedHashMap<>();

        for (ProductionEntry pe : entries) {
            if (pe.getReworkReasons() != null) {
                for (ProductionEntryRework rw : pe.getReworkReasons()) {
                    String key = rw.getReasonCode() != null ? rw.getReasonCode() : "GENERAL";
                    Map<String, Object> data = map.getOrDefault(key, new LinkedHashMap<>());
                    data.put("reasonCode", key);
                    data.put("reasonDescription", rw.getReasonDescription() != null ? rw.getReasonDescription() : key);
                    data.put("targetProcess", rw.getTargetProcessCode() != null ? rw.getTargetProcessCode() : "N/A");
                    BigDecimal currentQty = (BigDecimal) data.getOrDefault("quantity", BigDecimal.ZERO);
                    data.put("quantity", currentQty.add(rw.getQuantity() != null ? rw.getQuantity() : BigDecimal.ZERO));
                    map.put(key, data);
                }
            }
        }
        list.addAll(map.values());
        return list;
    }

    @GetMapping("/api/v1/production/reports/idle-summary")
    public List<Map<String, Object>> getIdleSummary() {
        List<Map<String, Object>> list = new ArrayList<>();
        List<ProductionEntry> entries = productionEntries.findByStatus("POSTED");
        Map<String, BigDecimal> map = new LinkedHashMap<>();

        for (ProductionEntry pe : entries) {
            if (pe.getIdleTime() != null && pe.getIdleTime().compareTo(BigDecimal.ZERO) > 0) {
                String reason = pe.getIdleReason() != null ? pe.getIdleReason() : "UNSPECIFIED";
                map.put(reason, map.getOrDefault(reason, BigDecimal.ZERO).add(pe.getIdleTime()));
            }
        }
        map.forEach((reason, idleTimeMins) -> list.add(Map.of("reason", reason, "idleTimeMinutes", idleTimeMins)));
        return list;
    }

    @GetMapping("/api/v1/production/reports/machine-summary")
    public List<Map<String, Object>> getMachineSummary() {
        List<Map<String, Object>> list = new ArrayList<>();
        List<ProductionEntry> entries = productionEntries.findByStatus("POSTED");
        Map<String, Map<String, Object>> map = new LinkedHashMap<>();

        for (ProductionEntry pe : entries) {
            String mCode = pe.getMachineCode() != null ? pe.getMachineCode() : "UNASSIGNED";
            Map<String, Object> mData = map.getOrDefault(mCode, new LinkedHashMap<>());
            mData.put("machineCode", mCode);

            BigDecimal good = (BigDecimal) mData.getOrDefault("goodQty", BigDecimal.ZERO);
            BigDecimal rejected = (BigDecimal) mData.getOrDefault("rejectedQty", BigDecimal.ZERO);
            BigDecimal rework = (BigDecimal) mData.getOrDefault("reworkQty", BigDecimal.ZERO);

            mData.put("goodQty", good.add(pe.getGoodQuantity() != null ? pe.getGoodQuantity() : BigDecimal.ZERO));
            mData.put("rejectedQty", rejected.add(pe.getRejectedQuantity() != null ? pe.getRejectedQuantity() : BigDecimal.ZERO));
            mData.put("reworkQty", rework.add(pe.getReworkQuantity() != null ? pe.getReworkQuantity() : BigDecimal.ZERO));
            map.put(mCode, mData);
        }
        list.addAll(map.values());
        return list;
    }

    @GetMapping("/api/v1/production/reports/operator-summary")
    public List<Map<String, Object>> getOperatorSummary() {
        List<Map<String, Object>> list = new ArrayList<>();
        List<ProductionEntry> entries = productionEntries.findByStatus("POSTED");
        Map<String, Map<String, Object>> map = new LinkedHashMap<>();

        for (ProductionEntry pe : entries) {
            String opCode = pe.getOperatorCode() != null ? pe.getOperatorCode() : "UNASSIGNED";
            Map<String, Object> opData = map.getOrDefault(opCode, new LinkedHashMap<>());
            opData.put("operatorCode", opCode);

            BigDecimal good = (BigDecimal) opData.getOrDefault("goodQty", BigDecimal.ZERO);
            BigDecimal rejected = (BigDecimal) opData.getOrDefault("rejectedQty", BigDecimal.ZERO);

            opData.put("goodQty", good.add(pe.getGoodQuantity() != null ? pe.getGoodQuantity() : BigDecimal.ZERO));
            opData.put("rejectedQty", rejected.add(pe.getRejectedQuantity() != null ? pe.getRejectedQuantity() : BigDecimal.ZERO));
            map.put(opCode, opData);
        }
        list.addAll(map.values());
        return list;
    }

    // ===========================
    // ---- PRODUCT CONVERSION ---
    // ===========================

    @GetMapping("/api/v1/production/conversions")
    public List<ProductConversion> listConversions() { return productConversions.findAll(); }

    @PostMapping("/api/v1/production/conversions")
    public ProductConversion createConversion(@RequestBody ProductConversion pc, Principal p) {
        pc.setId(null);
        pc.setConversionNumber(numbers.next("product-conversion", "PC"));
        if (pc.getConversionDate() == null) pc.setConversionDate(Instant.now());
        if (pc.getInputQuantity() == null) pc.setInputQuantity(BigDecimal.ZERO);
        if (pc.getOutputQuantity() == null) pc.setOutputQuantity(BigDecimal.ZERO);
        if (pc.getProcessLossQty() == null) pc.setProcessLossQty(BigDecimal.ZERO);
        if (pc.getScrapQty() == null) pc.setScrapQty(BigDecimal.ZERO);
        if (pc.getStatus() == null) pc.setStatus("DRAFT");
        pc.setCreatedBy(principalName(p));
        pc.setCreatedAt(Instant.now());
        return productConversions.save(pc);
    }

    @GetMapping("/api/v1/production/conversions/{id}")
    public ProductConversion getConversion(@PathVariable Long id) {
        return productConversions.findById(id).orElseThrow(() -> new RuntimeException("Product Conversion not found"));
    }

    @PutMapping("/api/v1/production/conversions/{id}")
    public ProductConversion updateConversion(@PathVariable Long id, @RequestBody ProductConversion pc, Principal p) {
        ProductConversion e = productConversions.findById(id).orElseThrow(() -> new RuntimeException("Product Conversion not found"));
        pc.setId(id);
        pc.setConversionNumber(e.getConversionNumber());
        pc.setCreatedAt(e.getCreatedAt());
        pc.setCreatedBy(e.getCreatedBy());
        pc.setUpdatedAt(Instant.now());
        pc.setUpdatedBy(principalName(p));
        return productConversions.save(pc);
    }

    @DeleteMapping("/api/v1/production/conversions/{id}")
    public void deleteConversion(@PathVariable Long id) {
        ProductConversion e = productConversions.findById(id).orElseThrow(() -> new RuntimeException("Product Conversion not found"));
        if (!"DRAFT".equals(e.getStatus())) throw new RuntimeException("Only DRAFT conversions can be deleted");
        productConversions.deleteById(id);
    }

    @PostMapping("/api/v1/production/conversions/{id}/actions/{action}")
    public ProductConversion conversionAction(@PathVariable Long id, @PathVariable String action, Principal p) {
        ProductConversion pc = productConversions.findById(id).orElseThrow(() -> new RuntimeException("Product Conversion not found"));
        switch (action.toLowerCase()) {
            case "submit": pc.setStatus("SUBMITTED"); break;
            case "reject": pc.setStatus("REJECTED"); break;
            case "verify": pc.setStatus("VERIFIED"); break;
            case "post": {
                if (!"VERIFIED".equals(pc.getStatus())) {
                    throw new RuntimeException("Only VERIFIED conversions can be posted");
                }
                if (pc.getInputQuantity() != null && pc.getInputQuantity().compareTo(BigDecimal.ZERO) > 0 && pc.getInputItemCode() != null) {
                    stockService.recordStockOut(
                        pc.getConversionNumber(), "product-conversion", "CONVERSION_OUT",
                        pc.getInputItemCode(), pc.getSourceWarehouse(), pc.getInputBatchNumber(), null,
                        pc.getInputQuantity(), LocalDate.now(), principalName(p));
                }
                if (pc.getOutputQuantity() != null && pc.getOutputQuantity().compareTo(BigDecimal.ZERO) > 0 && pc.getOutputItemCode() != null) {
                    stockService.recordStockIn(
                        pc.getConversionNumber(), "product-conversion", "CONVERSION_IN",
                        pc.getOutputItemCode(), pc.getDestinationWarehouse(), pc.getOutputBatchNumber(), null,
                        pc.getOutputQuantity(), LocalDate.now(), principalName(p), "FREE");
                }
                pc.setStatus("POSTED");
                break;
            }
            case "complete": {
                if (pc.getInputQuantity() != null && pc.getInputQuantity().compareTo(BigDecimal.ZERO) > 0 && pc.getInputItemCode() != null) {
                    stockService.recordStockOut(
                        pc.getConversionNumber(), "product-conversion", "CONVERSION_OUT",
                        pc.getInputItemCode(), pc.getSourceWarehouse(), pc.getInputBatchNumber(), null,
                        pc.getInputQuantity(), LocalDate.now(), principalName(p));
                }
                if (pc.getOutputQuantity() != null && pc.getOutputQuantity().compareTo(BigDecimal.ZERO) > 0 && pc.getOutputItemCode() != null) {
                    stockService.recordStockIn(
                        pc.getConversionNumber(), "product-conversion", "CONVERSION_IN",
                        pc.getOutputItemCode(), pc.getDestinationWarehouse(), pc.getOutputBatchNumber(), null,
                        pc.getOutputQuantity(), LocalDate.now(), principalName(p), "FREE");
                }
                pc.setStatus("COMPLETED");
                break;
            }
            case "cancel": pc.setStatus("CANCELLED"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        pc.setUpdatedAt(Instant.now());
        pc.setUpdatedBy(principalName(p));
        return productConversions.save(pc);
    }

    // ===========================
    // ---- PRODUCTION RETURN ----
    // ===========================

    @GetMapping("/api/v1/production/returns")
    public List<ProductionReturn> listReturns() { return productionReturns.findAll(); }

    @PostMapping("/api/v1/production/returns")
    public ProductionReturn createReturn(@RequestBody ProductionReturn pr, Principal p) {
        pr.setId(null);
        pr.setReturnNumber(numbers.next("production-return", "PR"));
        if (pr.getReturnDate() == null) pr.setReturnDate(Instant.now());
        if (pr.getQuantity() == null) pr.setQuantity(BigDecimal.ZERO);
        if (pr.getStatus() == null) pr.setStatus("DRAFT");
        pr.setCreatedBy(principalName(p));
        pr.setCreatedAt(Instant.now());
        return productionReturns.save(pr);
    }

    @GetMapping("/api/v1/production/returns/{id}")
    public ProductionReturn getReturn(@PathVariable Long id) {
        return productionReturns.findById(id).orElseThrow(() -> new RuntimeException("Production Return not found"));
    }

    @PutMapping("/api/v1/production/returns/{id}")
    public ProductionReturn updateReturn(@PathVariable Long id, @RequestBody ProductionReturn pr, Principal p) {
        ProductionReturn e = productionReturns.findById(id).orElseThrow(() -> new RuntimeException("Production Return not found"));
        pr.setId(id);
        pr.setReturnNumber(e.getReturnNumber());
        pr.setCreatedAt(e.getCreatedAt());
        pr.setCreatedBy(e.getCreatedBy());
        pr.setUpdatedAt(Instant.now());
        pr.setUpdatedBy(principalName(p));
        return productionReturns.save(pr);
    }

    @DeleteMapping("/api/v1/production/returns/{id}")
    public void deleteReturn(@PathVariable Long id) {
        ProductionReturn e = productionReturns.findById(id).orElseThrow(() -> new RuntimeException("Production Return not found"));
        if (!"DRAFT".equals(e.getStatus())) throw new RuntimeException("Only DRAFT returns can be deleted");
        productionReturns.deleteById(id);
    }

    @PostMapping("/api/v1/production/returns/{id}/actions/{action}")
    public ProductionReturn returnAction(@PathVariable Long id, @PathVariable String action, Principal p) {
        ProductionReturn pr = productionReturns.findById(id).orElseThrow(() -> new RuntimeException("Production Return not found"));
        switch (action.toLowerCase()) {
            case "submit": pr.setStatus("SUBMITTED"); break;
            case "verify": pr.setStatus("VERIFIED"); break;
            case "receive": {
                if (pr.getQuantity() != null && pr.getQuantity().compareTo(BigDecimal.ZERO) > 0 && pr.getItemCode() != null) {
                    String stockStatus = "SCRAP".equalsIgnoreCase(pr.getCondition()) ? "SCRAP"
                        : ("REWORK".equalsIgnoreCase(pr.getCondition()) || "QC_HOLD".equalsIgnoreCase(pr.getCondition())) ? "QC_HOLD"
                        : "FREE";
                    String loc = pr.getLocation() != null ? pr.getLocation() : (pr.getWarehouse() != null ? pr.getWarehouse() : "STORE");
                    stockService.recordStockIn(
                        pr.getReturnNumber(), "production-return", "RETURN_RECEIPT",
                        pr.getItemCode(), loc, pr.getBatchNumber(), null,
                        pr.getQuantity(), LocalDate.now(), principalName(p), stockStatus);
                }
                pr.setStatus("RECEIVED");
                break;
            }
            case "cancel": pr.setStatus("CANCELLED"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        pr.setUpdatedAt(Instant.now());
        pr.setUpdatedBy(principalName(p));
        return productionReturns.save(pr);
    }

    // ===========================
    // ---- PRODUCTION LOG SHEET --
    // ===========================

    @GetMapping("/api/v1/production/log-sheets")
    public List<ProductionLogSheet> listLogSheets() { return productionLogSheets.findAll(); }

    @PostMapping("/api/v1/production/log-sheets")
    public ProductionLogSheet createLogSheet(@RequestBody ProductionLogSheet ls, Principal p) {
        ls.setId(null);
        ls.setLogNumber(numbers.next("production-log-sheet", "PLS"));
        if (ls.getLogDate() == null) ls.setLogDate(Instant.now());
        if (ls.getStatus() == null) ls.setStatus("DRAFT");
        ls.setCreatedBy(principalName(p));
        ls.setCreatedAt(Instant.now());
        return productionLogSheets.save(ls);
    }

    @GetMapping("/api/v1/production/log-sheets/{id}")
    public ProductionLogSheet getLogSheet(@PathVariable Long id) {
        return productionLogSheets.findById(id).orElseThrow(() -> new RuntimeException("Production Log Sheet not found"));
    }

    @PutMapping("/api/v1/production/log-sheets/{id}")
    public ProductionLogSheet updateLogSheet(@PathVariable Long id, @RequestBody ProductionLogSheet ls, Principal p) {
        ProductionLogSheet e = productionLogSheets.findById(id).orElseThrow(() -> new RuntimeException("Production Log Sheet not found"));
        ls.setId(id);
        ls.setLogNumber(e.getLogNumber());
        ls.setCreatedAt(e.getCreatedAt());
        ls.setCreatedBy(e.getCreatedBy());
        ls.setUpdatedAt(Instant.now());
        ls.setUpdatedBy(principalName(p));
        return productionLogSheets.save(ls);
    }

    @DeleteMapping("/api/v1/production/log-sheets/{id}")
    public void deleteLogSheet(@PathVariable Long id) {
        ProductionLogSheet e = productionLogSheets.findById(id).orElseThrow(() -> new RuntimeException("Production Log Sheet not found"));
        if (!"DRAFT".equals(e.getStatus())) throw new RuntimeException("Only DRAFT log sheets can be deleted");
        productionLogActivities.findByLogSheetId(id).forEach(l -> productionLogActivities.deleteById(l.getId()));
        productionLogSheets.deleteById(id);
    }

    @PostMapping("/api/v1/production/log-sheets/{id}/actions/{action}")
    public ProductionLogSheet logSheetAction(@PathVariable Long id, @PathVariable String action, Principal p) {
        ProductionLogSheet ls = productionLogSheets.findById(id).orElseThrow(() -> new RuntimeException("Production Log Sheet not found"));
        switch (action.toLowerCase()) {
            case "verify": ls.setStatus("VERIFIED"); break;
            case "close": ls.setStatus("CLOSED"); break;
            case "cancel": ls.setStatus("CANCELLED"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        ls.setUpdatedAt(Instant.now());
        ls.setUpdatedBy(principalName(p));
        return productionLogSheets.save(ls);
    }

    // ---- Activities ----

    @GetMapping("/api/v1/production/log-sheets/{id}/activities")
    public List<ProductionLogActivity> getActivities(@PathVariable Long id) {
        return productionLogActivities.findByLogSheetId(id);
    }

    @PostMapping("/api/v1/production/log-sheets/{id}/activities")
    public ProductionLogActivity addActivity(@PathVariable Long id, @RequestBody ProductionLogActivity act, Principal p) {
        ProductionLogSheet ls = productionLogSheets.findById(id).orElseThrow(() -> new RuntimeException("Production Log Sheet not found"));
        act.setId(null);
        act.setLogSheet(ls);
        if (act.getStartTime() != null && act.getEndTime() != null) {
            long mins = ChronoUnit.MINUTES.between(act.getStartTime(), act.getEndTime());
            act.setDuration(BigDecimal.valueOf(mins));
        }
        act.setCreatedAt(Instant.now());
        return productionLogActivities.save(act);
    }

    @PutMapping("/api/v1/production/log-sheets/activities/{lineId}")
    public ProductionLogActivity updateActivity(@PathVariable Long lineId, @RequestBody ProductionLogActivity act, Principal p) {
        ProductionLogActivity e = productionLogActivities.findById(lineId).orElseThrow(() -> new RuntimeException("Activity not found"));
        act.setId(lineId);
        act.setLogSheet(e.getLogSheet());
        if (act.getStartTime() != null && act.getEndTime() != null) {
            long mins = ChronoUnit.MINUTES.between(act.getStartTime(), act.getEndTime());
            act.setDuration(BigDecimal.valueOf(mins));
        }
        act.setCreatedAt(e.getCreatedAt());
        act.setUpdatedAt(Instant.now());
        return productionLogActivities.save(act);
    }

    @DeleteMapping("/api/v1/production/log-sheets/activities/{lineId}")
    public void deleteActivity(@PathVariable Long lineId) { productionLogActivities.deleteById(lineId); }

    // ===========================
    // ---- IDLE TIME ------------
    // ===========================

    @GetMapping("/api/v1/production/idle-time")
    public List<IdleTimeEntry> listIdleTime() { return idleTimeEntries.findAll(); }

    @PostMapping("/api/v1/production/idle-time")
    public IdleTimeEntry createIdleTime(@RequestBody IdleTimeEntry it, Principal p) {
        it.setId(null);
        it.setEntryNumber(numbers.next("idle-time-entry", "ITE"));
        if (it.getEntryDate() == null) it.setEntryDate(Instant.now());
        if (it.getDuration() == null) it.setDuration(BigDecimal.ZERO);
        if (it.getStatus() == null) it.setStatus("DRAFT");
        it.setCreatedBy(principalName(p));
        it.setCreatedAt(Instant.now());
        return idleTimeEntries.save(it);
    }

    @GetMapping("/api/v1/production/idle-time/{id}")
    public IdleTimeEntry getIdleTime(@PathVariable Long id) {
        return idleTimeEntries.findById(id).orElseThrow(() -> new RuntimeException("Idle Time Entry not found"));
    }

    @PutMapping("/api/v1/production/idle-time/{id}")
    public IdleTimeEntry updateIdleTime(@PathVariable Long id, @RequestBody IdleTimeEntry it, Principal p) {
        IdleTimeEntry e = idleTimeEntries.findById(id).orElseThrow(() -> new RuntimeException("Idle Time Entry not found"));
        it.setId(id);
        it.setEntryNumber(e.getEntryNumber());
        it.setCreatedAt(e.getCreatedAt());
        it.setCreatedBy(e.getCreatedBy());
        it.setUpdatedAt(Instant.now());
        it.setUpdatedBy(principalName(p));
        return idleTimeEntries.save(it);
    }

    @DeleteMapping("/api/v1/production/idle-time/{id}")
    public void deleteIdleTime(@PathVariable Long id) {
        IdleTimeEntry e = idleTimeEntries.findById(id).orElseThrow(() -> new RuntimeException("Idle Time Entry not found"));
        if (!"DRAFT".equals(e.getStatus())) throw new RuntimeException("Only DRAFT idle time entries can be deleted");
        idleTimeEntries.deleteById(id);
    }

    @PostMapping("/api/v1/production/idle-time/{id}/actions/{action}")
    public IdleTimeEntry idleTimeAction(@PathVariable Long id, @PathVariable String action, Principal p) {
        IdleTimeEntry it = idleTimeEntries.findById(id).orElseThrow(() -> new RuntimeException("Idle Time Entry not found"));
        switch (action.toLowerCase()) {
            case "verify": it.setStatus("VERIFIED"); break;
            case "cancel": it.setStatus("CANCELLED"); break;
            default: throw new RuntimeException("Unknown action: " + action);
        }
        it.setUpdatedAt(Instant.now());
        it.setUpdatedBy(principalName(p));
        return idleTimeEntries.save(it);
    }

    // ===========================
    // ---- PRODUCTION PENDING ---
    // ===========================

    @GetMapping("/api/v1/production/{type}/{id}/print")
    ResponseEntity<byte[]> print(@PathVariable String type, @PathVariable Long id,
                                  @RequestParam(defaultValue = "false") boolean download) {
        Map<String, Object> row = productionRow(type, id);
        String docNo = String.valueOf(row.getOrDefault("docNo", type)).replaceAll("[^A-Za-z0-9_-]", "_");
        String disposition = download ? "attachment" : "inline";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition + "; filename=\"" + docNo + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(printer.salesDoc(row, type));
    }

    private Map<String, Object> productionRow(String type, Long id) {
        Map<String, Object> row = new LinkedHashMap<>();
        switch (type) {
            case "entries": {
                ProductionEntry e = productionEntries.findById(id)
                    .orElseThrow(() -> new RuntimeException("Production Entry not found"));
                row.put("docNo", e.getEntryNumber());
                row.put("entryNumber", e.getEntryNumber());
                row.put("workOrderNumber", e.getWorkOrderNumber());
                row.put("jobCardNumber", e.getJobCardNumber());
                row.put("subjobNumber", e.getSubjobNumber());
                row.put("partCode", e.getPartCode());
                row.put("partDescription", e.getPartDescription());
                row.put("operationCode", e.getOperationCode());
                row.put("machineCode", e.getMachineCode());
                row.put("operatorCode", e.getOperatorCode());
                row.put("shiftCode", e.getShiftCode());
                row.put("productionDate", e.getProductionDate());
                row.put("startTime", e.getStartTime());
                row.put("endTime", e.getEndTime());
                row.put("producedQuantity", e.getProducedQuantity());
                row.put("goodQuantity", e.getGoodQuantity());
                row.put("reworkQuantity", e.getReworkQuantity());
                row.put("rejectedQuantity", e.getRejectedQuantity());
                row.put("scrapQuantity", e.getScrapQuantity());
                row.put("status", e.getStatus());
                row.put("qualityStatus", e.getQualityStatus());
                row.put("remarks", e.getRemarks());
                break;
            }
            case "job-cards": {
                JobCard jc = jobCards.findById(id)
                    .orElseThrow(() -> new RuntimeException("Job Card not found"));
                row.put("docNo", jc.getJobCardNumber());
                row.put("jobCardNumber", jc.getJobCardNumber());
                row.put("workOrderNumber", jc.getWorkOrderNumber());
                row.put("partCode", jc.getPartCode());
                row.put("partDescription", jc.getPartDescription());
                row.put("revision", jc.getRevision());
                row.put("plannedQuantity", jc.getPlannedQuantity());
                row.put("completedQuantity", jc.getCompletedQuantity());
                row.put("reworkQuantity", jc.getReworkQuantity());
                row.put("rejectedQuantity", jc.getRejectedQuantity());
                row.put("scrapQuantity", jc.getScrapQuantity());
                row.put("priority", jc.getPriority());
                row.put("plannedStartDate", jc.getPlannedStartDate());
                row.put("plannedEndDate", jc.getPlannedEndDate());
                row.put("routeSheetNumber", jc.getRouteSheetNumber());
                row.put("bomNumber", jc.getBomNumber());
                row.put("customerCode", jc.getCustomerCode());
                row.put("status", jc.getStatus());
                row.put("remarks", jc.getRemarks());
                break;
            }
            case "returns": {
                ProductionReturn pr = productionReturns.findById(id)
                    .orElseThrow(() -> new RuntimeException("Production Return not found"));
                row.put("docNo", pr.getReturnNumber());
                row.put("returnNumber", pr.getReturnNumber());
                row.put("returnDate", pr.getReturnDate());
                row.put("workOrderNumber", pr.getWorkOrderNumber());
                row.put("jobCardNumber", pr.getJobCardNumber());
                row.put("itemCode", pr.getItemCode());
                row.put("itemDescription", pr.getItemDescription());
                row.put("batchNumber", pr.getBatchNumber());
                row.put("quantity", pr.getQuantity());
                row.put("uom", pr.getUom());
                row.put("returnReason", pr.getReturnReason());
                row.put("condition", pr.getCondition());
                row.put("warehouse", pr.getWarehouse());
                row.put("status", pr.getStatus());
                row.put("remarks", pr.getRemarks());
                break;
            }
            case "log-sheets": {
                ProductionLogSheet ls = productionLogSheets.findById(id)
                    .orElseThrow(() -> new RuntimeException("Production Log Sheet not found"));
                row.put("docNo", ls.getLogNumber());
                row.put("logNumber", ls.getLogNumber());
                row.put("logDate", ls.getLogDate());
                row.put("workOrderNumber", ls.getWorkOrderNumber());
                row.put("jobCardNumber", ls.getJobCardNumber());
                row.put("machineCode", ls.getMachineCode());
                row.put("operatorCode", ls.getOperatorCode());
                row.put("shiftCode", ls.getShiftCode());
                row.put("status", ls.getStatus());
                row.put("remarks", ls.getRemarks());
                break;
            }
            case "conversions": {
                ProductConversion pc = productConversions.findById(id)
                    .orElseThrow(() -> new RuntimeException("Product Conversion not found"));
                row.put("docNo", pc.getConversionNumber());
                row.put("conversionNumber", pc.getConversionNumber());
                row.put("conversionDate", pc.getConversionDate());
                row.put("conversionType", pc.getConversionType());
                row.put("sourceWarehouse", pc.getSourceWarehouse());
                row.put("destinationWarehouse", pc.getDestinationWarehouse());
                row.put("workOrderNumber", pc.getWorkOrderNumber());
                row.put("jobCardNumber", pc.getJobCardNumber());
                row.put("inputItemCode", pc.getInputItemCode());
                row.put("inputQuantity", pc.getInputQuantity());
                row.put("inputUom", pc.getInputUom());
                row.put("outputItemCode", pc.getOutputItemCode());
                row.put("outputQuantity", pc.getOutputQuantity());
                row.put("outputUom", pc.getOutputUom());
                row.put("processLossQty", pc.getProcessLossQty());
                row.put("scrapQty", pc.getScrapQty());
                row.put("status", pc.getStatus());
                row.put("remarks", pc.getRemarks());
                break;
            }
            default:
                throw new RuntimeException("Unknown production type: " + type);
        }
        return row;
    }

    @GetMapping("/api/v1/production/pending")
    public List<Map<String, Object>> getProductionPending() {
        List<Map<String, Object>> pending = new ArrayList<>();

        List<JobCard> activeJobCards = new ArrayList<>();
        activeJobCards.addAll(jobCards.findByStatus("RELEASED"));
        activeJobCards.addAll(jobCards.findByStatus("IN_PROGRESS"));
        activeJobCards.addAll(jobCards.findByStatus("ON_HOLD"));

        for (JobCard jc : activeJobCards) {
            BigDecimal planned = jc.getPlannedQuantity() == null ? BigDecimal.ZERO : jc.getPlannedQuantity();
            BigDecimal completed = jc.getCompletedQuantity() == null ? BigDecimal.ZERO : jc.getCompletedQuantity();
            BigDecimal pendingQty = planned.subtract(completed);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("jobCardNumber", jc.getJobCardNumber());
            item.put("workOrderNumber", jc.getWorkOrderNumber());
            item.put("partCode", jc.getPartCode());
            item.put("partDescription", jc.getPartDescription());
            item.put("plannedQuantity", planned);
            item.put("completedQuantity", completed);
            item.put("pendingQuantity", pendingQty);
            item.put("status", jc.getStatus());
            item.put("priority", jc.getPriority());
            item.put("plannedStartDate", jc.getPlannedStartDate());
            item.put("plannedEndDate", jc.getPlannedEndDate());

            long daysPending = 0;
            if (jc.getPlannedStartDate() != null) {
                daysPending = ChronoUnit.DAYS.between(
                    jc.getPlannedStartDate().atZone(ZoneId.systemDefault()).toLocalDate(),
                    LocalDate.now()
                );
            }
            item.put("daysPending", daysPending);

            boolean overdue = jc.getPlannedEndDate() != null &&
                jc.getPlannedEndDate().atZone(ZoneId.systemDefault()).toLocalDate().isBefore(LocalDate.now());
            item.put("overdue", overdue);

            pending.add(item);
        }

        return pending;
    }

    // ===========================
    // ---- Production Dashboard --
    // ===========================

    @GetMapping("/api/v1/production/dashboard")
    public Map<String, Object> getProductionDashboard() {
        Map<String, Object> dash = new LinkedHashMap<>();

        dash.put("totalJobCards", jobCards.count());
        dash.put("draftJobCards", jobCards.countByStatus("DRAFT"));
        dash.put("releasedJobCards", jobCards.countByStatus("RELEASED"));
        dash.put("inProgressJobCards", jobCards.countByStatus("IN_PROGRESS"));
        dash.put("onHoldJobCards", jobCards.countByStatus("ON_HOLD"));
        dash.put("completedJobCards", jobCards.countByStatus("COMPLETED"));
        dash.put("closedJobCards", jobCards.countByStatus("CLOSED"));

        dash.put("totalProductionEntries", productionEntries.count());
        dash.put("approvedEntries", productionEntries.countByStatus("APPROVED"));
        dash.put("pendingEntries", productionEntries.countByStatus("SUBMITTED"));
        dash.put("qualityPending", productionEntries.findByStatus("APPROVED").stream()
            .filter(e -> "PENDING".equals(e.getQualityStatus()))
            .count());

        dash.put("totalProducedQuantity", jobCards.sumCompletedQuantity());

        dash.put("totalConversions", productConversions.count());
        dash.put("totalReturns", productionReturns.count());
        dash.put("totalLogSheets", productionLogSheets.count());
        dash.put("totalIdleTimeEntries", idleTimeEntries.count());

        return dash;
    }
}
