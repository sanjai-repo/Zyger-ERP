package in.zygertechnology.zygererp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * P3.3 — Dedicated backfill execution flag — {@code production.backfill.enabled}.
 *
 * <p>Deliberately SEPARATE from {@code production.normalized-ops.enabled} (which gates the
 * ONLINE write-time projection). Backfill is a distinct, explicit, batched, back-dated
 * operation that must never be coupled to the online projection path (DOCUMENT_34 §16).
 *
 * <p>Default is <b>OFF</b>. The engine ({@code ProductionBackfillService}) is entirely
 * inert while this flag is off — no reads-triggering writes, no progress, no outcome, no
 * normalized event, no rollback. Live execution additionally requires explicit, authorized,
 * manual invocation; this flag alone never auto-runs anything.
 *
 * <p>This file only controls the dedicated backfill gate. It never changes the behavior of
 * {@code production.normalized-ops.enabled}.
 */
@Component
public class ProductionBackfillProperties {

    private final boolean enabled;

    public ProductionBackfillProperties(
            @Value("${production.backfill.enabled:false}") boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }
}