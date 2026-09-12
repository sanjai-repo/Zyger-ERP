package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.AuditLog;
import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.repo.AuditLogRepository;
import in.zygertechnology.zygererp.repo.UserRepository;
import in.zygertechnology.zygererp.security.CurrentUserRoles;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogs;
    private final UserRepository users;

    /**
     * Records an immutable audit entry for a user-management action.
     */
    @Transactional
    public void record(String action, Long targetUserId, Map<String,Object> metadata, HttpServletRequest request) {
        String actorName = CurrentUserRoles.username();
        Long actorId = users.findByUsername(actorName).map(AppUser::getId).orElse(null);
        String ip = request == null ? null : request.getRemoteAddr();
        auditLogs.save(AuditLog.builder()
                .actorUserId(actorId)
                .action(action)
                .targetUserId(targetUserId)
                .metadata(metadata == null ? null : metadata.toString())
                .ipAddress(ip)
                .createdAt(Instant.now())
                .build());
    }

    @Transactional(readOnly = true)
    public List<AuditLog> list(Long targetUserId, String actionFilter) {
        if (targetUserId != null) return auditLogs.findByTargetUserIdOrderByCreatedAtDesc(targetUserId);
        if (actionFilter != null && !actionFilter.isBlank()) {
            return auditLogs.findByActionContainingIgnoreCaseOrderByCreatedAtDesc(actionFilter);
        }
        return auditLogs.findTop200ByOrderByCreatedAtDesc();
    }
}
