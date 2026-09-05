package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.JobCard;
import in.zygertechnology.zygererp.entity.JobCardSubjob;
import in.zygertechnology.zygererp.entity.ProductionEntry;
import in.zygertechnology.zygererp.entity.ProductionGateOverride;
import in.zygertechnology.zygererp.entity.ProductionGateOverrideAudit;
import in.zygertechnology.zygererp.entity.QualityInspection;
import in.zygertechnology.zygererp.repo.ProductionGateOverrideAuditRepository;
import in.zygertechnology.zygererp.repo.ProductionGateOverrideRepository;
import in.zygertechnology.zygererp.security.CurrentUserRoles;
import jakarta.persistence.EntityManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * P11 — Production Quality Gate (CLAR-PROD-012, DOCUMENT_61).
 *
 * <p>Gate enforced by default at operation/subjob completion and Production Entry post:
 * the gate point is refused while a PRODUCTION-sourced inspection tied to the same job card
 * (and, when known, the same operation) is in a blocking gate status (PENDING / FAIL / HELD).
 *
 * <p>A blocking gate is cleared by the inspection advancing to PASS/APPROVED/closed-pass, or by a
 * ONE-TIME, operation-scoped, audited override approved jointly by a Quality Supervisor and a
 * Production Supervisor, or by a single Plant Head. PPAP-blocked items are never overridable.
 * Quality owns inspection status; Production records output and any override request; Inventory is
 * untouched (CLAR-003/D-C1 boundary).
 */
@Slf4j
@Service
public class ProductionQualityGateService {

    public static final String ROLE_QUALITY_SUPERVISOR = "QUALITY_MANAGER";
    public static final String ROLE_PRODUCTION_SUPERVISOR = "PRODUCTION_SUPERVISOR";
    public static final String ROLE_PLANT_HEAD = "PLANT_HEAD";

    private static final List<String> PENDING_LIKE =
            List.of("DRAFT", "PENDING", "ASSIGNED", "IN_PROGRESS", "SUBMITTED");

    private final EntityManager em;
    private final ProductionGateOverrideRepository overrides;
    private final ProductionGateOverrideAuditRepository auditRepo;

    public ProductionQualityGateService(
            EntityManager em,
            ProductionGateOverrideRepository overrides,
            ProductionGateOverrideAuditRepository auditRepo) {
        this.em = em;
        this.overrides = overrides;
        this.auditRepo = auditRepo;
    }

    // ------------------------------------------------------------------
    // Gate status model (Quality-owned inspection status → gate status)
    // ------------------------------------------------------------------

    /** BLOCKING when inspection is PENDING-like, FAIL, or HELD(HOLD). */
    public boolean isBlocking(String inspectionStatus) {
        if (inspectionStatus == null) return false;
        String s = inspectionStatus.trim().toUpperCase();
        if (PENDING_LIKE.contains(s)) return true;
        if ("FAIL".equals(s)) return true;
        if ("HOLD".equals(s)) return true;
        if ("CLOSED".equals(s)) return false;
        // DRAFT/PENDING/ASSIGNED/IN_PROGRESS/SUBMITTED handled above; anything else not blocking.
        return false;
    }

    /** Produced only from the decision status ("decide") — falls back to finalDecision for closed/pass. */
    public String gateStatusOf(String inspectionStatus, String decisionStatus, String finalDecision) {
        if (inspectionStatus == null) return "CLEAR";
        String s = inspectionStatus.trim().toUpperCase();
        if (PENDING_LIKE.contains(s)) return "PENDING";
        if ("FAIL".equals(s)) return "FAIL";
        if ("HOLD".equals(s)) return "HELD";
        if ("PASS".equals(s)) return "PASS";
        if ("APPROVED".equals(s)) return "PASS";
        if ("CLOSED".equals(s)) {
            if ("PASS".equalsIgnoreCase(decisionStatus) || "PASS".equalsIgnoreCase(finalDecision)) return "PASS";
            return "PENDING";
        }
        return "CLEAR";
    }

