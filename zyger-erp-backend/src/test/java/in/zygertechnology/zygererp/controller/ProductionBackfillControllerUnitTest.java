package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.dto.backfill.BackfillJobRequest;
import in.zygertechnology.zygererp.dto.backfill.BackfillJobResponse;
import in.zygertechnology.zygererp.service.ProductionBackfillCommandService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * P3.4 — Unit tests for the thin backfill control controller's role gate.
 *
 * <p>Self-contained (no database, no untracked test base class). Verifies the method-level
 * authorization contract: ADMIN and BACKFILL_OPERATOR are authorized, other roles and
 * anonymous users are rejected, actor identity is derived server-side (never from the
 * request body — the request DTO carries no actor field), and the controller is a thin
 * transport delegating to the command service.
 */
class ProductionBackfillControllerUnitTest {

    private ProductionBackfillCommandService commandService;
    private ProductionBackfillController controller;

    @BeforeEach
    void setUp() {
        commandService = mock(ProductionBackfillCommandService.class);
        controller = new ProductionBackfillController(commandService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void login(String... roles) {
        var authorities = roles == null
                ? List.<org.springframework.security.core.GrantedAuthority>of()
                : java.util.Arrays.stream(roles)
                        .map(r -> (org.springframework.security.core.GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + r))
                        .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("operator", "pw", authorities));
    }

    @Test
    @DisplayName("ADMIN is authorized for DRY_RUN")
    void adminAuthorizedForDryRun() {
        login("ADMIN");
        when(commandService.handle(any())).thenReturn(BackfillJobResponse.builder().operation("DRY_RUN").build());
        assertDoesNotThrow(() -> controller.dryRun(BackfillJobRequest.builder().build()));
    }

    @Test
    @DisplayName("BACKFILL_OPERATOR is authorized for EXECUTE")
    void backfillOperatorAuthorizedForExecute() {
        login("BACKFILL_OPERATOR");
        when(commandService.handle(any())).thenReturn(BackfillJobResponse.builder().operation("EXECUTE").build());
        assertDoesNotThrow(() -> controller.execute(BackfillJobRequest.builder().build()));
    }

    @Test
    @DisplayName("Unauthorized role is rejected")
    void unauthorizedRoleRejected() {
        login("SALES_MANAGER");
        assertThrows(AccessDeniedException.class,
                () -> controller.dryRun(BackfillJobRequest.builder().build()));
        assertThrows(AccessDeniedException.class,
                () -> controller.execute(BackfillJobRequest.builder().build()));
        assertThrows(AccessDeniedException.class,
                () -> controller.rollback("job-1"));
    }

    @Test
    @DisplayName("Anonymous user is rejected")
    void anonymousRejected() {
        login(); // no authorities -> not ADMIN, not BACKFILL_OPERATOR
        assertThrows(AccessDeniedException.class,
                () -> controller.status("job-1"));
    }

    @Test
    @DisplayName("No authentication present is rejected")
    void noAuthenticationRejected() {
        SecurityContextHolder.clearContext();
        assertThrows(AccessDeniedException.class,
                () -> controller.dryRun(BackfillJobRequest.builder().build()));
    }

    @Test
    @DisplayName("Controller is a thin transport: delegates to command service without holding logic")
    void controllerDelegatesWithoutLogic() {
        login("ADMIN");
        BackfillJobResponse expected = BackfillJobResponse.builder().operation("DRY_RUN").build();
        when(commandService.handle(any())).thenReturn(expected);
        BackfillJobResponse actual = controller.dryRun(BackfillJobRequest.builder().build());
        assertSame(expected, actual);
        verify(commandService, times(1)).handle(any()); // thin transport: one delegation
    }

    @Test
    @DisplayName("Request DTO exposes no actor field (impersonation prevention)")
    void requestHasNoActorField() {
        var methods = java.util.Arrays.stream(BackfillJobRequest.class.getDeclaredMethods())
                .map(java.lang.reflect.Method::getName).toList();
        assertFalse(methods.contains("getActor"),
                "BackfillJobRequest must not expose an actor field; actor is server-derived");
    }
}
