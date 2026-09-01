package in.zygertechnology.zygererp.service;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * FRS §6.3/§7.2/§7.3: Explicit state-machine guard table for all workflows.
 * HTTP 409 on illegal transition.
 */
@Service
public class WorkflowStateMachine {

    private static final Map<String, Map<String, Set<String>>> TRANSITIONS = Map.ofEntries(
        // Work Order — FRS §6.3/§6.4
        Map.entry("work-order", Map.of(
            "DRAFT", Set.of("SUBMIT", "APPROVE", "CANCEL"),
            "SUBMITTED", Set.of("APPROVE", "REJECT"),
            "REJECTED", Set.of("REOPEN"),
            "APPROVED", Set.of("RELEASE"),
            "RELEASED", Set.of("START", "HOLD", "CLOSE", "CANCEL"),
            "IN_PROCESS", Set.of("HOLD", "COMPLETE", "CANCEL"),
            "ON_HOLD", Set.of("RELEASE", "START", "CANCEL"),
            "COMPLETED", Set.of("CLOSE"),
            "CLOSED", Set.of("REOPEN")
        )),
        // Job Card
        Map.entry("job-card", Map.of(
            "PENDING", Set.of("RELEASE", "CANCEL"),
            "RELEASED", Set.of("START", "HOLD", "CANCEL"),
            "IN_PROGRESS", Set.of("HOLD", "COMPLETE", "QUALITY_HOLD"),
            "QUALITY_HOLD", Set.of("RELEASE_HOLD", "CANCEL"),
            "PRODUCTION_HOLD", Set.of("RELEASE_HOLD", "CANCEL"),
            "ON_HOLD", Set.of("RELEASE", "CANCEL"),
            "COMPLETED", Set.of("CLOSE", "REOPEN"),
            "CLOSED", Set.of()
        )),
        // Subjob
        Map.entry("subjob", Map.of(
            "PENDING", Set.of("RELEASE", "CANCEL"),
            "RELEASED", Set.of("START", "CANCEL"),
            "IN_PROGRESS", Set.of("HOLD", "COMPLETE", "QUALITY_HOLD"),
            "QUALITY_HOLD", Set.of("RELEASE_HOLD"),
            "PRODUCTION_HOLD", Set.of("RELEASE_HOLD"),
            "COMPLETED", Set.of()
        )),
        // Production Entry
        Map.entry("production-entry", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL"),
            "SUBMITTED", Set.of("APPROVE", "REJECT"),
            "APPROVED", Set.of()
        )),
        // ECR
        Map.entry("ecr", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL"),
            "SUBMITTED", Set.of("APPROVE", "REJECT"),
            "APPROVED", Set.of("IMPLEMENT", "CANCEL"),
            "IMPLEMENTED", Set.of("CLOSE"),
            "CLOSED", Set.of()
        )),
        // Product Conversion
        Map.entry("product-conversion", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL"),
            "SUBMITTED", Set.of("VERIFY", "REJECT"),
            "VERIFIED", Set.of("POST"),
            "POSTED", Set.of()
        )),
        // Production Return
        Map.entry("production-return", Map.of(
            "DRAFT", Set.of("SUBMIT"),
            "SUBMITTED", Set.of("VERIFY"),
            "VERIFIED", Set.of("RECEIVE"),
            "RECEIVED", Set.of()
        )),
        // Dispatch Plan
        Map.entry("dispatch-plan", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL"),
            "SUBMITTED", Set.of("APPROVE", "REJECT"),
            "APPROVED", Set.of("DISPATCH", "CANCEL"),
            "DISPATCHED", Set.of("CLOSE"),
            "CLOSED", Set.of()
        ))
    );

    /**
     * Validate that the requested action is allowed from the current status.
     * @throws IllegalArgumentException if transition is illegal
     */
    public void validateTransition(String docType, String currentStatus, String action) {
        Map<String, Set<String>> allowed = TRANSITIONS.get(docType.toLowerCase());
        if (allowed == null) return; // unknown doc type — no guard

        Set<String> actions = allowed.get(currentStatus);
        if (actions == null || !actions.contains(action.toUpperCase())) {
            throw new IllegalArgumentException(
                String.format("Invalid transition: cannot %s from status %s on %s",
                    action, currentStatus, docType));
        }
    }

    /** Check without throwing. */
    public boolean canTransition(String docType, String currentStatus, String action) {
        Map<String, Set<String>> allowed = TRANSITIONS.get(docType.toLowerCase());
        if (allowed == null) return true;
        Set<String> actions = allowed.get(currentStatus);
        return actions != null && actions.contains(action.toUpperCase());
    }

    /** Get all allowed actions for a given doc type + status. */
    public Set<String> getAllowedActions(String docType, String currentStatus) {
        Map<String, Set<String>> allowed = TRANSITIONS.get(docType.toLowerCase());
        if (allowed == null) return Set.of();
        return allowed.getOrDefault(currentStatus, Set.of());
    }
}
