package in.zygertechnology.zygererp.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class WorkflowStateMachineTest {

    private WorkflowStateMachine stateMachine;

    @BeforeEach
    void setUp() {
        stateMachine = new WorkflowStateMachine();
    }

    @Test
    @DisplayName("Valid transitions should be allowed")
    void testValidTransitions() {
        assertTrue(stateMachine.canTransition("work-order", "DRAFT", "SUBMIT"));
        assertTrue(stateMachine.canTransition("work-order", "SUBMITTED", "APPROVE"));
        assertTrue(stateMachine.canTransition("work-order", "APPROVED", "RELEASE"));
        assertDoesNotThrow(() -> stateMachine.validateTransition("work-order", "DRAFT", "SUBMIT"));
    }

    @Test
    @DisplayName("Invalid transition should throw IllegalArgumentException")
    void testInvalidTransitionThrowsException() {
        assertFalse(stateMachine.canTransition("work-order", "DRAFT", "RELEASE"));
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> stateMachine.validateTransition("work-order", "DRAFT", "RELEASE")
        );
        assertTrue(ex.getMessage().contains("Invalid transition"));
    }

    @Test
    @DisplayName("Unknown doc type should bypass validation without throwing")
    void testUnknownDocTypeBypasses() {
        assertTrue(stateMachine.canTransition("unknown-doc", "DRAFT", "ANY_ACTION"));
        assertDoesNotThrow(() -> stateMachine.validateTransition("unknown-doc", "DRAFT", "ANY_ACTION"));
    }

    @Test
    @DisplayName("getAllowedActions should return correct set of allowed actions")
    void testGetAllowedActions() {
        Set<String> actions = stateMachine.getAllowedActions("job-card", "DRAFT");
        assertTrue(actions.contains("APPROVE"));
        assertTrue(actions.contains("CANCEL"));
        assertFalse(actions.contains("COMPLETE"));
    }

    @Test
    @DisplayName("Material Request lifecycle transitions should be enforced")
    void testMaterialRequestTransitions() {
        assertTrue(stateMachine.canTransition("material-request", "DRAFT", "SUBMIT"));
        assertTrue(stateMachine.canTransition("material-request", "SUBMITTED", "APPROVE"));
        assertTrue(stateMachine.canTransition("material-request", "APPROVED", "ISSUE"));
        assertTrue(stateMachine.canTransition("material-request", "ISSUED", "CLOSE"));
        assertTrue(stateMachine.canTransition("material-request", "ISSUED", "CANCEL"));
        assertFalse(stateMachine.canTransition("material-request", "DRAFT", "ISSUE"));
        assertFalse(stateMachine.canTransition("material-request", "DRAFT", "APPROVE"));
    }

    @Test
    @DisplayName("Production Consumption lifecycle transitions should be enforced")
    void testProductionConsumptionTransitions() {
        assertTrue(stateMachine.canTransition("production-consumption", "DRAFT", "SUBMIT"));
        assertTrue(stateMachine.canTransition("production-consumption", "SUBMITTED", "POST"));
        assertFalse(stateMachine.canTransition("production-consumption", "DRAFT", "POST"));
        assertFalse(stateMachine.canTransition("production-consumption", "POSTED", "POST"));
    }

    @Test
    @DisplayName("Production Entry lifecycle mirrors the controller inline switch (W1/W6)")
    void testProductionEntryTransitions() {
        assertTrue(stateMachine.canTransition("production-entry", "DRAFT", "SUBMIT"));
        assertTrue(stateMachine.canTransition("production-entry", "DRAFT", "CANCEL"));
        assertTrue(stateMachine.canTransition("production-entry", "SUBMITTED", "APPROVE"));
        assertTrue(stateMachine.canTransition("production-entry", "SUBMITTED", "REJECT"));
        assertTrue(stateMachine.canTransition("production-entry", "SUBMITTED", "CANCEL"));
        assertTrue(stateMachine.canTransition("production-entry", "APPROVED", "POST"));
        assertTrue(stateMachine.canTransition("production-entry", "POSTED", "REVERSE"));
        assertTrue(stateMachine.canTransition("production-entry", "COMPLETED", "REVERSE"));

        assertFalse(stateMachine.canTransition("production-entry", "DRAFT", "APPROVE"));
        assertFalse(stateMachine.canTransition("production-entry", "DRAFT", "POST"));
        assertFalse(stateMachine.canTransition("production-entry", "APPROVED", "REVERSE"));
        assertFalse(stateMachine.canTransition("production-entry", "REJECTED", "REOPEN"));

        // Terminal states
        assertTrue(stateMachine.getAllowedActions("production-entry", "REVERSED").isEmpty());
        assertTrue(stateMachine.getAllowedActions("production-entry", "REJECTED").isEmpty());
        assertTrue(stateMachine.getAllowedActions("production-entry", "CANCELLED").isEmpty());

        // QC sub-states are legal from active statuses
        assertTrue(stateMachine.canTransition("production-entry", "APPROVED", "QUALITY_PASS"));
        assertTrue(stateMachine.canTransition("production-entry", "POSTED", "QUALITY_HOLD"));
        assertFalse(stateMachine.canTransition("production-entry", "REVERSED", "QUALITY_PASS"));
    }

    @Test
    @DisplayName("Work Order lifecycle matches PlanningService action switch")
    void testWorkOrderTransitions() {
        assertTrue(stateMachine.canTransition("work-order", "DRAFT", "APPROVE"));
        assertTrue(stateMachine.canTransition("work-order", "SUBMITTED", "CANCEL"));
        assertTrue(stateMachine.canTransition("work-order", "REJECTED", "REOPEN"));
        assertTrue(stateMachine.canTransition("work-order", "REJECTED", "SUBMIT"));
        assertTrue(stateMachine.canTransition("work-order", "RELEASED", "SHORT_CLOSE"));
        assertTrue(stateMachine.canTransition("work-order", "IN_PROCESS", "SHORT_CLOSE"));
        assertTrue(stateMachine.canTransition("work-order", "ON_HOLD", "START"));

        assertFalse(stateMachine.canTransition("work-order", "RELEASED", "CANCEL"));
        assertFalse(stateMachine.canTransition("work-order", "ON_HOLD", "RELEASE"));
        assertFalse(stateMachine.canTransition("work-order", "IN_PROCESS", "RELEASE"));
        assertTrue(stateMachine.getAllowedActions("work-order", "CANCELLED").isEmpty());
        assertTrue(stateMachine.getAllowedActions("work-order", "CLOSED").isEmpty());
    }

    @Test
    @DisplayName("Job Card lifecycle matches ProductionJobCardService action switch")
    void testJobCardTransitions() {
        assertTrue(stateMachine.canTransition("job-card", "DRAFT", "APPROVE"));
        assertTrue(stateMachine.canTransition("job-card", "APPROVED", "RELEASE"));
        assertTrue(stateMachine.canTransition("job-card", "RELEASED", "START"));
        assertTrue(stateMachine.canTransition("job-card", "RELEASED", "QUALITY_HOLD"));
        assertTrue(stateMachine.canTransition("job-card", "IN_PROGRESS", "COMPLETE"));
        assertTrue(stateMachine.canTransition("job-card", "IN_PROGRESS", "RESUME"));
        assertTrue(stateMachine.canTransition("job-card", "ON_HOLD", "RESUME"));
        assertTrue(stateMachine.canTransition("job-card", "QUALITY_HOLD", "RELEASE_HOLD"));
        assertTrue(stateMachine.canTransition("job-card", "PRODUCTION_HOLD", "RELEASE_HOLD"));
        assertTrue(stateMachine.canTransition("job-card", "COMPLETED", "REOPEN"));

        assertFalse(stateMachine.canTransition("job-card", "RELEASED", "COMPLETE"));
        assertFalse(stateMachine.canTransition("job-card", "ON_HOLD", "RELEASE"));
        assertFalse(stateMachine.canTransition("job-card", "COMPLETED", "CANCEL"));
        assertTrue(stateMachine.getAllowedActions("job-card", "CANCELLED").isEmpty());
    }

    @Test
    @DisplayName("Subjob lifecycle matches ProductionJobCardService subjobAction")
    void testSubjobTransitions() {
        assertTrue(stateMachine.canTransition("subjob", "PENDING", "RELEASE"));
        assertTrue(stateMachine.canTransition("subjob", "PENDING", "CANCEL"));
        assertTrue(stateMachine.canTransition("subjob", "RELEASED", "START"));
        assertTrue(stateMachine.canTransition("subjob", "IN_PROGRESS", "QUALITY_HOLD"));
        assertTrue(stateMachine.canTransition("subjob", "PRODUCTION_HOLD", "RELEASE_HOLD"));
        assertTrue(stateMachine.canTransition("subjob", "ON_HOLD", "RESUME"));
        assertTrue(stateMachine.canTransition("subjob", "IN_PROGRESS", "COMPLETE"));

        assertFalse(stateMachine.canTransition("subjob", "COMPLETED", "CANCEL"));
        assertTrue(stateMachine.getAllowedActions("subjob", "COMPLETED").isEmpty());
    }

    @Test
    @DisplayName("Production Log Sheet lifecycle (verify/close/cancel)")
    void testProductionLogSheetTransitions() {
        assertTrue(stateMachine.canTransition("production-log-sheet", "DRAFT", "VERIFY"));
        assertTrue(stateMachine.canTransition("production-log-sheet", "VERIFIED", "CLOSE"));
        assertFalse(stateMachine.canTransition("production-log-sheet", "DRAFT", "POST"));
        assertTrue(stateMachine.getAllowedActions("production-log-sheet", "CLOSED").isEmpty());
    }

    @Test
    @DisplayName("Idle Time Entry lifecycle (verify/cancel)")
    void testIdleTimeEntryTransitions() {
        assertTrue(stateMachine.canTransition("idle-time-entry", "DRAFT", "VERIFY"));
        assertFalse(stateMachine.canTransition("idle-time-entry", "DRAFT", "APPROVE"));
        assertTrue(stateMachine.getAllowedActions("idle-time-entry", "CANCELLED").isEmpty());
    }

    @Test
    @DisplayName("Disposition documents (rejection/scrap/rework) follow the disposition guardTransition")
    void testDispositionDocumentTransitions() {
        for (String docType : Set.of("rejection-document", "scrap-document", "rework-document")) {
            assertTrue(stateMachine.canTransition(docType, "DRAFT", "SUBMIT"));
            assertTrue(stateMachine.canTransition(docType, "SUBMITTED", "APPROVE"));
            assertTrue(stateMachine.canTransition(docType, "APPROVED", "POST"));
            assertTrue(stateMachine.canTransition(docType, "POSTED", "REVERSE"));
            assertTrue(stateMachine.canTransition(docType, "POSTED", "CLOSE"));
            assertFalse(stateMachine.canTransition(docType, "DRAFT", "POST"));
            assertFalse(stateMachine.canTransition(docType, "SUBMITTED", "POST"));
            assertFalse(stateMachine.canTransition(docType, "POSTED", "SUBMIT"));
            assertTrue(stateMachine.getAllowedActions(docType, "REVERSED").isEmpty());
        }
    }

    @Test
    @DisplayName("Quality Gate Override lifecycle (PENDING → APPROVED → APPLIED)")
    void testQualityGateOverrideTransitions() {
        assertTrue(stateMachine.canTransition("quality-gate-override", "PENDING", "QUALITY_SIGN"));
        assertTrue(stateMachine.canTransition("quality-gate-override", "PENDING", "PRODUCTION_SIGN"));
        assertTrue(stateMachine.canTransition("quality-gate-override", "PENDING", "PLANT_HEAD_SIGN"));
        assertTrue(stateMachine.canTransition("quality-gate-override", "APPROVED", "APPLY"));
        assertFalse(stateMachine.canTransition("quality-gate-override", "PENDING", "APPLY"));
        assertFalse(stateMachine.canTransition("quality-gate-override", "APPLIED", "APPLY"));
    }

    @Test
    @DisplayName("Engineering Change uses submitted-action lifecycle, canonical key + legacy ecr alias (W4)")
    void testEngineeringChangeTransitions() {
        for (String key : Set.of("engineering-change", "ecr")) {
            assertTrue(stateMachine.canTransition(key, "DRAFT", "SUBMIT_ECR"));
            assertTrue(stateMachine.canTransition(key, "SUBMITTED", "APPROVE_ECR"));
            assertTrue(stateMachine.canTransition(key, "SUBMITTED", "REJECT_ECR"));
            assertTrue(stateMachine.canTransition(key, "APPROVED", "IMPLEMENT"));
            assertTrue(stateMachine.canTransition(key, "IMPLEMENTED", "CLOSE"));
            assertFalse(stateMachine.canTransition(key, "DRAFT", "IMPLEMENT"));
            assertFalse(stateMachine.canTransition(key, "APPROVED", "CLOSE"));
            assertTrue(stateMachine.getAllowedActions(key, "CLOSED").isEmpty());
        }
        assertEquals(
            stateMachine.getAllowedActions("engineering-change", "APPROVED"),
            stateMachine.getAllowedActions("ecr", "APPROVED"));
    }

    @Test
    @DisplayName("Enforced doc types keep their original registrations (F5 W5 — no behavior change)")
    void testEnforcedTypesUnchanged() {
        assertTrue(stateMachine.canTransition("material-request", "ISSUED", "CANCEL"));
        assertTrue(stateMachine.canTransition("production-consumption", "SUBMITTED", "CANCEL"));
        assertTrue(stateMachine.canTransition("production-return", "VERIFIED", "RECEIVE"));
        assertTrue(stateMachine.canTransition("product-conversion", "SUBMITTED", "VERIFY"));
        assertTrue(stateMachine.canTransition("batch-card", "OPEN", "HOLD"));
        assertTrue(stateMachine.canTransition("batch-card", "HELD", "REOPEN"));
        // Regressions must not have been introduced for enforced docs
        assertFalse(stateMachine.canTransition("product-conversion", "DRAFT", "POST"));
        assertFalse(stateMachine.canTransition("production-return", "DRAFT", "RECEIVE"));
        assertFalse(stateMachine.canTransition("production-consumption", "POSTED", "POST"));
    }
}