package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.entity.Screen;
import in.zygertechnology.zygererp.entity.UserScreenPermission;
import in.zygertechnology.zygererp.repo.RoleRepository;
import in.zygertechnology.zygererp.repo.ScreenRepository;
import in.zygertechnology.zygererp.repo.UserRepository;
import in.zygertechnology.zygererp.repo.UserScreenPermissionRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class UserApprovalService {

    private final UserRepository users;
    private final RoleRepository roles;
    private final ScreenRepository screens;
    private final UserScreenPermissionRepository userPermissions;
    private final AuditLogService auditLogs;
    private final EmailService emailService;
    private final ScreenSeedService screenSeedService;
    private final RbacService rbacService;

    public record StatusCounts(long total, long active, long pending, long rejected, long suspended, long disabled) {}

    @Transactional(readOnly = true)
    public StatusCounts counts() {
        long total = 0, active = 0, pending = 0, rejected = 0, suspended = 0, disabled = 0;
        for (AppUser u : users.findAll()) {
            if (in.zygertechnology.zygererp.config.HiddenAdminSeeder.USERNAME.equalsIgnoreCase(u.getUsername())) continue;
            total++;
            String s = u.getStatus() == null ? "ACTIVE" : u.getStatus().toUpperCase();
            switch (s) {
                case "ACTIVE" -> active++;
                case "PENDING" -> pending++;
                case "REJECTED" -> rejected++;
                case "SUSPENDED" -> suspended++;
                default -> disabled++;
            }
        }
        return new StatusCounts(total, active, pending, rejected, suspended, disabled);
    }

    @Transactional(readOnly = true)
    public List<AppUser> list() {
        return users.findAll().stream()
                .filter(u -> !in.zygertechnology.zygererp.config.HiddenAdminSeeder.USERNAME.equalsIgnoreCase(u.getUsername()))
                .toList();
    }

    @Transactional(readOnly = true)
    public AppUser get(Long id) {
        return users.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public Map<String,Object> approve(Long userId, String approvedRole, HttpServletRequest request) {
        AppUser u = users.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        ensureNotHiddenAdmin(u);
        String role = approvedRole != null && !approvedRole.isBlank() ? approvedRole : u.getRole();
        String prevStatus = u.getStatus();
        u.setStatus("ACTIVE");
        u.setActive(true);
        u.setApprovedRole(role);
        u.setRole(role);
        u.setApprovedAt(Instant.now());
        // approvedBy set by AuditLogService actor resolution via Request scope
        users.save(u);

        Map<String,Object> meta = new LinkedHashMap<>();
        meta.put("previousStatus", prevStatus);
        meta.put("newStatus", "ACTIVE");
        meta.put("role", role);
        auditLogs.record("USER_APPROVED", u.getId(), meta, request);

        if (u.getEmail() != null && !u.getEmail().isBlank()) {
            emailService.sendUserStatusNotification(u.getEmail(), u.getFullName(), "ACTIVE", null, role);
        }

        Map<String,Object> out = new LinkedHashMap<>();
        out.put("id", u.getId());
        out.put("status", "ACTIVE");
        out.put("role", role);
        return out;
    }

    @Transactional
    public Map<String,Object> reject(Long userId, String reason, HttpServletRequest request) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("A rejection reason is required");
        }
        AppUser u = users.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        ensureNotHiddenAdmin(u);
        String prevStatus = u.getStatus();
        u.setStatus("REJECTED");
        u.setActive(false);
        u.setRejectionReason(reason);
        users.save(u);

        Map<String,Object> meta = new LinkedHashMap<>();
        meta.put("previousStatus", prevStatus);
        meta.put("newStatus", "REJECTED");
        meta.put("reason", reason);
        auditLogs.record("USER_REJECTED", u.getId(), meta, request);

        if (u.getEmail() != null && !u.getEmail().isBlank()) {
            emailService.sendUserStatusNotification(u.getEmail(), u.getFullName(), "REJECTED", reason, null);
        }

        Map<String,Object> out = new LinkedHashMap<>();
        out.put("id", u.getId());
        out.put("status", "REJECTED");
        return out;
    }

    @Transactional
    public Map<String,Object> setSuspended(Long userId, boolean suspended, HttpServletRequest request) {
        AppUser u = users.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        ensureNotHiddenAdmin(u);
        String prevStatus = u.getStatus();
        String newStatus = suspended ? "SUSPENDED" : "ACTIVE";
        u.setStatus(newStatus);
        u.setActive(!suspended);
        users.save(u);

        Map<String,Object> meta = new LinkedHashMap<>();
        meta.put("previousStatus", prevStatus);
        meta.put("newStatus", newStatus);
        auditLogs.record(suspended ? "USER_SUSPENDED" : "USER_RESTORED", u.getId(), meta, request);

        if (u.getEmail() != null && !u.getEmail().isBlank()) {
            emailService.sendUserStatusNotification(u.getEmail(), u.getFullName(), newStatus, null, u.getRole());
        }
        return Map.of("id", u.getId(), "status", newStatus);
    }

    // ─── Screen catalog ─────────────────────────────────────────────

    @Transactional
    public List<Screen> screens() {
        seedScreens();
        return screens.findByActiveTrueOrderBySortOrderAsc();
    }

    @Transactional
    public void seedScreens() {
        screenSeedService.seed();
    }

    public List<in.zygertechnology.zygererp.entity.Role> activeRoles() {
        return roles.findByActiveTrue();
    }

    // ─── Permission matrix ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String,Object>> matrix(Long userId) {
        users.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        List<Screen> screenList = screens();
        Map<Long, UserScreenPermission> perms = new HashMap<>();
        for (UserScreenPermission p : userPermissions.findByUserId(userId)) {
            perms.put(p.getScreenId(), p);
        }
        List<Map<String,Object>> rows = new ArrayList<>();
        for (Screen s : screenList) {
            UserScreenPermission p = perms.get(s.getId());
            Map<String,Object> row = new LinkedHashMap<>();
            row.put("screenId", s.getId());
            row.put("screenKey", s.getScreenKey());
            row.put("screenName", s.getScreenName());
            row.put("module", s.getModule());
            row.put("parentScreenId", s.getParentScreenId());
            row.put("canView", p != null && p.isCanView());
            row.put("canCreate", p != null && p.isCanCreate());
            row.put("canEdit", p != null && p.isCanEdit());
            row.put("canDelete", p != null && p.isCanDelete());
            row.put("canExport", p != null && p.isCanExport());
            rows.add(row);
        }
        return rows;
    }

    /**
     * Effective per-screen access for a user, used to drive UI visibility.
     * Strict allow-list: for normal users only {@code user_screen_permissions} grants count
     * (empty matrix = no access). ADMIN users bypass and see every screen fully granted.
     */
    @Transactional(readOnly = true)
    public List<Map<String,Object>> effectiveMatrix(Long userId) {
        AppUser u = users.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        List<Screen> screenList = screens();
        Map<Long, UserScreenPermission> perms = new HashMap<>();
        for (UserScreenPermission p : userPermissions.findByUserId(userId)) {
            perms.put(p.getScreenId(), p);
        }

        boolean isAdmin = "ADMIN".equalsIgnoreCase(u.getRole());
        if (!isAdmin && u.getRoles() != null) {
            isAdmin = u.getRoles().stream()
                    .anyMatch(r -> r.isActive() && "ADMIN".equalsIgnoreCase(r.getName()));
        }

        Set<String> userPermCodes = rbacService != null ? rbacService.getUserPermissionCodes(u.getUsername()) : Set.of();

        List<Map<String,Object>> rows = new ArrayList<>();
        for (Screen s : screenList) {
            UserScreenPermission p = perms.get(s.getId());
            Map<String,Object> row = new LinkedHashMap<>();
            row.put("screenKey", s.getScreenKey());
            row.put("screenName", s.getScreenName());
            row.put("module", s.getModule());
            if (isAdmin) {
                row.put("canView", true);
                row.put("canCreate", true);
                row.put("canEdit", true);
                row.put("canDelete", true);
                row.put("canExport", true);
            } else {
                String mod = s.getModule() != null ? s.getModule().toUpperCase() : "";
                String scrKey = s.getScreenKey() != null ? s.getScreenKey().toUpperCase() : "";

                boolean roleCanView = userPermCodes.contains(mod + ":" + scrKey + ":VIEW")
                        || userPermCodes.contains(mod + ":*:VIEW")
                        || userPermCodes.contains(mod + ":*:*")
                        || userPermCodes.contains("*:*:*");
                boolean roleCanCreate = userPermCodes.contains(mod + ":" + scrKey + ":CREATE")
                        || userPermCodes.contains(mod + ":*:CREATE")
                        || userPermCodes.contains(mod + ":*:*")
                        || userPermCodes.contains("*:*:*");
                boolean roleCanEdit = userPermCodes.contains(mod + ":" + scrKey + ":EDIT")
                        || userPermCodes.contains(mod + ":*:EDIT")
                        || userPermCodes.contains(mod + ":*:*")
                        || userPermCodes.contains("*:*:*");
                boolean roleCanDelete = userPermCodes.contains(mod + ":" + scrKey + ":DELETE")
                        || userPermCodes.contains(mod + ":*:DELETE")
                        || userPermCodes.contains(mod + ":*:*")
                        || userPermCodes.contains("*:*:*");
                boolean roleCanExport = userPermCodes.contains(mod + ":" + scrKey + ":EXPORT")
                        || userPermCodes.contains(mod + ":*:EXPORT")
                        || userPermCodes.contains(mod + ":*:*")
                        || userPermCodes.contains("*:*:*");

                row.put("canView", (p != null && p.isCanView()) || roleCanView);
                row.put("canCreate", (p != null && p.isCanCreate()) || roleCanCreate);
                row.put("canEdit", (p != null && p.isCanEdit()) || roleCanEdit);
                row.put("canDelete", (p != null && p.isCanDelete()) || roleCanDelete);
                row.put("canExport", (p != null && p.isCanExport()) || roleCanExport);
            }
            rows.add(row);
        }
        return rows;
    }

    @Transactional
    public Map<String,Object> saveMatrix(Long userId, List<Map<String,Object>> entries, HttpServletRequest request) {
        AppUser u = users.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Long actorId = resolveActorId();
        Instant now = Instant.now();

        Map<Long, UserScreenPermission> existing = new HashMap<>();
        for (UserScreenPermission p : userPermissions.findByUserId(userId)) {
            existing.put(p.getScreenId(), p);
        }

        for (Map<String,Object> e : entries) {
            Object sidObj = e.get("screenId");
            if (sidObj == null) continue;
            Long screenId = Long.valueOf(sidObj.toString());
            UserScreenPermission p = existing.get(screenId);
            boolean any = anyTrue(e);
            if (p == null) {
                if (!any) continue; // nothing to save for this screen
                p = UserScreenPermission.builder()
                        .userId(userId)
                        .screenId(screenId)
                        .grantedBy(actorId)
                        .grantedAt(now)
                        .build();
            }
            p.setCanView(boolOf(e, "canView"));
            p.setCanCreate(boolOf(e, "canCreate"));
            p.setCanEdit(boolOf(e, "canEdit"));
            p.setCanDelete(boolOf(e, "canDelete"));
            p.setCanExport(boolOf(e, "canExport"));
            p.setGrantedBy(actorId);
            p.setGrantedAt(now);
            userPermissions.save(p);
        }

        Map<String,Object> meta = new LinkedHashMap<>();
        meta.put("screens", entries.size());
        meta.put("targetUser", u.getUsername());
        auditLogs.record("PERMISSION_CHANGED", u.getId(), meta, request);

        return Map.of("message", "Access saved for " + u.getUsername());
    }

    private boolean anyTrue(Map<String,Object> e) {
        return boolOf(e, "canView") || boolOf(e, "canCreate") || boolOf(e, "canEdit")
                || boolOf(e, "canDelete") || boolOf(e, "canExport");
    }

    private boolean boolOf(Map<String,Object> e, String key) {
        Object v = e.get(key);
        return v != null && Boolean.parseBoolean(v.toString());
    }

    private void ensureNotHiddenAdmin(AppUser u) {
        if (in.zygertechnology.zygererp.config.HiddenAdminSeeder.USERNAME.equalsIgnoreCase(u.getUsername())) {
            throw new IllegalArgumentException("The system fallback administrator cannot be modified.");
        }
    }

    private Long resolveActorId() {
        String name = in.zygertechnology.zygererp.security.CurrentUserRoles.username();
        return users.findByUsername(name).map(AppUser::getId).orElse(null);
    }
}
