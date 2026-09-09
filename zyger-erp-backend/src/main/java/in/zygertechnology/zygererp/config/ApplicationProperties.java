package in.zygertechnology.zygererp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Stock Allotment & Adjustment Modules FRS v1.0 §5/§6 — configurable auto-approval
 * thresholds and physical-stock variance tolerance.
 *
 * <p>When a Stock Amendment's |difference| (absolute qty) meets
 * {@code adjustment-threshold-qty}, or its absolute difference value meets
 * {@code adjustment-threshold-value}, the amendment is automatically routed to
 * SUBMITTED for approval instead of posting directly.  Similarly, a Physical Stock
 * Amendment line whose variance % meets {@code physical-variance-tolerance-pct} is
 * routed for approval.
 */
@Component
@ConfigurationProperties(prefix = "adjustment")
public class ApplicationProperties {

    private double thresholdQty = 100;
    private double thresholdValue = 50000;
    private double varianceTolerancePct = 2.0;

    public double getAdjustmentThresholdQty() { return thresholdQty; }
    public void setThresholdQty(double thresholdQty) { this.thresholdQty = thresholdQty; }

    public double getAdjustmentThresholdValue() { return thresholdValue; }
    public void setThresholdValue(double thresholdValue) { this.thresholdValue = thresholdValue; }

    public double getPhysicalVarianceTolerancePct() { return varianceTolerancePct; }
    public void setVarianceTolerancePct(double varianceTolerancePct) { this.varianceTolerancePct = varianceTolerancePct; }
}
