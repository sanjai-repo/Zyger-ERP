package in.zygertechnology.zygererp.config;

import java.util.Map;

public class BusinessRuleException extends RuntimeException {
    private final String ruleCode;
    private final Map<String, Object> details;

    public BusinessRuleException(String ruleCode, String message) {
        this(ruleCode, message, null);
    }

    public BusinessRuleException(String ruleCode, String message, Map<String, Object> details) {
        super(message);
        this.ruleCode = ruleCode;
        this.details = details;
    }

    public String getRuleCode() { return ruleCode; }
    public Map<String, Object> getDetails() { return details; }
}