    // ------------------------------------------------------------------
    // Blocking-inspection lookup (Production owns the evaluation point)
    // ------------------------------------------------------------------

    public List<QualityInspection> findBlockingInspections(String jobCardNumber, String operationCode) {
        List<QualityInspection> result = new ArrayList<>();
        if (jobCardNumber == null || jobCardNumber.isBlank()) return result;
        List<QualityInspection> candidates = em.createQuery(
                        "SELECT q FROM QualityInspection q " +
                        "WHERE q.sourceType = 'PRODUCTION' AND q.sourceNumber = :jc " +
                        "ORDER BY q.id", QualityInspection.class)
                .setParameter("jc", jobCardNumber)
                .getResultList();
        for (QualityInspection q : candidates) {
            String qOp = q.getOperation();
            boolean opMatch = operationCode == null || operationCode.isBlank()
                    || qOp == null || qOp.isBlank()
                    || operationCode.equalsIgnoreCase(qOp);
            if (opMatch && isBlocking(q.getInspectionStatus())) {
                result.add(q);
            }
        }
        return result;
    }

    // ------------------------------------------------------------------
    // Gate evaluation (pure read; consumption only at the gate point)
    // ------------------------------------------------------------------

    /**
     * Evaluate the gate for an operation WITHOUT consuming overrides — safe for UI reads.
     * Returns: status (CLEAR/BLOCKED), gate (PASS/PENDING/FAIL/HELD), blockers with per-blocker
     * {@code overrideAvailable} (an APPROVED, unexpended override exists) and {@code overridable}.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> evaluateGate(String jobCardNumber, String operationCode, String user) {
        Map<String, Object> map = new LinkedHashMap<>();
        List<QualityInspection> blocking = findBlockingInspections(jobCardNumber, operationCode);
        List<Map<String, Object>> blockers = new ArrayList<>();
        boolean blocked = false;
        String worst = "PASS";
        for (QualityInspection q : blocking) {
            boolean covered = hasApprovedUnexpendedOverride(q.getId());
            if (!covered) {
                blocked = true;
                String gs = gateStatusOf(q.getInspectionStatus(), q.getDecisionStatus(), q.getFinalDecision());
                if ("HELD".equals(gs)) worst = "HELD";
                else if ("FAIL".equals(gs) && !"HELD".equals(worst)) worst = "FAIL";
                else if (!"FAIL".equals(worst) && !"HELD".equals(worst)) worst = "PENDING";
                blockers.add(blockerRow(q, false));
            } else {
                blockers.add(blockerRow(q, true));
            }
        }
        map.put("jobCardNumber", jobCardNumber);
        map.put("operationCode", operationCode);
        map.put("blocked", blocked);
        map.put("status", blocked ? "BLOCKED" : "CLEAR");
        map.put("gate", blocked ? worst : "PASS");
        map.put("blockers", blockers);
        return map;
    }

    /**
     * Gate evaluation at an actual gate point (entry post / subjob completion). Consumes any
     * APPROVED one-time override that covers a blocking inspection. If any blocking inspection is
     * not covered by an approved override, the gate is BLOCKED.
     */
    @Transactional
    public Map<String, Object> evaluateAndConsumeGate(String jobCardNumber, String operationCode, String user) {
        List<QualityInspection> blocking = findBlockingInspections(jobCardNumber, operationCode);
        List<Map<String, Object>> blockers = new ArrayList<>();
        boolean blocked = false;
        String worst = "PASS";
        for (QualityInspection q : blocking) {
            boolean cleared = consumeOverrideIfAny(q, user);
            if (!cleared) {
                blocked = true;
                String gs = gateStatusOf(q.getInspectionStatus(), q.getDecisionStatus(), q.getFinalDecision());
                if ("HELD".equals(gs)) worst = "HELD";
                else if ("FAIL".equals(gs) && !"HELD".equals(worst)) worst = "FAIL";
                else if (!"FAIL".equals(worst) && !"HELD".equals(worst)) worst = "PENDING";
                blockers.add(blockerRow(q, false));
            }
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("jobCardNumber", jobCardNumber);
        map.put("operationCode", operationCode);
        map.put("blocked", blocked);
        map.put("status", blocked ? "BLOCKED" : "CLEAR");
        map.put("gate", blocked ? worst : "PASS");
        map.put("blockers", blockers);
        return map;
    }

    private Map<String, Object> blockerRow(QualityInspection q, boolean overridable) {
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("inspectionId", q.getId());
        b.put("docNo", q.getDocNo());
        b.put("inspectionStatus", q.getInspectionStatus());
        b.put("gateStatus", gateStatusOf(q.getInspectionStatus(), q.getDecisionStatus(), q.getFinalDecision()));
        b.put("overrideAvailable", overridable);
        return b;
    }

    private boolean hasApprovedUnexpendedOverride(Long inspectionId) {
        ProductionGateOverride active = overrides
                .findFirstByInspectionIdAndStatusInOrderByIdAsc(inspectionId,
                        List.of(ProductionGateOverride.STATUS_PENDING, ProductionGateOverride.STATUS_APPROVED))
                .orElse(null);
        return active != null && ProductionGateOverride.STATUS_APPROVED.equals(active.getStatus());
    }

    /** Refuse the gate point when a blocking inspection is not covered by an approved, unexpended override. */
    @Transactional
    public void assertEntryPostGate(ProductionEntry pe, String user) {
        if (pe == null || pe.getJobCardNumber() == null || pe.getJobCardNumber().isBlank()) return;
        Map<String, Object> gate = evaluateAndConsumeGate(pe.getJobCardNumber(), pe.getOperationCode(), user);
        if (Boolean.TRUE.equals(gate.get("blocked"))) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> blockers = (List<Map<String, Object>>) gate.get("blockers");
            StringBuilder detail = new StringBuilder();
            for (Map<String, Object> b : blockers) {
                if (detail.length() > 0) detail.append("; ");
                detail.append(b.get("docNo")).append(" [").append(b.get("gateStatus")).append("]");
            }
            throw new IllegalArgumentException(
                    "Production Quality Gate blocks entry post: " + pe.getEntryNumber()
                            + " — inspection " + detail + " is PENDING/FAIL/HELD for job card "
                            + pe.getJobCardNumber() + " and no approved override covers it.");
        }
    }

