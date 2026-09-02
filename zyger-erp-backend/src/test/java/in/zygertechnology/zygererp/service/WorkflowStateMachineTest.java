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
        assertFalse(stateMachine.canTransition("work-order", "DRAFT", "APPROVE"));
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> stateMachine.validateTransition("work-order", "DRAFT", "APPROVE")
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
        Set<String> actions = stateMachine.getAllowedActions("job-card", "PENDING");
        assertTrue(actions.contains("RELEASE"));
        assertTrue(actions.contains("CANCEL"));
        assertFalse(actions.contains("COMPLETE"));
    }
}
