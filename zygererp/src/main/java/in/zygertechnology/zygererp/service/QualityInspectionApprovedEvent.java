package in.zygertechnology.zygererp.service;

/**
 * In-app domain event published when a quality inspection reaches APPROVED.
 * Carries an idempotency key so downstream stock sync can be applied at most once.
 */
public class QualityInspectionApprovedEvent {

    private final Long inspectionId;
    private final String action;          // RELEASE (accept) or DISPOSE (reject/fail path)
    private final String idempotencyKey;  // inspection docNo + action
    private final String user;

    public QualityInspectionApprovedEvent(Long inspectionId, String action,
                                          String idempotencyKey, String user) {
        this.inspectionId = inspectionId;
        this.action = action;
        this.idempotencyKey = idempotencyKey;
        this.user = user;
    }

    public Long getInspectionId() {
        return inspectionId;
    }

    public String getAction() {
        return action;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getUser() {
        return user;
    }
}