    /** Refuse subjob completion while a blocking inspection exists without a covering override. */
    @Transactional
    public void assertSubjobGate(JobCardSubjob sj, String user) {
        if (sj == null || sj.getJobCard() == null) return;
        String jcNo = sj.getJobCard().getJobCardNumber();
        if (jcNo == null || jcNo.isBlank()) return;
        Map<String, Object> gate = evaluateAndConsumeGate(jcNo, sj.getOperationCode(), user);
        if (Boolean.TRUE.equals(gate.get("blocked"))) {
            throw new IllegalArgumentException(
                    "Production Quality Gate blocks subjob completion: subjob " + sj.getSubjobNumber()
                            + " (op " + sj.getOperationCode() + ") of job card " + jcNo
                            + " has inspection PENDING/FAIL/HELD with no approved override.");
        }
    }

    @Transactional
    boolean consumeOverrideIfAny(QualityInspection q, String user) {
        ProductionGateOverride active = overrides
                .findFirstByInspectionIdAndStatusInOrderByIdAsc(q.getId(),
                        List.of(ProductionGateOverride.STATUS_PENDING, ProductionGateOverride.STATUS_APPROVED))
                .orElse(null);
        if (active == null) return false;
        if (!ProductionGateOverride.STATUS_APPROVED.equals(active.getStatus())) return false; // not yet authorized
        active.setStatus(ProductionGateOverride.STATUS_APPLIED);
        active.setAppliedByUser(user);
        active.setAppliedAt(Instant.now());
        active.setUpdatedBy(user);
        active.setUpdatedAt(Instant.now());
        overrides.save(active);
        recordAudit(active, "APPLIED", ProductionGateOverride.STATUS_APPROVED, ProductionGateOverride.STATUS_APPLIED,
                user, "{\"inspectionNumber\":\"" + safe(q.getDocNo()) + "\"}");
        return true;
    }

