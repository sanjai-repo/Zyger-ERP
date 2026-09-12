package in.zygertechnology.zygererp.service;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * FRS §6.3/§7.2/§7.3: Explicit state-machine guard table for all workflows.
 * HTTP 409 on illegal transition.
 *
 * <p>Governance remediation (P15 / DOCUMENT_67 F5 W1–W6): every map below mirrors the
 * real, implemented lifecycle of its owner service. Registrations are documentation
 * + forward-enforcement contracts: {@link #validateTransition} is call-on-demand and no
 * new call sites were added, so no runtime behavior changes. The five enforced doc types
 * ({@code material-request}, {@code production-consumption}, {@code production-return},
 * {@code product-conversion}, {@code batch-card}) are untouched.
 */
@Service
public class WorkflowStateMachine {

    private static final Map<String, Map<String, Set<String>>> TRANSITIONS = Map.ofEntries(
        // Work Order — PlanningService.action() status switch (PlanningService.java:396-502)
        Map.entry("work-order", Map.of(
            "DRAFT", Set.of("SUBMIT", "APPROVE", "CANCEL"),
            "SUBMITTED", Set.of("APPROVE", "REJECT", "CANCEL"),
            "REJECTED", Set.of("REOPEN", "SUBMIT"),
            "APPROVED", Set.of("RELEASE", "CANCEL"),
            "RELEASED", Set.of("START", "HOLD", "SHORT_CLOSE"),
            "IN_PROCESS", Set.of("COMPLETE", "HOLD", "SHORT_CLOSE"),
            "ON_HOLD", Set.of("START", "SHORT_CLOSE"),
            "COMPLETED", Set.of("CLOSE"),
            "CLOSED", Set.of(),
            "CANCELLED", Set.of()
        )),
        // Job Card — ProductionJobCardService.jobCardAction() (DRAFT:approve→APPROVED, release/start/hold/quality-hold/production-hold/release-hold/reopen/resume/complete/close/cancel)
        Map.entry("job-card", Map.of(
            "DRAFT", Set.of("APPROVE", "CANCEL"),
            "APPROVED", Set.of("RELEASE", "CANCEL"),
            "RELEASED", Set.of("START", "HOLD", "QUALITY_HOLD", "PRODUCTION_HOLD", "CANCEL"),
            "IN_PROGRESS", Set.of("HOLD", "QUALITY_HOLD", "PRODUCTION_HOLD", "RESUME", "COMPLETE", "CANCEL"),
            "ON_HOLD", Set.of("RESUME", "CANCEL"),
            "QUALITY_HOLD", Set.of("RELEASE_HOLD", "CANCEL"),
            "PRODUCTION_HOLD", Set.of("RELEASE_HOLD", "CANCEL"),
            "COMPLETED", Set.of("CLOSE", "REOPEN"),
            "CLOSED", Set.of(),
            "CANCELLED", Set.of()
        )),
        // Subjob — ProductionJobCardService.subjobAction(); post/reverse (ProductionController) also
        // drive COMPLETED/IN_PROGRESS internally, hence COMPLETED is a service-level terminal state.
        Map.entry("subjob", Map.of(
            "PENDING", Set.of("RELEASE", "CANCEL"),
            "RELEASED", Set.of("START", "CANCEL"),
            "IN_PROGRESS", Set.of("HOLD", "QUALITY_HOLD", "PRODUCTION_HOLD", "RESUME", "COMPLETE", "CANCEL"),
            "ON_HOLD", Set.of("RESUME", "CANCEL"),
            "QUALITY_HOLD", Set.of("RELEASE_HOLD", "CANCEL"),
            "PRODUCTION_HOLD", Set.of("RELEASE_HOLD", "CANCEL"),
            "COMPLETED", Set.of(),
            "CANCELLED", Set.of()
        )),
        // Production Entry — ProductionController action switch (ProductionController.java:387-608).
        // REJECTED/CANCELLED/REVERSED are terminal (no reopen in the entry lifecycle). QC actions
        // mutate the parallel qualityStatus sub-state and are legal on every active status.
        Map.entry("production-entry", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL", "QUALITY_PASS", "QUALITY_FAIL", "QUALITY_HOLD"),
            "SUBMITTED", Set.of("APPROVE", "REJECT", "CANCEL", "QUALITY_PASS", "QUALITY_FAIL", "QUALITY_HOLD"),
            "APPROVED", Set.of("POST", "QUALITY_PASS", "QUALITY_FAIL", "QUALITY_HOLD"),
            "POSTED", Set.of("REVERSE", "QUALITY_PASS", "QUALITY_FAIL", "QUALITY_HOLD"),
            "COMPLETED", Set.of("REVERSE"),
            "REJECTED", Set.of(),
            "CANCELLED", Set.of(),
            "REVERSED", Set.of()
        )),
        // ECR / Engineering Change — canonical key is `engineering-change`
        // (PlanningMasterController.engineeringChangeAction(); numbering key at PlanningMasterController:530).
        // `ecr` is retained as a legacy alias with identical semantics.
        Map.entry("engineering-change", Map.of(
            "DRAFT", Set.of("SUBMIT_ECR"),
            "SUBMITTED", Set.of("APPROVE_ECR", "REJECT_ECR", "APPROVE", "REJECT"),
            "APPROVED", Set.of("IMPLEMENT"),
            "REJECTED", Set.of(),
            "IMPLEMENTED", Set.of("CLOSE"),
            "CLOSED", Set.of()
        )),
        Map.entry("ecr", Map.of(
            "DRAFT", Set.of("SUBMIT_ECR"),
            "SUBMITTED", Set.of("APPROVE_ECR", "REJECT_ECR", "APPROVE", "REJECT"),
            "APPROVED", Set.of("IMPLEMENT"),
            "REJECTED", Set.of(),
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
        )),
        // Production Material Request (FRS SCR-PROD-MREQ-001; DOC 11 §3.12)
        Map.entry("material-request", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL"),
            "SUBMITTED", Set.of("APPROVE", "REJECT"),
            "REJECTED", Set.of("REOPEN"),
            "APPROVED", Set.of("ISSUE", "CANCEL"),
            "ISSUED", Set.of("CLOSE", "CANCEL"),
            "CLOSED", Set.of()
        )),
        // Production Material Consumption (FRS SCR-PROD-CONSUME-001)
        Map.entry("production-consumption", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL"),
            "SUBMITTED", Set.of("POST", "CANCEL"),
            "POSTED", Set.of()
        )),
        // P10 — Batch Card (DOC_57 §4 #12): open/held/closed only; reversal is a mirror doc.
        Map.entry("batch-card", Map.of(
            "OPEN", Set.of("HOLD", "CLOSE"),
            "HELD", Set.of("REOPEN", "CLOSE")
        )),
        // Production Log Sheet — ProductionController log-sheet action (verify/close/cancel)
        Map.entry("production-log-sheet", Map.of(
            "DRAFT", Set.of("VERIFY", "CANCEL"),
            "VERIFIED", Set.of("CLOSE", "CANCEL"),
            "CLOSED", Set.of(),
            "CANCELLED", Set.of()
        )),
        // Idle Time Entry — ProductionController idle-time action (verify/cancel)
        Map.entry("idle-time-entry", Map.of(
            "DRAFT", Set.of("VERIFY", "CANCEL"),
            "VERIFIED", Set.of("CANCEL"),
            "CANCELLED", Set.of()
        )),
        // Rejection Document — ProductionDispositionService.actionRejection + guardTransition
        Map.entry("rejection-document", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL"),
            "SUBMITTED", Set.of("APPROVE", "CANCEL"),
            "APPROVED", Set.of("POST", "CANCEL"),
            "POSTED", Set.of("CLOSE", "REVERSE"),
            "CLOSED", Set.of(),
            "REVERSED", Set.of(),
            "CANCELLED", Set.of()
        )),
        // Scrap Document — ProductionDispositionService.actionScrap + guardTransition
        Map.entry("scrap-document", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL"),
            "SUBMITTED", Set.of("APPROVE", "CANCEL"),
            "APPROVED", Set.of("POST", "CANCEL"),
            "POSTED", Set.of("CLOSE", "REVERSE"),
            "CLOSED", Set.of(),
            "REVERSED", Set.of(),
            "CANCELLED", Set.of()
        )),
        // Rework Document — ProductionDispositionService.actionRework + guardTransition
        Map.entry("rework-document", Map.of(
            "DRAFT", Set.of("SUBMIT", "CANCEL"),
            "SUBMITTED", Set.of("APPROVE", "CANCEL"),
            "APPROVED", Set.of("POST", "CANCEL"),
            "POSTED", Set.of("CLOSE", "REVERSE"),
            "CLOSED", Set.of(),
            "REVERSED", Set.of(),
            "CANCELLED", Set.of()
        )),
        // Production Quality Gate Override — PENDING→APPROVED (auto once joint/plant-head signed)→APPLIED (one-time)
        Map.entry("quality-gate-override", Map.of(
            "PENDING", Set.of("QUALITY_SIGN", "PRODUCTION_SIGN", "PLANT_HEAD_SIGN"),
            "APPROVED", Set.of("APPLY"),
            "APPLIED", Set.of()
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