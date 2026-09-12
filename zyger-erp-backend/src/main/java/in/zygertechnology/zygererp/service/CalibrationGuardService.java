package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.QualityCalibrationInstrument;
import in.zygertechnology.zygererp.repo.QualityCalibrationInstrumentRepository;
import in.zygertechnology.zygererp.config.BusinessRuleException;
import in.zygertechnology.zygererp.security.RbacServiceBridge;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CalibrationGuardService {

    private static final Logger log = LoggerFactory.getLogger(CalibrationGuardService.class);

    private final QualityCalibrationInstrumentRepository instruments;
    private final RbacServiceBridge rbacBridge;

    /**
     * §6.5: Enforce calibration policy before allowing a Quality Inspection measurement.
     * Respects the instrument's calibrationPolicy field:
     *   BLOCK: overdue calibration → hard block with HTTP 422
     *   WARN (default): calibration expiring within 30 days → log warning, allow
     *
     * Override path: requires overrideReason AND QUALITY_CALIBRATION_OVERRIDE permission.
     */
    @Transactional
    public void enforcePolicy(String instrumentCode, String overrideReason, String overriddenBy) {
        if (instrumentCode == null || instrumentCode.isBlank()) return;

        QualityCalibrationInstrument instrument = instruments.findByInstrumentCode(instrumentCode).orElse(null);
        if (instrument == null) return;

        String policy = instrument.getCalibrationPolicy();
        if (policy == null) policy = "WARN";

        LocalDate due = instrument.getNextDueDate();
        if (due == null) return;

        LocalDate today = LocalDate.now();
        long daysUntil = ChronoUnit.DAYS.between(today, due);

        if (daysUntil < 0) {
            if ("BLOCK".equalsIgnoreCase(policy)) {
                if (overrideReason != null && !overrideReason.isBlank()) {
                    if (overriddenBy != null && !rbacBridge.hasPermission(overriddenBy, "QUALITY", "CALIBRATION", "OVERRIDE")) {
                        throw new BusinessRuleException("CALIBRATION_OVERRIDE_DENIED",
                                "User " + overriddenBy + " lacks QUALITY_CALIBRATION_OVERRIDE permission.");
                    }
                    log.warn("CALIBRATION OVERRIDE: User {} overrode BLOCKED calibration for {} with reason: {}",
                            overriddenBy, instrumentCode, overrideReason);
                    return;
                }
                Map<String, Object> details = new LinkedHashMap<>();
                details.put("instrumentCode", instrumentCode);
                details.put("calibrationPolicy", policy);
                details.put("overdueDays", Math.abs(daysUntil));
                details.put("nextDueDate", due.toString());
                throw new BusinessRuleException("CALIBRATION_OVERDUE",
                        "Calibration is overdue by " + Math.abs(daysUntil) + " days (policy=BLOCK). Cannot proceed.",
                        details);
            }
        } else if (daysUntil <= 30) {
            log.warn("CALIBRATION DUE_SOON: Instrument {} calibration expires in {} days (policy={})",
                    instrumentCode, daysUntil, policy);
        }
    }

    @Transactional
    public void enforcePolicy(String instrumentCode) {
        enforcePolicy(instrumentCode, null, null);
    }
}
