package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.QualityCalibrationInstrumentRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * Cross-cutting Quality services: document creation defaults, calibration
 * instrument coupling, and the aggregated quality dashboard (plan §25, §33).
 */
@Service
@RequiredArgsConstructor
public class QualitySupportService {

    private final DocumentFacade docs;
    private final EntityManager em;
    private final QualityCalibrationInstrumentRepository instruments;

    // ---------- creation defaults ----------

    @Transactional
    public DocEntity create(String key, Map<String, Object> body, String user) {
        DocEntity e = docs.create(key, body, user);

        switch (key) {
            case "quality-8d" -> seed8dDisciplines((Quality8d) e);
            case "quality-calibration-record" -> {
                QualityCalibrationRecord r = (QualityCalibrationRecord) e;
                if (r.getCalibrationNumber() == null || r.getCalibrationNumber().isBlank())
                    r.setCalibrationNumber(r.getDocNo());
                if (r.getCalibrationDate() == null) r.setCalibrationDate(r.getDocDate());
            }
            case "quality-customer-complaint" -> {
                QualityCustomerComplaint c = (QualityCustomerComplaint) e;
                if (c.getComplaintNumber() == null || c.getComplaintNumber().isBlank())
                    c.setComplaintNumber(c.getDocNo());
                if (c.getComplaintDate() == null) c.setComplaintDate(c.getDocDate());
            }
            case "quality-capa" -> {
                QualityCapa c = (QualityCapa) e;
                if (c.getCapaNumber() == null || c.getCapaNumber().isBlank())
                    c.setCapaNumber(c.getDocNo());
            }
            case "quality-concession" -> {
                QualityConcession c = (QualityConcession) e;
                if (c.getConcessionNumber() == null || c.getConcessionNumber().isBlank())
                    c.setConcessionNumber(c.getDocNo());
            }
            case "quality-test-certificate" -> {
                QualityTestCertificate t = (QualityTestCertificate) e;
                if (t.getCertificateNumber() == null || t.getCertificateNumber().isBlank())
                    t.setCertificateNumber(t.getDocNo());
                if (t.getCertificateDate() == null) t.setCertificateDate(t.getDocDate());
            }
            default -> { /* ncr keeps explicit numbering */ }
        }

        return e;
    }

    private void seed8dDisciplines(Quality8d report) {
        if (report.getDisciplines() != null && !report.getDisciplines().isEmpty()) return;
        String[][] seeds = {
                {"D1", "Team Formation"},
                {"D2", "Problem Description"},
                {"D3", "Containment Action"},
                {"D4", "Root Cause Analysis"},
                {"D5", "Corrective Action Selection"},
                {"D6", "Corrective Action Implementation"},
                {"D7", "Prevent Recurrence"},
                {"D8", "Closure"}
        };
        for (String[] s : seeds) {
            Quality8dDiscipline d = new Quality8dDiscipline();
            d.setDisciplineCode(s[0]);
            d.setDisciplineName(s[1]);
            d.setReport(report);
            report.getDisciplines().add(d);
        }
    }

    // ---------- workflow hooks ----------

    @Transactional
    public DocEntity action(String key, Long id, String action, String note, String user) {
        DocEntity e = docs.action(key, id, action, note, user);

        if ("quality-calibration-record".equals(key) && "approve".equals(action)) {
            applyCalibrationResult((QualityCalibrationRecord) e, user);
        }

        if ("quality-8d".equals(key) && "approve".equals(action)) {
            Quality8d report = (Quality8d) e;
            report.setReportStatus("CLOSED");
            report.setClosedAt(java.time.Instant.now());
        }

        if ("quality-customer-complaint".equals(key)) {
            QualityCustomerComplaint c = (QualityCustomerComplaint) e;
            switch (action) {
                case "submit" -> {
                    if ("OPEN".equals(c.getComplaintStatus())) c.setComplaintStatus("UNDER_REVIEW");
                }
                case "approve" -> {
                    c.setComplaintStatus("CLOSED");
                    c.setClosedAt(java.time.Instant.now());
                }
                case "reject" -> c.setComplaintStatus("REOPENED");
                case "cancel" -> c.setComplaintStatus("CLOSED");
                default -> { }
            }
        }

        if ("quality-capa".equals(key)) {
            QualityCapa c = (QualityCapa) e;
            switch (action) {
                case "submit" -> c.setCapaStatus("IN_PROGRESS");
                case "approve" -> {
                    c.setCapaStatus("CLOSED");
                    c.setClosedAt(java.time.Instant.now());
                    c.setApprovedBy(user);
                }
                default -> { }
            }
        }

        return e;
    }

