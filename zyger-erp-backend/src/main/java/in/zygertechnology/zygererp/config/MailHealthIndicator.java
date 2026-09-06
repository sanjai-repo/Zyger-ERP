package in.zygertechnology.zygererp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

/**
 * Health model for the optional SMTP transport.
 *
 * Mail dispatch is an optional capability in this application — {@code EmailService}
 * deliberately falls back to a log-only dry-run so the business workflow is never
 * blocked by mail configuration. Therefore an unconfigured SMTP must not degrade the
 * aggregate service health.
 *
 * The indicator follows the actual dependency model:
 *  - SMTP not configured (no password/username)  -> UP with explanatory detail.
 *  - SMTP configured                              -> genuine connection check via
 *                                                     JavaMailSenderImpl.testConnection().
 */
@Component
public class MailHealthIndicator implements HealthIndicator {

    private static final String MAIL_SENDER = "mailSender";
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MailHealthIndicator.class);

    private final Object mailSender;
    private final String host;
    private final String username;
    private final String password;

    public MailHealthIndicator(
            java.util.Optional<org.springframework.mail.javamail.JavaMailSender> mailSender,
            @Value("${spring.mail.host:}") String host,
            @Value("${spring.mail.username:}") String username,
            @Value("${spring.mail.password:}") String password) {
        this.mailSender = mailSender.orElse(null);
        this.host = host == null ? "" : host;
        this.username = username == null ? "" : username;
        this.password = password == null ? "" : password;
    }

    @Override
    public Health health() {
        boolean configured = !password.isBlank() && !username.isBlank();
        if (!configured) {
            return Health.up()
                    .withDetail("configured", false)
                    .withDetail("note", "SMTP not configured - mail dispatch is optional (log/dry-run fallback)")
                    .build();
        }
        if (!(this.mailSender instanceof JavaMailSenderImpl sender)) {
            return Health.up()
                    .withDetail("configured", true)
                    .withDetail("note", "JavaMailSender unavailable; mail dispatch is optional")
                    .build();
        }
        try {
            sender.testConnection();
            return Health.up()
                    .withDetail("configured", true)
                    .withDetail("host", host)
                    .withDetail("username", username)
                    .build();
        } catch (Exception e) {
            log.warn("SMTP health check failed against {}: {}", host, rootMessage(e));
            return Health.down()
                    .withDetail("configured", true)
                    .withDetail("host", host)
                    .withDetail("error", rootMessage(e))
                    .build();
        }
    }

    private static String rootMessage(Throwable t) {
        Throwable root = t;
        while (root.getCause() != null && root.getCause() != root) root = root.getCause();
        return root.getMessage() == null ? t.toString() : root.getMessage();
    }
}