package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.BaseDoc;
import in.zygertechnology.zygererp.config.BusinessRuleException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Map;

@Service
public class BackdatedEntryGuardService {

    private static final int MAX_BACKDATED_HOURS = 2;
    private static final ZoneId SYSTEM_ZONE = ZoneId.of("Asia/Kolkata");

    /**
     * §9.3: Backdated-entry authorization guard.
     * If the doc date is more than MAX_BACKDATED_HOURS before now,
     * the user must pass the BACKDATED_AUTHORIZATION check.
     */
    public void enforce(String docDateStr, String enteredBy) {
        if (docDateStr == null || docDateStr.isBlank()) return;

        LocalDate docDate;
        try {
            docDate = LocalDate.parse(docDateStr);
        } catch (Exception e) {
            return;
        }

        LocalDateTime docDateTime = docDate.atTime(LocalTime.of(23, 59, 59));
        LocalDateTime now = LocalDateTime.now(SYSTEM_ZONE);

        long hoursBack = Duration.between(docDateTime, now).toHours();

        if (hoursBack > MAX_BACKDATED_HOURS) {
            Map<String, Object> details = Map.of(
                    "docDate", docDateStr,
                    "hoursBackdated", hoursBack,
                    "maxAllowed", MAX_BACKDATED_HOURS,
                    "enteredBy", enteredBy != null ? enteredBy : "unknown"
            );
            throw new BusinessRuleException("BACKDATED_ENTRY",
                    "Document date " + docDateStr + " is " + hoursBack + " hours in the past. " +
                    "Backdated entries beyond " + MAX_BACKDATED_HOURS + " hours require management authorization.",
                    details);
        }
    }
}