    /** Rule §25: approved calibration refreshes the instrument schedule. */
    private void applyCalibrationResult(QualityCalibrationRecord r, String user) {
        if (r.getInstrumentId() == null) return;
        QualityCalibrationInstrument inst = instruments.findById(r.getInstrumentId()).orElse(null);
        if (inst == null) return;

        LocalDate done = r.getCalibrationDate() != null ? r.getCalibrationDate() : LocalDate.now();
        inst.setLastCalibrationDate(done);
        inst.setCertificateNumber(r.getCertificateNumber());
        if (r.getExternalAgency() != null) inst.setCalibrationAgency(r.getExternalAgency());

        if ("FAIL".equalsIgnoreCase(r.getResult())) {
            inst.setStatus("FAILED");
        } else {
            LocalDate due = r.getNextDueDate();
            if (due == null && inst.getCalibrationFrequencyDays() != null) {
                due = done.plusDays(inst.getCalibrationFrequencyDays());
            }
            inst.setNextDueDate(due);
            inst.setStatus(computeStatus(due));
        }
        inst.setUpdatedAt(java.time.Instant.now());
        r.setApprovedBy(user);
        r.setApprovalDate(LocalDate.now());
    }

    private String computeStatus(LocalDate due) {
        if (due == null) return "VALID";
        LocalDate today = LocalDate.now();
        if (due.isBefore(today)) return "EXPIRED";
        if (!due.isAfter(today.plusDays(30))) return "DUE_SOON";
        return "VALID";
    }

    // ---------- calibration instruments ----------

    @Transactional
    public Map<String, Object> saveInstrument(Map<String, Object> body) {
        QualityCalibrationInstrument inst;
        Object idObj = body.get("id");
        if (idObj != null && !String.valueOf(idObj).isBlank()) {
            inst = instruments.findById(Long.valueOf(String.valueOf(idObj))).orElseThrow();
        } else {
            inst = new QualityCalibrationInstrument();
            inst.setCreatedAt(java.time.Instant.now());
        }

        if (body.containsKey("instrumentCode")) inst.setInstrumentCode(str(body.get("instrumentCode")));
        if (body.containsKey("instrumentName")) inst.setInstrumentName(str(body.get("instrumentName")));
        if (body.containsKey("instrumentType")) inst.setInstrumentType(str(body.get("instrumentType")));
        if (body.containsKey("make")) inst.setMake(str(body.get("make")));
        if (body.containsKey("model")) inst.setModel(str(body.get("model")));
        if (body.containsKey("serialNumber")) inst.setSerialNumber(str(body.get("serialNumber")));
        if (body.containsKey("measurementRange")) inst.setMeasurementRange(str(body.get("measurementRange")));
        if (body.containsKey("leastCount")) inst.setLeastCount(str(body.get("leastCount")));
        if (body.containsKey("accuracy")) inst.setAccuracy(str(body.get("accuracy")));
        if (body.containsKey("location")) inst.setLocation(str(body.get("location")));
        if (body.containsKey("departmentId")) inst.setDepartmentId(str(body.get("departmentId")));
        if (body.containsKey("ownerUserId")) inst.setOwnerUserId(str(body.get("ownerUserId")));
        if (body.containsKey("calibrationFrequencyDays"))
            inst.setCalibrationFrequencyDays(intOrNull(body.get("calibrationFrequencyDays")));
        if (body.containsKey("calibrationType")) inst.setCalibrationType(str(body.get("calibrationType")));
        if (body.containsKey("calibrationAgency")) inst.setCalibrationAgency(str(body.get("calibrationAgency")));
        if (body.containsKey("certificateNumber")) inst.setCertificateNumber(str(body.get("certificateNumber")));
        if (body.containsKey("calibrationPolicy")) inst.setCalibrationPolicy(str(body.get("calibrationPolicy")));
        if (body.containsKey("nextDueDate")) inst.setNextDueDate(dateOrNull(body.get("nextDueDate")));
        if (body.containsKey("lastCalibrationDate")) inst.setLastCalibrationDate(dateOrNull(body.get("lastCalibrationDate")));
        if (body.containsKey("status")) inst.setStatus(str(body.get("status")));

        if (inst.getStatus() == null || inst.getStatus().isBlank() || "VALID".equals(inst.getStatus())) {
            inst.setStatus(computeStatus(inst.getNextDueDate()));
        }

        inst.setUpdatedAt(java.time.Instant.now());
        return toRow(instruments.save(inst));
    }

    @Transactional
    public void retireInstrument(Long id, String reason) {
        QualityCalibrationInstrument inst = instruments.findById(id).orElseThrow();
        inst.setStatus("RETIRED");
        inst.setRetiredDate(LocalDate.now());
        inst.setRetiredReason(reason);
        inst.setUpdatedAt(java.time.Instant.now());
    }

