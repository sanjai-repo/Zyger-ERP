package in.zygertechnology.zygererp.dto.backfill;

import lombok.Builder;
import lombok.Getter;

/**
 * P3.4 — Request/command contract for the controlled backfill operational control layer.
 *
 * <p>Thin transport DTO — carries NO authoritative backfill business logic and NO actor
 * identity. The actor is always derived server-side from the authenticated principal and
 * must never be supplied in the request body (impersonation prevention).
 */
@Getter
@Builder
public final class BackfillJobRequest {

    /** Operation: DRY_RUN | EXECUTE | RESUME | ROLLBACK | STATUS. */
    private final String operation;

    /** UUID identifying the backfill job (server-generated if absent for DRY_RUN). */
    private final String jobId;

    /** Dry-run flag (default true). EXECUTE/RESUME must carry false + confirmationToken. */
    private final Boolean dryRun;

    /** Explicit operator acknowledgement captured from a prior DRY_RUN result. Not a secret. */
    private final String confirmationToken;

    /** Caller-supplied idempotency key for the request itself. */
    private final String correlationId;
}
