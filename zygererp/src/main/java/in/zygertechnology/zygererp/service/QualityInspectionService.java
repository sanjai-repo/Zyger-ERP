package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.InstrumentMaster;
import in.zygertechnology.zygererp.entity.QualityCalibrationInstrument;
import in.zygertechnology.zygererp.entity.QualityInspection;
import in.zygertechnology.zygererp.entity.QualityInspectionLine;
import in.zygertechnology.zygererp.entity.QualityInspectionType;
import in.zygertechnology.zygererp.entity.QualityInspectionStatusHistory;
import in.zygertechnology.zygererp.entity.QualityNcr;
import in.zygertechnology.zygererp.entity.DocEntity;
import in.zygertechnology.zygererp.entity.InspectionPlan;
import in.zygertechnology.zygererp.entity.InspectionPlanCharacteristic;
import in.zygertechnology.zygererp.entity.QualityCharacteristicMeasurement;
import in.zygertechnology.zygererp.doc.DocTypes;
import in.zygertechnology.zygererp.repo.InstrumentMasterRepository;
import in.zygertechnology.zygererp.repo.QualityCalibrationInstrumentRepository;
import in.zygertechnology.zygererp.repo.QualityInspectionStatusHistoryRepository;
import in.zygertechnology.zygererp.repo.LedgerRepository;
import in.zygertechnology.zygererp.repository.InspectionPlanRepository;
import in.zygertechnology.zygererp.repository.QualityCharacteristicMeasurementRepository;
import in.zygertechnology.zygererp.config.BusinessRuleException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.Principal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class QualityInspectionService {

    private static final Logger log = LoggerFactory.getLogger(QualityInspectionService.class);

    private final EntityManager em;
    private final ObjectMapper mapper;
    private final DocNumberService numbers;
    private final DocumentFacade docs;
    private final QualityCalibrationInstrumentRepository instruments;
    private final InstrumentMasterRepository instrumentMasters;
    private final InspectionPlanRepository inspectionPlanRepo;
    private final QualityCharacteristicMeasurementRepository spcRepo;
    private final QualityInspectionStatusHistoryRepository statusHistoryRepo;
    private final CalibrationGuardService calibrationGuard;
    private final DocumentWorkflowEngine workflowEngine;
    private final EmailService emailService;

    public static final String KEY = "quality-inspection";
    private static final String INSPECT = "SUBMITTED";
    private static final String APPROVED = "APPROVED";

    public QualityInspection get(Long id) {
        return (QualityInspection) docs.get(KEY, id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRow(Long id) {
        return docs.getRow(KEY, id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(Map<String, String> q) {
        return docs.list(KEY, q);
    }

    @Transactional
    public QualityInspection create(Map<String, Object> body, String user) {
        QualityInspection e = mapper.convertValue(body, QualityInspection.class);
        if (e.getInspectionNumber() == null || e.getInspectionNumber().isBlank()) {
            e.setInspectionNumber(numbers.nextFy(prefixFor(e)));
        }
        e.setDocNo(e.getInspectionNumber());
        LocalDate d = parseDate(body.get("date"));
        if (d == null) d = parseDate(body.get("inspectionDate"));
        if (d == null) d = LocalDate.now();
        e.setDocDate(d);
        e.setInspectionDate(d);
        e.setInspectionStatus("DRAFT");
        e.setDecisionStatus("NONE");
        if (body.get("receivedQuantity") != null)
            e.setReceivedQuantity(bdVal(body.get("receivedQuantity")));
        if (body.get("inspectionQuantity") != null)
            e.setInspectionQuantity(bdVal(body.get("inspectionQuantity")));
        e.setCreatedBy(user);
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        attach(e, body);

        // §6.5: Auto-load inspection plan characteristics if no lines provided
        if (e.getLines().isEmpty() && e.getItemCode() != null) {
            autoLoadInspectionPlan(e);
        }

        for (QualityInspectionLine l : e.getLines()) evaluate(l);
        em.persist(e);

        // §4.2: Record initial status history
        recordStatusChange(e, null, "DRAFT", user, "Inspection created");

        return e;
    }

    public static String prefixForType(QualityInspectionType type) {
        if (type == null) return DocTypes.get(KEY).prefix();
        return switch (type) {
            case IQC -> "IQC";
            case LO -> "LOI";       // spec §3
            case JOMIN -> "JOM";    // spec §3
            case FAI -> "FAI";
            case IPQC -> "IPQ";     // spec §3
            case LINE -> "LIN";
            case LAST_OFF -> "LOF";
            case FINAL -> "FIN";
        };
    }

    private String prefixFor(QualityInspection e) {
        return prefixForType(e.getInspectionType());
    }

    @Transactional
    public QualityInspection saveMeasurements(Long inspectionId,
                                              List<Map<String, Object>> results, String user) {
        return saveMeasurements(inspectionId, results, user, null, null);
    }

    @Transactional
    public QualityInspection saveMeasurements(Long inspectionId,
                                              List<Map<String, Object>> results, String user,
                                              String overrideReason, String overrideUser) {
        QualityInspection ins = get(inspectionId);
        checkEditable(ins);

        Map<String, QualityInspectionLine> byCode = new HashMap<>();
        for (QualityInspectionLine l : ins.getLines()) byCode.put(l.getCharacteristicCode(), l);

        for (Map<String, Object> r : results) {
            String code = strVal(r.get("characteristicCode"));
            QualityInspectionLine l = byCode.get(code);
            if (l == null) continue;
            if (r.get("balloonNo") != null) l.setBalloonNo(strVal(r.get("balloonNo")));
            if (r.get("actualValue") != null) l.setActualValue(bdVal(r.get("actualValue")));
            if (r.get("actualText") != null) l.setActualText(strVal(r.get("actualText")));
            if (r.get("actualMin") != null) l.setActualMin(bdVal(r.get("actualMin")));
            if (r.get("actualMax") != null) l.setActualMax(bdVal(r.get("actualMax")));
            if (r.get("actualAvg") != null) l.setActualAvg(bdVal(r.get("actualAvg")));
            if (r.get("instrumentCode") != null) {
                l.setInstrumentCode(strVal(r.get("instrumentCode")));
                calibGuard(strVal(r.get("instrumentCode")), ins, overrideReason, overrideUser);
                QualityCalibrationInstrument inst = instruments.findByInstrumentCode(l.getInstrumentCode()).orElse(null);
                if (inst != null) {
                    l.setCalibrationStatus(inst.getStatus());
                    l.setInstrumentCode(inst.getInstrumentCode());
                }
            }
            if (r.get("sampleNumber") != null) l.setSampleNumber((Integer) r.get("sampleNumber"));
            if (r.get("pieceNumber") != null) l.setPieceNumber((Integer) r.get("pieceNumber"));
            if (r.get("remark") != null) l.setRemark(strVal(r.get("remark")));
            l.setMeasuredBy(user);
            l.setMeasuredAt(Instant.now());
            evaluate(l);

            // §6.6: Record SPC fact table for numeric characteristics
            if (l.getActualValue() != null && ins.getId() != null) {
                try { recordSpcMeasurement(ins, l); } catch (Exception ex) {
                    log.warn("SPC recording failed for line {}: {}", l.getCharacteristicCode(), ex.getMessage());
                }
            }
        }
        ins.setUpdatedAt(Instant.now());
        em.flush();
        return ins;
    }

    @Transactional
    public Map<String, Object> bulkImportMeasurements(Long inspectionId, String csvContent, String user) {
        return bulkImportMeasurements(inspectionId, csvContent, user, null, null);
    }

    @Transactional
    public Map<String, Object> bulkImportMeasurements(Long inspectionId, String csvContent, String user,
                                                      String overrideReason, String overrideUser) {
        QualityInspection ins = get(inspectionId);
        checkEditable(ins);

        Map<String, QualityInspectionLine> byBalloon = new HashMap<>();
        Map<String, QualityInspectionLine> byCode = new HashMap<>();
        for (QualityInspectionLine l : ins.getLines()) {
            if (l.getBalloonNo() != null && !l.getBalloonNo().isBlank())
                byBalloon.put(l.getBalloonNo().trim(), l);
            if (l.getCharacteristicCode() != null && !l.getCharacteristicCode().isBlank())
                byCode.put(l.getCharacteristicCode().trim(), l);
        }

        int matched = 0, unmatched = 0;
        String[] rows = csvContent.split("\\r?\\n");

        for (String row : rows) {
            if (row.trim().isEmpty()) continue;
            String[] parts = row.split(",");
            if (parts.length < 2) continue;

            String balloonOrCode = parts[0].trim();
            String actualVal = parts.length > 1 ? parts[1].trim() : "";
            String instrument = parts.length > 2 ? parts[2].trim() : null;
            String remark = parts.length > 3 ? parts[3].trim() : null;

            QualityInspectionLine il = byBalloon.getOrDefault(balloonOrCode, byCode.get(balloonOrCode));
            if (il == null) { unmatched++; continue; }

            BigDecimal bd = null;
            try { bd = new BigDecimal(actualVal); } catch (Exception ignored) {}
            if (bd != null) {
                il.setActualValue(bd);
            } else {
                il.setActualText(actualVal);
            }
            if (instrument != null && !instrument.isBlank()) {
                il.setInstrumentCode(instrument);
                calibGuard(instrument, ins, overrideReason, overrideUser);
            }
            if (remark != null && !remark.isBlank()) il.setRemark(remark);
            il.setMeasuredBy(user);
            il.setMeasuredAt(Instant.now());
            evaluate(il);

            if (il.getActualValue() != null && ins.getId() != null) {
                try { recordSpcMeasurement(ins, il); } catch (Exception ex) {
                    log.warn("SPC recording failed for line {}: {}", il.getCharacteristicCode(), ex.getMessage());
                }
            }
            matched++;
        }

        ins.setUpdatedAt(Instant.now());
        em.flush();

        Map<String, Object> result = new HashMap<>();
        result.put("totalRows", rows.length);
        result.put("matched", matched);
        result.put("unmatched", unmatched);
        return result;
    }

    void evaluate(QualityInspectionLine l) {
        BigDecimal actual = l.getActualValue();
        String actualTxt = l.getActualText();
        Boolean mandatory = Boolean.TRUE.equals(l.getIsMandatory());

        if (actual == null && (actualTxt == null || actualTxt.isBlank()) && !mandatory) {
            l.setResult("NA");
            return;
        }
        if (actual == null && (actualTxt == null || actualTxt.isBlank())) {
            l.setResult("PENDING");
            return;
        }

        // Text / Visual characteristic evaluation
        if (actualTxt != null && !actualTxt.isBlank() && l.getSpecificationText() != null && !l.getSpecificationText().isBlank()) {
            boolean pass = actualTxt.trim().equalsIgnoreCase(l.getSpecificationText().trim())
                    || actualTxt.trim().equalsIgnoreCase("PASS")
                    || actualTxt.trim().equalsIgnoreCase("OK");
            l.setResult(pass ? "PASS" : "FAIL");
            return;
        }

        if (actual != null) {
            BigDecimal lo = l.getLowerLimit();
            BigDecimal hi = l.getUpperLimit();

            // No tolerance limits defined and no specificationText matched above:
            // cannot be auto-evaluated, route to manual review.
            if (lo == null && hi == null) {
                l.setResult("PENDING_REVIEW");
                return;
            }

            boolean within = true;

            if (lo != null && hi != null) {
                within = actual.compareTo(lo) >= 0 && actual.compareTo(hi) <= 0;
            } else if (hi != null) {
                within = actual.compareTo(hi) <= 0;
            } else if (lo != null) {
                within = actual.compareTo(lo) >= 0;
            }

            l.setResult(within ? "PASS" : "FAIL");
            BigDecimal nom = l.getNominalValue();
            if (nom != null) {
                l.setDeviation(actual.subtract(nom));
            } else if (lo != null && hi != null) {
                l.setDeviation(actual.subtract(lo.add(hi).divide(BigDecimal.valueOf(2))));
            } else {
                l.setDeviation(BigDecimal.ZERO);
            }
        } else {
            // actualText present but no specificationText to compare against:
            // cannot be auto-evaluated, route to manual review.
            l.setResult("PENDING_REVIEW");
        }
    }

    @Transactional
    public QualityInspection start(Long id, String user) {
        QualityInspection ins = get(id);
        String from = ins.getInspectionStatus();
        require(ins, "DRAFT", "PENDING", "REJECTED");
        ins.setInspectionStatus("IN_PROGRESS");
        ins.setAssignedInspector(user);
        ins.setAssignedAt(Instant.now());
        ins.setStartedAt(Instant.now());
        ins.setUpdatedAt(Instant.now());
        recordStatusChange(ins, from, "IN_PROGRESS", user, null);
        return ins;
    }

    @Transactional
    public QualityInspection submit(Long id, String user) {
        QualityInspection ins = get(id);
        String from = ins.getInspectionStatus();
        require(ins, "IN_PROGRESS", "DRAFT");
        validateWorkflowTransition(ins, "SUBMIT");
        List<QualityInspectionLine> pendingMandatory = ins.getLines().stream()
                .filter(QualityInspectionLine::getIsMandatory)
                .filter(l -> "PENDING".equals(l.getResult()))
                .toList();
        if (!pendingMandatory.isEmpty()) {
            throw new IllegalArgumentException("Cannot submit: " + pendingMandatory.size() + " mandatory characteristic(s) still pending measurement.");
        }
        validateQuantities(ins);
        ins.setInspectionStatus(INSPECT);
        ins.setDecisionStatus("PENDING");
        ins.setUpdatedAt(Instant.now());
        recordStatusChange(ins, from, INSPECT, user, null);
        return ins;
    }

    @Transactional
    public QualityInspection hold(Long id, String reason, String user) {
        QualityInspection ins = get(id);
        String from = ins.getInspectionStatus();
        require(ins, INSPECT, "IN_PROGRESS");
        ins.setInspectionStatus("HOLD");
        ins.setDecisionRemarks(reason);
        ins.setUpdatedAt(Instant.now());
        recordStatusChange(ins, from, "HOLD", user, reason);
        sendQualityNotification(ins, "ON_HOLD", reason);
        return ins;
    }

    @Transactional
    public QualityInspection releaseHold(Long id, String user) {
        QualityInspection ins = get(id);
        String from = ins.getInspectionStatus();
        require(ins, "HOLD");
        ins.setInspectionStatus(INSPECT);
        ins.setUpdatedAt(Instant.now());
        recordStatusChange(ins, from, INSPECT, user, "Hold released");
        return ins;
    }

    @Transactional
    public QualityInspection decide(Long id, String decision, String remarks, String user) {
        QualityInspection ins = get(id);
        String from = ins.getInspectionStatus();
        require(ins, INSPECT);
        validateWorkflowTransition(ins, "DECIDE");
        String d = (decision == null) ? "PASS" : decision.toUpperCase();
        if (List.of("FAIL", "REJECT", "FAILING").contains(d)) {
            ins.setInspectionStatus("FAIL");
            ins.setDecisionStatus("FAIL");
        } else if (d.equals("HOLD")) {
            ins.setInspectionStatus("HOLD");
            ins.setDecisionStatus("HOLD");
        } else {
            if (hasCriticalFail(ins)) {
                ins.setInspectionStatus("HOLD");
                ins.setDecisionStatus("HOLD");
                ins.setDecisionRemarks("Critical characteristic failed; requires review. " + safe(remarks));
            } else {
                ins.setInspectionStatus("PASS");
                ins.setDecisionStatus("PASS");
            }
        }
        ins.setFinalDecision(ins.getInspectionStatus());
        ins.setDecisionRemarks(safe(remarks));
        ins.setApprovedBy(ins.getInspectionStatus().equals("PASS") ? user : ins.getApprovedBy());
        ins.setUpdatedAt(Instant.now());
        recordStatusChange(ins, from, ins.getInspectionStatus(), user, remarks);
        return ins;
    }

    @Transactional
    public QualityInspection approve(Long id, String user) {
        QualityInspection ins = get(id);
        String from = ins.getInspectionStatus();
        require(ins, INSPECT);
        validateWorkflowTransition(ins, "APPROVE");
        if (hasCriticalFail(ins)) {
            throw new IllegalArgumentException("Cannot approve: inspection has critical characteristic failures. Use HOLD disposition instead.");
        }
        validateQuantities(ins);
        ins.setInspectionStatus(APPROVED);
        ins.setDecisionStatus(ins.getDecisionStatus());
        ins.setApprovedBy(user);
        ins.setApprovedAt(Instant.now());
        ins.setIsLocked(true);
        ins.setUpdatedAt(Instant.now());
        recordStatusChange(ins, from, APPROVED, user, null);
        sendQualityNotification(ins, APPROVED, null);
        return ins;
    }

    @Transactional
    public QualityInspection close(Long id, String user) {
        QualityInspection ins = get(id);
        String from = ins.getInspectionStatus();
        if (ins.getInspectionStatus().equals("FAIL") || hasFailedLine(ins)) {
            if (!hasNcr(ins)) {
                throw new IllegalStateException(
                        "Inspection with failed characteristics cannot be closed without a disposition/NCR");
            }
        } else {
            requireClosable(ins, INSPECT, "PASS", "HOLD", APPROVED);
        }
        ins.setInspectionStatus("CLOSED");
        ins.setClosedAt(Instant.now());
        ins.setCompletedAt(Instant.now());
        ins.setUpdatedAt(Instant.now());
        recordStatusChange(ins, from, "CLOSED", user, null);
        sendQualityNotification(ins, "CLOSED", null);
        return ins;
    }

    @Transactional
    public QualityInspection cancel(Long id, String reason, String user) {
        QualityInspection ins = get(id);
        String from = ins.getInspectionStatus();
        require(ins, "DRAFT", INSPECT);
        ins.setInspectionStatus("CANCELLED");
        ins.setCancellationReason(reason);
        ins.setCancelledAt(Instant.now());
        ins.setUpdatedAt(Instant.now());
        recordStatusChange(ins, from, "CANCELLED", user, reason);
        return ins;
    }

    @Transactional
    public QualityInspection reopen(Long id, String reason, String user) {
        QualityInspection ins = get(id);
        String from = ins.getInspectionStatus();
        require(ins, "CLOSED");
        ins.setInspectionStatus("IN_PROGRESS");
        ins.setReopenReason(reason);
        ins.setClosedAt(null);
        ins.setIsLocked(false);
        ins.setUpdatedAt(Instant.now());
        recordStatusChange(ins, from, "IN_PROGRESS", user, reason);
        return ins;
    }

    private void checkEditable(QualityInspection ins) {
        String s = ins.getInspectionStatus();
        if (s.equals("CLOSED") || s.equals(APPROVED)) {
            throw new IllegalStateException("Approved/closed inspection cannot be modified");
        }
    }

    private void require(QualityInspection ins, String... allowed) {
        for (String a : allowed) if (a.equals(ins.getInspectionStatus())) return;
        throw new IllegalStateException("Action not allowed in status " + ins.getInspectionStatus());
    }

    /**
     * §3.5: Validate transition against the DocumentWorkflowEngine guard table.
     * Maps service action names to workflow target statuses.
     */
    private void validateWorkflowTransition(QualityInspection ins, String action) {
        if (ins.getStatus() == null) return;
        String upperStatus = ins.getInspectionStatus();
        String upperAction = action.toUpperCase();
        // Map action names to the workflow engine's target status keys
        String targetStatus = switch (upperAction) {
            case "START" -> "IN_PROGRESS";
            case "SUBMIT" -> "SUBMITTED";
            case "DECIDE", "APPROVE" -> "APPROVED";
            case "HOLD" -> "HOLD";
            case "CLOSE" -> "CLOSED";
            case "CANCEL" -> "CANCELLED";
            case "REOPEN" -> "DRAFT";
            default -> upperAction;
        };
        Set<String> allowed = workflowEngine.allowedTransitions("QUALITY_INSPECTION", upperStatus);
        if (!allowed.isEmpty() && !allowed.contains(targetStatus)) {
            throw new BusinessRuleException("WORKFLOW_VIOLATION",
                    "Transition from " + upperStatus + " to " + targetStatus + " is not allowed",
                    Map.of("currentStatus", upperStatus, "targetStatus", targetStatus, "allowed", allowed));
        }
    }

    private void requireClosable(QualityInspection ins, String... allowed) {
        for (String a : allowed) if (a.equals(ins.getInspectionStatus())) return;
        throw new IllegalStateException("Cannot close in status " + ins.getInspectionStatus());
    }

    // ─── Spec §4.2: Status History Recording ───

    /**
     * Core trackability: write a history row for every status transition.
     * Also stamps the timing fields on the inspection itself.
     */
    private void recordStatusChange(QualityInspection ins, String fromStatus, String toStatus, String user, String remarks) {
        QualityInspectionStatusHistory h = QualityInspectionStatusHistory.builder()
                .inspectionId(ins.getId())
                .inspectionNumber(ins.getInspectionNumber())
                .inspectionType(ins.getInspectionType() != null ? ins.getInspectionType().name() : null)
                .previousStatus(fromStatus)
                .newStatus(toStatus)
                .remarks(remarks)
                .changedBy(user)
                .changedAt(Instant.now())
                .assignedAt(ins.getAssignedAt())
                .startedAt(ins.getStartedAt())
                .completedAt(ins.getCompletedAt())
                .build();
        statusHistoryRepo.save(h);

        Instant now = Instant.now();
        switch (toStatus) {
            case "IN_PROGRESS" -> {
                if (ins.getStartedAt() == null) ins.setStartedAt(now);
            }
            case "CLOSED" -> {
                if (ins.getCompletedAt() == null) ins.setCompletedAt(now);
            }
            case "APPROVED" -> {
                ins.setApprovedBy(user);
                ins.setApprovedAt(now);
                ins.setIsLocked(true);
            }
        }
    }

    private void sendQualityNotification(QualityInspection ins, String status, String remarks) {
        try {
            String recipient = ins.getAssignedInspector();
            if (recipient == null || recipient.isBlank()) recipient = ins.getCreatedBy();
            if (recipient == null || recipient.isBlank()) return;
            String typeName = ins.getInspectionType() != null ? ins.getInspectionType().name() : "";
            emailService.sendQualityInspectionNotification(
                    recipient, ins.getInspectionNumber(), typeName,
                    ins.getItemCode(), status, remarks);
        } catch (Exception e) {
            log.warn("Failed to send quality notification for {}: {}", ins.getInspectionNumber(), e.getMessage());
        }
    }

    private void validateQuantities(QualityInspection ins) {
        BigDecimal insp = ins.getInspectionQuantity();
        BigDecimal recv = ins.getReceivedQuantity();
        if (insp != null && recv != null && insp.compareTo(recv) > 0) {
            throw new IllegalArgumentException("Inspection quantity cannot exceed received quantity");
        }
        BigDecimal sum = BigDecimal.ZERO;
        sum = sum.add(nz(ins.getAcceptedQuantity()));
        sum = sum.add(nz(ins.getRejectedQuantity()));
        sum = sum.add(nz(ins.getHoldQuantity()));
        sum = sum.add(nz(ins.getReworkQuantity()));
        sum = sum.add(nz(ins.getScrapQuantity()));
        sum = sum.add(nz(ins.getReturnQuantity()));
        sum = sum.add(nz(ins.getConcessionQuantity()));
        BigDecimal limit = insp != null ? insp : (recv != null ? recv : BigDecimal.ZERO);
        if (sum.compareTo(limit) > 0) {
            throw new IllegalArgumentException(
                    "Accepted+rejected+hold+rework+scrap+return+concession ("
                            + sum + ") must not exceed inspected quantity (" + limit + ")");
        }
    }

    private BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    private boolean hasCriticalFail(QualityInspection ins) {
        for (QualityInspectionLine l : ins.getLines()) {
            if (Boolean.TRUE.equals(l.getIsCritical()) && "FAIL".equals(l.getResult())) return true;
        }
        return false;
    }

    private boolean hasFailedLine(QualityInspection ins) {
        for (QualityInspectionLine l : ins.getLines()) {
            if ("FAIL".equals(l.getResult())) return true;
        }
        return false;
    }

    private boolean hasNcr(QualityInspection ins) {
        String check = "select count(n) from in.zygertechnology.zygererp.entity.QualityNcr n " +
                "where n.inspectionId = :id";
        Long c = em.createQuery(check, Long.class)
                .setParameter("id", ins.getId()).getSingleResult();
        return c != null && c > 0;
    }

    /** FRS §4.6 + §6.5: BLOCK when instrument calibration is expired/failed (hard enforcement). */
    private void calibGuard(String code, QualityInspection ins, String overrideReason, String overrideUser) {
        QualityCalibrationInstrument i = instruments.findByInstrumentCode(code).orElse(null);
        if (i != null) {
            String st = i.getStatus();
            if (st != null && List.of("EXPIRED", "FAILED", "UNDER_REPAIR", "RETIRED").contains(st.toUpperCase())) {
                Map<String, Object> details = Map.of(
                        "instrumentCode", code,
                        "calibrationStatus", st,
                        "inspectionId", ins.getId() != null ? ins.getId() : "new"
                );
                throw new BusinessRuleException("CALIBRATION_BLOCKED",
                        "Instrument " + code + " has calibration status " + st + ". Cannot record measurement.",
                        details);
            }
            return;
        }
        InstrumentMaster im = instrumentMasters.findByCode(code).orElse(null);
        if (im != null) {
            String st = im.getCalibrationStatus();
            if (st != null && List.of("EXPIRED", "FAILED").contains(st.toUpperCase())) {
                Map<String, Object> details = Map.of(
                        "instrumentCode", code,
                        "calibrationStatus", st
                );
                throw new BusinessRuleException("CALIBRATION_BLOCKED",
                        "Instrument " + code + " has calibration status " + st + ". Cannot record measurement.",
                        details);
            }
        }
        // §6.5: Delegate to CalibrationGuardService for schedule-based policy enforcement (BLOCK/WARN)
        calibrationGuard.enforcePolicy(code, overrideReason, overrideUser);
    }

    /**
     * §6.5: Auto-load inspection characteristics from the active InspectionPlan
     * matching itemCode + inspectionType. Falls back to default if no plan found.
     */
    private void autoLoadInspectionPlan(QualityInspection e) {
        if (e.getItemCode() == null || e.getInspectionType() == null) return;

        String inspTypeStr = e.getInspectionType().name();
        Optional<InspectionPlan> planOpt = inspectionPlanRepo
                .findFirstByPlantIdAndItemCodeAndDrawingNumberAndDrawingRevisionAndOperationAndInspectionTypeAndActiveTrue(
                        1L, e.getItemCode(), null, null, null, inspTypeStr);

        if (planOpt.isEmpty()) return;

        InspectionPlan plan = planOpt.get();
        int lineNo = 1;
        for (InspectionPlanCharacteristic pc : plan.getCharacteristics()) {
            QualityInspectionLine l = new QualityInspectionLine();
            l.setCharacteristicCode(pc.getCharacteristicCode());
            l.setCharacteristicName(pc.getCharacteristicName());
            l.setBalloonNo(pc.getBalloonNo());
            l.setItemCode(e.getItemCode());
            l.setLowerLimit(pc.getLowerLimit());
            l.setUpperLimit(pc.getUpperLimit());
            l.setNominalValue(pc.getNominalValue());
            l.setSpecificationText(pc.getSpecificationText());
            l.setIsMandatory(pc.getIsMandatory());
            l.setIsCritical(pc.getIsCritical());
            l.setLineNo(lineNo++);
            l.setQty(BigDecimal.ONE);
            l.setDoc(e);
            e.getLines().add(l);
        }
    }

    /**
     * §6.6: Record SPC fact table entry for each measured characteristic.
     */
    private void recordSpcMeasurement(QualityInspection ins, QualityInspectionLine l) {
        QualityCharacteristicMeasurement m = QualityCharacteristicMeasurement.builder()
                .inspectionId(ins.getId())
                .inspectionNumber(ins.getInspectionNumber())
                .inspectionType(ins.getInspectionType() != null ? ins.getInspectionType().name() : null)
                .itemCode(ins.getItemCode())
                .characteristicCode(l.getCharacteristicCode())
                .characteristicName(l.getCharacteristicName())
                .balloonNo(l.getBalloonNo())
                .nominalValue(l.getNominalValue())
                .lowerLimit(l.getLowerLimit())
                .upperLimit(l.getUpperLimit())
                .actualValue(l.getActualValue())
                .actualMin(l.getActualMin())
                .actualMax(l.getActualMax())
                .actualAvg(l.getActualAvg())
                .deviation(l.getDeviation())
                .result(l.getResult())
                .measuredAt(l.getMeasuredAt())
                .inspectionDate(ins.getInspectionDate())
                .build();
        spcRepo.save(m);
    }

    private void attach(QualityInspection e, Map<String, Object> body) {
        Object lines = body.get("lines");
        if (lines instanceof Collection<?> c) {
            for (Object o : c) {
                QualityInspectionLine l = mapper.convertValue(o, QualityInspectionLine.class);
                if (l.getCharacteristicCode() == null && l.getItemCode() != null)
                    l.setCharacteristicCode(l.getItemCode());
                l.setQty(BigDecimal.ONE);
                l.setDoc(e);
                e.getLines().add(l);
            }
        }
    }

    private LocalDate parseDate(Object v) {
        if (v == null) return null;
        try { return LocalDate.parse(v.toString().substring(0, 10)); }
        catch (Exception e) { return null; }
    }

    private BigDecimal bdVal(Object v) {
        if (v == null) return null;
        try { return new BigDecimal(String.valueOf(v)); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private String strVal(Object v) { return v == null ? "" : String.valueOf(v); }

    private String safe(String s) { return s == null ? "" : s; }

    public String nextNumber(String key) { return numbers.nextFy(key); }
}
