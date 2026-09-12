package in.zygertechnology.zygererp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * P3 feature flag — {@code production.normalized-ops.enabled}.
 *
 * <p>OFF (default): normalized operation events are NOT emitted; the system is
 * byte-identical to today (legacy write + posting only). ON: while the legacy
 * {@code production_entry} write remains authoritative (P3-01), normalized
 * events are derived in the same transaction as an additive projection.
 *
 * <p>The flag only gates the emission of A-derived-projection. It never
 * switches which writer is authoritative and never changes inventory behavior
 * (P3-07). Read per-request; mixed-version rolling deployment is safe because
 * event rows are additive and legacy posting authority holds in every version.
 */
@Component
public class ProductionNormalizedOpsProperties {

    private final boolean enabled;

    public ProductionNormalizedOpsProperties(
            @Value("${production.normalized-ops.enabled:false}") boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }
}