package in.zygertechnology.zygererp.config;

import in.zygertechnology.zygererp.entity.MasterAuditLog;
import in.zygertechnology.zygererp.repo.MasterAuditLogRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.*;

@Component
public class AuditLogCollector {

    private static final ThreadLocal<List<MasterAuditLog>> PENDING = ThreadLocal.withInitial(ArrayList::new);
    private static MasterAuditLogRepository REPO;

    public AuditLogCollector(MasterAuditLogRepository repo) {
        REPO = repo;
    }

    public static void collect(String entityType, Long entityId, String action,
                               Map<String, String> changes, Map<String, Object> oldSnapshot) {
        String user = currentUser();

        if ("UPDATE".equals(action) && oldSnapshot != null) {
            for (Map.Entry<String, String> e : changes.entrySet()) {
                String fieldName = e.getKey();
                String newVal = e.getValue();
                String oldVal = oldSnapshot.containsKey(fieldName)
                        ? String.valueOf(oldSnapshot.get(fieldName)) : null;
                if (newVal != null && newVal.equals(oldVal)) continue;

                PENDING.get().add(MasterAuditLog.builder()
                        .entityType(entityType).entityId(entityId)
                        .action(action).fieldName(fieldName)
                        .oldValue(oldVal).newValue(newVal)
                        .changedBy(user).changedAt(Instant.now())
                        .build());
            }
        } else {
            String detail = changes.isEmpty() ? "" : String.valueOf(changes);
            PENDING.get().add(MasterAuditLog.builder()
                    .entityType(entityType).entityId(entityId)
                    .action(action).fieldName("_detail")
                    .oldValue(null).newValue(detail)
                    .changedBy(user).changedAt(Instant.now())
                    .build());
        }
    }

    @Transactional
    public void flush() {
        List<MasterAuditLog> pending = PENDING.get();
        if (pending != null && !pending.isEmpty()) {
            REPO.saveAll(pending);
            pending.clear();
        }
        PENDING.remove();
    }

    private static String currentUser() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String auth = req.getHeader("Authorization");
                if (auth != null && auth.startsWith("Bearer ")) {
                    return extractUsernameFromToken(auth.substring(7));
                }
            }
        } catch (Exception ignored) {}
        return "system";
    }

    private static String extractUsernameFromToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return "unknown";
            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
            int subIdx = payload.indexOf("\"sub\"");
            if (subIdx < 0) return "unknown";
            int colonIdx = payload.indexOf(':', subIdx);
            int quoteStart = payload.indexOf('"', colonIdx + 1);
            int quoteEnd = payload.indexOf('"', quoteStart + 1);
            return payload.substring(quoteStart + 1, quoteEnd);
        } catch (Exception e) {
            return "unknown";
        }
    }
}
