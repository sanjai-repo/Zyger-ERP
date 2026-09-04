package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.dto.backfill.BackfillJobRequest;
import in.zygertechnology.zygererp.dto.backfill.BackfillJobResponse;
import in.zygertechnology.zygererp.dto.backfill.BackfillRunResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * P3.4 — Unit tests for the backfill command (control) layer gates.
 *
 * <p>Self-contained (no database, no untracked base class). Exercises the mandatory
 * control-flow gates on top of the committed P3.3 engine: operation validation,
 * dry-run-before-write confirmation, zero-eligible no-write refusal, status and rollback
 * delegation, and server-side actor derivation.
 */
class ProductionBackfillCommandServiceTest {

    private ProductionBackfillService backfill;
    private ProductionBackfillProgressService progress;
    private ProductionBackfillCommandService command;

    @BeforeEach
    void setUp() {
        backfill = mock(ProductionBackfillService.class);
        progress = mock(ProductionBackfillProgressService.class);
        command = new ProductionBackfillCommandService(backfill, progress);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("op-admin", "pw",
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("DRY_RUN is read-only and never triggers a write execution")
    void dryRunNeverWrites() {
        BackfillRunResult result = BackfillRunResult.builder()
                .jobId("job-x").dryRun(true).executionGateOpen(false).reconciliation("PASS").build();
        when(backfill.backfill(anyString(), eq(true), anyString())).thenReturn(result);
        BackfillJobResponse resp = command.handle(BackfillJobRequest.builder()
                .operation("DRY_RUN").build());
        verify(backfill).backfill(anyString(), eq(true), anyString());
        verify(backfill, never()).backfill(anyString(), eq(false), anyString());
        verify(backfill, never()).rollback(anyString());
        assertEquals("DRY_RUN", resp.getOperation());
    }

    @Test
    @DisplayName("EXECUTE without operator confirmation is refused (dry-run-before-write)")
    void executeRequiresConfirmation() {
        assertThrows(IllegalArgumentException.class,
                () -> command.handle(BackfillJobRequest.builder()
                        .operation("EXECUTE").jobId("job-x").build()));
        verify(backfill, never()).backfill(anyString(), eq(false), anyString());
    }

    @Test
    @DisplayName("EXECUTE with confirmation, zero eligible -> deterministic ZERO_ELIGIBLE_NO_WRITE, no write")
    void zeroEligibleRefusesWrite() {
        BackfillRunResult probe = BackfillRunResult.builder()
                .jobId("job-x").dryRun(true).executionGateOpen(true).reconciliation("PASS")
                .build(); // empty entries -> projectedCount()==0 -> zero eligible
        when(backfill.backfill(anyString(), eq(true), anyString())).thenReturn(probe);

        BackfillJobResponse resp = command.handle(BackfillJobRequest.builder()
                .operation("EXECUTE").jobId("job-x").dryRun(false)
                .confirmationToken(ProductionBackfillCommandService.CONFIRMATION).build());

        assertTrue(resp.isZeroEligibleNoWrite());
        assertEquals(ProductionBackfillCommandService.OUTCOME_ZERO_ELIGIBLE_NO_WRITE, resp.getOutcome());
        // The probe dry-run ran, but NO real write execution and NO rollback occurred.
        verify(backfill, never()).backfill(anyString(), eq(false), anyString());
        verify(backfill, never()).rollback(anyString());
    }

    @Test
    @DisplayName("STATUS is read-only and delegates to committed progress state")
    void statusIsReadOnly() {
        when(progress.stateOf("job-x")).thenReturn("COMPLETED");
        BackfillJobResponse resp = command.handle(BackfillJobRequest.builder()
                .operation("STATUS").jobId("job-x").build());
        assertEquals("COMPLETED", resp.getStatus());
        verify(backfill, never()).backfill(anyString(), anyBoolean(), anyString());
        verify(backfill, never()).rollback(anyString());
    }

    @Test
    @DisplayName("ROLLBACK requires confirmation and delegates to additive-only engine")
    void rollbackRequiresConfirmation() {
        when(progress.stateOf("job-x")).thenReturn("ROLLED_BACK");
        assertThrows(IllegalArgumentException.class,
                () -> command.handle(BackfillJobRequest.builder()
                        .operation("ROLLBACK").jobId("job-x").build()));
        verify(backfill, never()).rollback(anyString());

        BackfillJobResponse resp = command.handle(BackfillJobRequest.builder()
                .operation("ROLLBACK").jobId("job-x")
                .confirmationToken(ProductionBackfillCommandService.CONFIRMATION).build());
        verify(backfill).rollback("job-x");
        assertEquals("ROLLED_BACK", resp.getOutcome());
    }

    @Test
    @DisplayName("Unknown operation is rejected")
    void unknownOperationRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> command.handle(BackfillJobRequest.builder().operation("PURGE").build()));
    }

    @Test
    @DisplayName("Null/blank operation is rejected")
    void blankOperationRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> command.handle(BackfillJobRequest.builder().build()));
        assertThrows(IllegalArgumentException.class,
                () -> command.handle(null));
    }

    @Test
    @DisplayName("Actor identity is derived server-side from the authenticated principal")
    void actorDerivedFromPrincipal() {
        BackfillRunResult result = BackfillRunResult.builder()
                .jobId("job-x").dryRun(true).executionGateOpen(false).reconciliation("PASS").build();
        when(backfill.backfill(anyString(), eq(true), anyString())).thenReturn(result);
        command.handle(BackfillJobRequest.builder().operation("DRY_RUN").build());
        verify(backfill).backfill(anyString(), eq(true), eq("op-admin"));
    }
}
