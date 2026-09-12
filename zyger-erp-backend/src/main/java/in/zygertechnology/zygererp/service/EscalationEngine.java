package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.EscalationRule;
import in.zygertechnology.zygererp.entity.EscalationLog;
import in.zygertechnology.zygererp.repository.EscalationRuleRepository;
import in.zygertechnology.zygererp.repository.EscalationLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Duration;
import java.util.*;

/**
 * §2.5: Escalation engine — checks SLA compliance and generates escalation logs
 * when documents exceed their SLA hours.
 */
@Service
@RequiredArgsConstructor
public class EscalationEngine {

    private static final Logger log = LoggerFactory.getLogger(EscalationEngine.class);

    private final EscalationRuleRepository ruleRepo;
    private final EscalationLogRepository logRepo;
    private final NotificationService notificationService;

    /**
     * Check if a document has exceeded its SLA and create an escalation log entry.
     */
    @Transactional
    public void checkAndEscalate(String docKey, Long docId, String docNumber, Instant createdAt) {
        List<EscalationRule> rules = ruleRepo.findByDocKeyAndActiveTrue(docKey);
        if (rules.isEmpty()) return;

        List<EscalationLog> existingLogs = logRepo.findByDocKeyAndDocId(docKey, docId);
        Set<String> alreadyEscalatedRoles = existingLogs.stream()
                .map(EscalationLog::getEscalatedTo)
                .collect(java.util.stream.Collectors.toSet());

        for (EscalationRule rule : rules) {
            long hoursElapsed = Duration.between(createdAt, Instant.now()).toHours();
            if (hoursElapsed <= rule.getSlaHours()) continue;

            if (alreadyEscalatedRoles.contains(rule.getEscalateToRole())) continue;

            EscalationLog escalationLog = EscalationLog.builder()
                    .docKey(docKey)
                    .docId(docId)
                    .rule(rule)
                    .action("ESCALATED")
                    .escalatedTo(rule.getEscalateToRole())
                    .reason("SLA exceeded: " + rule.getSlaHours() + "h limit, " + hoursElapsed + "h elapsed")
                    .build();
            logRepo.save(escalationLog);

            log.warn("ESCALATION: {} {} exceeded SLA ({}h). Escalated to {}",
                    docKey, docNumber, rule.getSlaHours(), rule.getEscalateToRole());

            // §2.5: Fire in-app notification on SLA breach
            try {
                notificationService.notify(
                        "ESCALATION",
                        docKey.contains("QUALITY") ? "QUALITY" : "MAINTENANCE",
                        docKey,
                        docId,
                        "HIGH",
                        "SLA breached for " + docNumber + " (" + hoursElapsed + "h elapsed, limit " + rule.getSlaHours() + "h). Escalated to " + rule.getEscalateToRole(),
                        docNumber
                );
            } catch (Exception ex) {
                log.warn("Failed to fire escalation notification for {} {}: {}", docKey, docNumber, ex.getMessage());
            }
        }
    }
}