    public Map<String, Object> calibrationStats() {
        LocalDate today = LocalDate.now();
        long total = count("select count(i) from QualityCalibrationInstrument i");
        long due7 = count("select count(i) from QualityCalibrationInstrument i where i.nextDueDate between :t and :t7 and i.status not in ('RETIRED','FAILED')",
                Map.of("t", today, "t7", today.plusDays(7)));
        long due30 = count("select count(i) from QualityCalibrationInstrument i where i.nextDueDate between :t and :t7 and i.status not in ('RETIRED','FAILED')",
                Map.of("t", today, "t7", today.plusDays(30)));
        long overdue = count("select count(i) from QualityCalibrationInstrument i where i.nextDueDate < :t and i.status not in ('RETIRED')",
                Map.of("t", today));
        long repair = count("select count(i) from QualityCalibrationInstrument i where i.status = 'UNDER_REPAIR'");
        long failed = count("select count(i) from QualityCalibrationInstrument i where i.status = 'FAILED'");

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("total", total);
        out.put("dueWithin7Days", due7);
        out.put("dueWithin30Days", due30);
        out.put("overdue", overdue);
        out.put("underRepair", repair);
        out.put("failed", failed);
        return out;
    }

    // ---------- aggregated dashboard (plan §33) ----------

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public Map<String, Object> dashboard() {
        Map<String, Object> out = new LinkedHashMap<>();

        // pending inspections by type
        List<Object[]> rows = em.createQuery(
                "select i.inspectionType, count(i) from QualityInspection i " +
                "where i.inspectionStatus in ('DRAFT','PENDING','IN_PROGRESS','SUBMITTED') group by i.inspectionType")
                .getResultList();
        Map<String, Long> pendingByType = new LinkedHashMap<>();
        for (String t : List.of("IQC", "LO", "JOMIN", "FAI", "IPQC", "LINE", "LAST_OFF", "FINAL"))
            pendingByType.put(t, 0L);
        long pendingTotal = 0;
        for (Object[] r : rows) {
            long c = ((Number) r[1]).longValue();
            pendingByType.put(String.valueOf(r[0]), c);
            pendingTotal += c;
        }
        out.put("pendingByType", pendingByType);
        out.put("pendingTotal", pendingTotal);

        out.put("openNcr", count("select count(n) from QualityNcr n where n.status in ('DRAFT','SUBMITTED') or (n.status = 'APPROVED' and n.dispositionType is null)"));
        out.put("openConcession", count("select count(c) from QualityConcession c where c.status in ('DRAFT','SUBMITTED')"));
        out.put("openComplaints", count("select count(c) from QualityCustomerComplaint c where c.complaintStatus not in ('CLOSED')"));
        out.put("openCapa", count("select count(c) from QualityCapa c where c.capaStatus not in ('CLOSED')"));
        out.put("open8d", count("select count(r) from Quality8d r where r.reportStatus not in ('CLOSED')"));

        // decided counts for pass-rate KPIs
        Long pass = count("select count(i) from QualityInspection i where i.inspectionStatus in ('PASS','APPROVED','CLOSED') and i.decisionStatus = 'PASS'");
        Long fail = count("select count(i) from QualityInspection i where i.decisionStatus = 'FAIL'");
        Long hold = count("select count(i) from QualityInspection i where i.decisionStatus = 'HOLD'");
        out.put("pass", pass);
        out.put("fail", fail);
        out.put("hold", hold);

        out.put("calibration", calibrationStats());
        return out;
    }

    private Long count(String jqql) {
        return ((Number) em.createQuery(jqql).getSingleResult()).longValue();
    }

    private Long count(String jqql, Map<String, Object> params) {
        var q = em.createQuery(jqql);
        params.forEach(q::setParameter);
        return ((Number) q.getSingleResult()).longValue();
    }

    private Map<String, Object> toRow(QualityCalibrationInstrument i) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", i.getId());
        m.put("instrumentCode", i.getInstrumentCode());
        m.put("instrumentName", i.getInstrumentName());
        m.put("instrumentType", i.getInstrumentType());
        m.put("make", i.getMake());
        m.put("model", i.getModel());
        m.put("serialNumber", i.getSerialNumber());
        m.put("measurementRange", i.getMeasurementRange());
        m.put("leastCount", i.getLeastCount());
        m.put("accuracy", i.getAccuracy());
        m.put("location", i.getLocation());
        m.put("departmentId", i.getDepartmentId());
        m.put("ownerUserId", i.getOwnerUserId());
        m.put("calibrationFrequencyDays", i.getCalibrationFrequencyDays());
        m.put("calibrationType", i.getCalibrationType());
        m.put("lastCalibrationDate", i.getLastCalibrationDate());
        m.put("nextDueDate", i.getNextDueDate());
        m.put("calibrationAgency", i.getCalibrationAgency());
        m.put("certificateNumber", i.getCertificateNumber());
        m.put("status", i.getStatus());
        m.put("calibrationPolicy", i.getCalibrationPolicy());
        return m;
    }

    private String str(Object o) { return o == null ? null : String.valueOf(o); }

    private Integer intOrNull(Object o) {
        if (o == null || String.valueOf(o).isBlank()) return null;
        try { return Integer.valueOf(String.valueOf(o)); } catch (NumberFormatException e) { return null; }
    }

    private LocalDate dateOrNull(Object o) {
        if (o == null || String.valueOf(o).isBlank()) return null;
        try { return LocalDate.parse(String.valueOf(o).substring(0, 10)); } catch (Exception e) { return null; }
    }
}