    // ------------------------------------------------------------------
    // Override request + signatures
    // ------------------------------------------------------------------

    @Transactional
    public ProductionGateOverride requestOverride(Map<String, Object> body, String user) {
        Number inspectionIdObj = body.get("inspectionId") instanceof Number
                ? (Number) body.get("inspectionId") : null;
        if (inspectionIdObj == null) throw new IllegalArgumentException("inspectionId is required.");
        Long inspectionId = inspectionIdObj.longValue();

        QualityInspection qi = em.find(QualityInspection.class, inspectionId);
        if (qi == null) throw new IllegalArgumentException("Inspection not found: " + inspectionId);
        if (!"PRODUCTION".equalsIgnoreCase(qi.getSourceType())) {
            throw new IllegalArgumentException("Only PRODUCTION-sourced inspections are gate-overridable.");
        }
        boolean blocking = isBlocking(qi.getInspectionStatus());
        if (!blocking) {
            throw new IllegalArgumentException("Inspection " + qi.getDocNo() + " is not blocking the gate; no override is required.");
        }

        String itemCode = str(body.get("itemCode"));
        if (itemCode == null || itemCode.isBlank()) itemCode = qi.getItemCode();
        if (itemCode == null || itemCode.isBlank()) throw new IllegalArgumentException("itemCode is required.");
        if (isPpapBlocked(itemCode)) {
            throw new IllegalArgumentException("Item " + itemCode + " is PPAP-blocked and non-overridable (CLAR-PROD-012).");
        }

        String reason = str(body.get("reason"));
        if (reason == null || reason.isBlank()) throw new IllegalArgumentException("Override reason is mandatory.");
        reason = reason.trim();

        BigDecimal quantity = body.get("quantity") instanceof Number
                ? BigDecimal.valueOf(((Number) body.get("quantity")).doubleValue()) : null;
        if (quantity == null) throw new IllegalArgumentException("quantity is required.");
        if (quantity.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("quantity must be greater than zero.");

        // Idempotency: an active override already exists for this inspection → return it.
        ProductionGateOverride existing = overrides
                .findFirstByInspectionIdAndStatusInOrderByIdAsc(inspectionId,
                        List.of(ProductionGateOverride.STATUS_PENDING, ProductionGateOverride.STATUS_APPROVED))
                .orElse(null);
        if (existing != null) return existing;

        String jobCardNumber = str(body.get("jobCardNumber"));
        String operationCode = str(body.get("operationCode"));
        if (jobCardNumber == null || jobCardNumber.isBlank()) jobCardNumber = qi.getSourceNumber();

        ProductionGateOverride ovr = ProductionGateOverride.builder()
                .inspectionId(inspectionId)
                .inspectionNumber(qi.getDocNo())
                .jobCardNumber(jobCardNumber != null ? jobCardNumber : "")
                .operationCode(operationCode)
                .operationSequence(body.get("operationSequence") instanceof Number
                        ? ((Number) body.get("operationSequence")).intValue() : null)
                .itemCode(itemCode)
                .quantity(quantity)
                .batchNumber(str(body.get("batchNumber")))
                .reason(reason)
                .category(ProductionGateOverride.CATEGORY_JOINT)
                .status(ProductionGateOverride.STATUS_PENDING)
                .createdBy(user)
                .updatedBy(user)
                .build();

        try {
            ovr = overrides.saveAndFlush(ovr);
        } catch (DataIntegrityViolationException dv) {
            // Concurrent duplicate request lost the unique race → return the winner.
            ProductionGateOverride winner = overrides
                    .findFirstByInspectionIdAndStatusInOrderByIdAsc(inspectionId,
                            List.of(ProductionGateOverride.STATUS_PENDING, ProductionGateOverride.STATUS_APPROVED))
                    .orElse(null);
            if (winner != null) return winner;
            throw dv;
        }
        recordAudit(ovr, "CREATE_REQUEST", null, ovr.getStatus(), user,
                "{\"inspectionNumber\":\"" + safe(qi.getDocNo()) + "\",\"reason\":\"" + safe(reason) + "\"}");
        return ovr;
    }

    @Transactional
    public ProductionGateOverride signQuality(Long id, String user) {
        requireRole(ROLE_QUALITY_SUPERVISOR);
        ProductionGateOverride ovr = loadActive(id);
        if (ProductionGateOverride.CATEGORY_PLANT_HEAD.equals(ovr.getCategory())) {
            throw new IllegalArgumentException("Plant-Head override does not use Quality Supervisor signature.");
        }
        if (ovr.getQualityApproverUser() != null) return ovr; // idempotent
        if (user.equals(ovr.getProductionApproverUser())) {
            throw new IllegalArgumentException("Quality and Production override approvals must be different users.");
        }
        ovr.setQualityApproverUser(user);
        ovr.setQualityApprovedAt(Instant.now());
        recordAudit(ovr, "QUALITY_SIGNED", ovr.getStatus(), ovr.getStatus(), user, null);
        return maybeApproveJoint(ovr, user);
    }

    @Transactional
    public ProductionGateOverride signProduction(Long id, String user) {
        requireRole(ROLE_PRODUCTION_SUPERVISOR);
        ProductionGateOverride ovr = loadActive(id);
        if (ProductionGateOverride.CATEGORY_PLANT_HEAD.equals(ovr.getCategory())) {
            throw new IllegalArgumentException("Plant-Head override does not use Production Supervisor signature.");
        }
        if (ovr.getProductionApproverUser() != null) return ovr; // idempotent
        if (user.equals(ovr.getQualityApproverUser())) {
            throw new IllegalArgumentException("Quality and Production override approvals must be different users.");
        }
        ovr.setProductionApproverUser(user);
        ovr.setProductionApprovedAt(Instant.now());
        recordAudit(ovr, "PRODUCTION_SIGNED", ovr.getStatus(), ovr.getStatus(), user, null);
        return maybeApproveJoint(ovr, user);
    }

    @Transactional
    public ProductionGateOverride signPlantHead(Long id, String user) {
        requireRole(ROLE_PLANT_HEAD);
        ProductionGateOverride ovr = loadActive(id);
        if (ovr.getPlantHeadApproverUser() != null) return ovr; // idempotent
        ovr.setPlantHeadApproverUser(user);
        ovr.setPlantHeadApprovedAt(Instant.now());
        ovr.setCategory(ProductionGateOverride.CATEGORY_PLANT_HEAD);
        recordAudit(ovr, "PLANT_HEAD_SIGNED", ovr.getStatus(), ovr.getStatus(), user, null);
        return approve(ovr, user);
    }

    private ProductionGateOverride maybeApproveJoint(ProductionGateOverride ovr, String user) {
        if (ovr.getQualityApproverUser() != null && ovr.getProductionApproverUser() != null) {
            return approve(ovr, user);
        }
        return overrides.save(ovr);
    }

    private ProductionGateOverride approve(ProductionGateOverride ovr, String user) {
        String prev = ovr.getStatus();
        ovr.setStatus(ProductionGateOverride.STATUS_APPROVED);
        ovr.setUpdatedBy(user);
        ovr.setUpdatedAt(Instant.now());
        overrides.save(ovr);
        recordAudit(ovr, "APPROVED", prev, ovr.getStatus(), user, null);
        return ovr;
    }

    private ProductionGateOverride loadActive(Long id) {
        ProductionGateOverride ovr = overrides.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Override not found: " + id));
        if (ProductionGateOverride.STATUS_APPLIED.equals(ovr.getStatus())) {
            throw new IllegalArgumentException("Override " + id + " is already applied (one-time).");
        }
        if (ProductionGateOverride.STATUS_APPROVED.equals(ovr.getStatus())) {
            throw new IllegalArgumentException("Override " + id + " is already approved.");
        }
        return ovr;
    }

    // ------------------------------------------------------------------
    // Reads (UI)
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ProductionGateOverride> listOverrides() {
        return overrides.findAllByOrderByIdDesc();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> overrideDetail(Long id) {
        ProductionGateOverride ovr = overrides.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Override not found: " + id));
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("override", ovr);
        map.put("audit", auditRepo.findByOverrideIdOrderByTimestampAsc(id));
        return map;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> statusByJobCard(String jobCardNumber) {
        Map<String, Object> out = new LinkedHashMap<>();
        List<Map<String, Object>> rows = new ArrayList<>();
        out.put("jobCardNumber", jobCardNumber);

        Map<String, Object> gate = evaluateGate(jobCardNumber, null, "system");
        out.put("jobCardGate", gate.get("status"));

        List<?> subs = em.createQuery(
                        "SELECT s FROM JobCardSubjob s WHERE s.jobCard.jobCardNumber = :jc ORDER BY s.sequenceNo", JobCardSubjob.class)
                .setParameter("jc", jobCardNumber)
                .getResultList();
        for (Object o : subs) {
            JobCardSubjob sj = (JobCardSubjob) o;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("subjobNumber", sj.getSubjobNumber());
            row.put("operationCode", sj.getOperationCode());
            row.put("sequenceNo", sj.getSequenceNo());
            row.put("status", sj.getStatus());
            row.put("plannedQuantity", sj.getPlannedQuantity());
            row.put("completedQuantity", sj.getCompletedQuantity());
            Map<String, Object> g = evaluateGate(jobCardNumber, sj.getOperationCode(), "system");
            row.put("qualityGate", g.get("gate"));
            row.put("qualityBlocked", g.get("blocked"));
            row.put("blockers", g.get("blockers"));
            rows.add(row);
        }
        out.put("operations", rows);
        List<ProductionGateOverride> ovrs = overrides.findByJobCardNumberOrderByIdDesc(jobCardNumber);
        out.put("overrides", ovrs);
        return out;
    }

    // ------------------------------------------------------------------
    // PPAP / role guards
    // ------------------------------------------------------------------

    /** PPAP-blocked items are non-overridable (Quality-authoritative). No PPAP attribute is modeled today → false. */
    public boolean isPpapBlocked(String itemCode) {
        return false;
    }

    private void requireRole(String role) {
        if (!CurrentUserRoles.hasAnyRole(role)) {
            throw new SecurityException("Action requires role " + role + " (CLAR-PROD-012 override authority).");
        }
    }

    private void recordAudit(ProductionGateOverride ovr, String eventType, String prev, String next, String user, String details) {
        try {
            auditRepo.save(ProductionGateOverrideAudit.builder()
                    .overrideId(ovr.getId())
                    .eventType(eventType)
                    .previousStatus(prev)
                    .newStatus(next)
                    .changedByUser(user)
                    .timestamp(Instant.now())
                    .detailsJson(details)
                    .build());
        } catch (Exception ex) {
            log.warn("Gate override audit record failed for override {}", ovr.getId(), ex);
        }
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static String safe(String s) {
        return s == null ? "" : s.replace("\"", "'");
    }
}