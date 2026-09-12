package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.dto.backfill.BackfillJobRequest;
import in.zygertechnology.zygererp.dto.backfill.BackfillJobResponse;
import in.zygertechnology.zygererp.security.CurrentUserRoles;
import in.zygertechnology.zygererp.service.ProductionBackfillCommandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * P3.4 — Thin REST transport for the controlled production backfill operational control layer.
 *
 * <p>This controller is TRANSPORT-ONLY: it performs no authoritative backfill business logic
 * and delegates to the committed P3.3 engine via {@link ProductionBackfillCommandService}.
 * It is bound to the internal secured API tree ({@code anyRequest().authenticated()}),
 * never public/anonymous, never automatic (no scheduler, no startup trigger), and gated by
 * method-level authorization to {@code ADMIN} / {@code BACKFILL_OPERATOR}.
 *
 * <p>Actor identity is never accepted from the request body — see
 * {@link ProductionBackfillCommandService}. This class has no dependency on inventory,
 * stock, production-order, or job-card services.
 */
@RestController
@RequestMapping("/api/v1/production/backfill")
@RequiredArgsConstructor
public class ProductionBackfillController {

    private final ProductionBackfillCommandService commandService;

    private void requireRole() {
        if (!CurrentUserRoles.hasAnyRole("ADMIN", "BACKFILL_OPERATOR")) {
            throw new AccessDeniedException(
                    "Requires ADMIN or BACKFILL_OPERATOR role.");
        }
    }

    @PostMapping(value = "/dry-run", produces = MediaType.APPLICATION_JSON_VALUE)
    public BackfillJobResponse dryRun(@RequestBody BackfillJobRequest request) {
        requireRole();
        return commandService.handle(withOperation(request, ProductionBackfillCommandService.OP_DRY_RUN));
    }

    @PostMapping(value = "/execute", produces = MediaType.APPLICATION_JSON_VALUE)
    public BackfillJobResponse execute(@RequestBody BackfillJobRequest request) {
        requireRole();
        return commandService.handle(withOperation(request, ProductionBackfillCommandService.OP_EXECUTE));
    }

    @PostMapping(value = "/resume", produces = MediaType.APPLICATION_JSON_VALUE)
    public BackfillJobResponse resume(@RequestBody BackfillJobRequest request) {
        requireRole();
        return commandService.handle(withOperation(request, ProductionBackfillCommandService.OP_RESUME));
    }

    @PostMapping(value = "/{jobId}/rollback", produces = MediaType.APPLICATION_JSON_VALUE)
    public BackfillJobResponse rollback(@PathVariable String jobId) {
        requireRole();
        return commandService.handle(BackfillJobRequest.builder()
                .operation(ProductionBackfillCommandService.OP_ROLLBACK)
                .jobId(jobId)
                .confirmationToken(ProductionBackfillCommandService.CONFIRMATION)
                .build());
    }

    @GetMapping(value = "/{jobId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public BackfillJobResponse status(@PathVariable String jobId) {
        requireRole();
        return commandService.handle(BackfillJobRequest.builder()
                .operation(ProductionBackfillCommandService.OP_STATUS)
                .jobId(jobId)
                .build());
    }

    private BackfillJobRequest withOperation(BackfillJobRequest request, String operation) {
        return BackfillJobRequest.builder()
                .operation(operation)
                .jobId(request == null ? null : request.getJobId())
                .dryRun(request == null ? null : request.getDryRun())
                .confirmationToken(request == null ? null : request.getConfirmationToken())
                .correlationId(request == null ? null : request.getCorrelationId())
                .build();
    }
}
