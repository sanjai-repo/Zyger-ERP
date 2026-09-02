package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.entity.AuditLog;
import in.zygertechnology.zygererp.entity.Role;
import in.zygertechnology.zygererp.security.RequirePermission;
import in.zygertechnology.zygererp.service.AuditLogService;
import in.zygertechnology.zygererp.service.UserApprovalService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@RequirePermission(module = "ADMIN", screen = "*", action = "*")
public class AdminController {

    private final UserApprovalService userService;
    private final AuditLogService auditLogs;

    // ─── User Directory ─────────────────────────────────────────────

    @GetMapping("/users")
    public Map<String,Object> users(@RequestParam(required = false) String status,
                                    @RequestParam(required = false) String search) {
        List<AppUser> all = userService.list();
        String st = status == null ? null : status.trim().toUpperCase();
        String q = search == null ? null : search.trim().toLowerCase();
        List<Map<String,Object>> rows = new ArrayList<>();
        for (AppUser u : all) {
            if (in.zygertechnology.zygererp.config.HiddenAdminSeeder.USERNAME.equalsIgnoreCase(u.getUsername())) continue;
            if (st != null && !st.isBlank() && !st.equals("ALL")) {
                String cur = u.getStatus() == null ? "ACTIVE" : u.getStatus().toUpperCase();
                if (!cur.equals(st)) continue;
            }
            if (q != null && !q.isBlank()) {
                boolean match = (u.getUsername() != null && u.getUsername().toLowerCase().contains(q))
                        || (u.getFullName() != null && u.getFullName().toLowerCase().contains(q))
                        || (u.getEmail() != null && u.getEmail().toLowerCase().contains(q));
                if (!match) continue;
            }
            rows.add(toMap(u));
        }
        UserApprovalService.StatusCounts c = userService.counts();
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("users", rows);
        Map<String,Object> counts = new LinkedHashMap<>();
        counts.put("total", c.total());
        counts.put("active", c.active());
        counts.put("pending", c.pending());
        counts.put("rejected", c.rejected());
        counts.put("suspended", c.suspended());
        counts.put("disabled", c.disabled());
        out.put("counts", counts);
        return out;
    }

    @GetMapping("/users/{id}")
    public Map<String,Object> user(@PathVariable Long id) {
        return toMap(userService.get(id));
    }

    @PostMapping("/users/{id}/approve")
    public Map<String,Object> approve(@PathVariable Long id,
                                      @RequestBody(required = false) Map<String,Object> body,
                                      HttpServletRequest request) {
        String role = body == null ? null : (String) body.get("role");
        return userService.approve(id, role, request);
    }

    @PostMapping("/users/{id}/reject")
    public Map<String,Object> reject(@PathVariable Long id,
                                     @RequestBody(required = false) Map<String,Object> body,
                                     HttpServletRequest request) {
        String reason = body == null ? null : (String) body.get("reason");
        return userService.reject(id, reason, request);
    }

    @PostMapping("/users/{id}/suspend")
    public Map<String,Object> suspend(@PathVariable Long id, HttpServletRequest request) {
        return userService.setSuspended(id, true, request);
    }

    @PostMapping("/users/{id}/restore")
    public Map<String,Object> restore(@PathVariable Long id, HttpServletRequest request) {
        return userService.setSuspended(id, false, request);
    }

    // ─── Control Panel catalogue ────────────────────────────────────

    @GetMapping("/screens")
    public List<Map<String,Object>> screens() {
        List<Map<String,Object>> rows = new ArrayList<>();
        for (var s : userService.screens()) {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("screenId", s.getId());
            m.put("screenKey", s.getScreenKey());
            m.put("screenName", s.getScreenName());
            m.put("module", s.getModule());
            m.put("parentScreenId", s.getParentScreenId());
            m.put("sortOrder", s.getSortOrder());
            rows.add(m);
        }
        return rows;
    }

    @GetMapping("/roles")
    public List<Map<String,Object>> roles() {
        List<Map<String,Object>> rows = new ArrayList<>();
        for (Role r : userService.activeRoles()) {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("name", r.getName());
            m.put("description", r.getDescription());
            rows.add(m);
        }
        return rows;
    }

    // ─── Permission matrix ──────────────────────────────────────────

    @GetMapping("/users/{id}/permissions")
    public List<Map<String,Object>> permissions(@PathVariable Long id) {
        return userService.matrix(id);
    }

    @PutMapping("/users/{id}/permissions")
    public Map<String,Object> savePermissions(@PathVariable Long id,
                                              @RequestBody List<Map<String,Object>> entries,
                                              HttpServletRequest request) {
        return userService.saveMatrix(id, entries, request);
    }

    // ─── Audit trail ────────────────────────────────────────────────

    @GetMapping("/audit-logs")
    public List<Map<String,Object>> auditLogs(@RequestParam(required = false) Long userId,
                                              @RequestParam(required = false) String action) {
        List<Map<String,Object>> rows = new ArrayList<>();
        for (AuditLog a : auditLogs.list(userId, action)) {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("actorUserId", a.getActorUserId());
            m.put("action", a.getAction());
            m.put("targetUserId", a.getTargetUserId());
            m.put("metadata", a.getMetadata());
            m.put("ipAddress", a.getIpAddress());
            m.put("createdAt", a.getCreatedAt());
            rows.add(m);
        }
        return rows;
    }

    private Map<String,Object> toMap(AppUser u) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("fullName", u.getFullName());
        m.put("email", u.getEmail());
        m.put("phone", u.getPhone());
        m.put("department", u.getDepartment());
        m.put("designation", u.getDesignation());
        m.put("role", u.getRole());
        m.put("requestedRole", u.getRequestedRole());
        m.put("approvedRole", u.getApprovedRole());
        m.put("status", u.getStatus() == null ? "ACTIVE" : u.getStatus().toUpperCase());
        m.put("active", u.isActive());
        m.put("rejectionReason", u.getRejectionReason());
        m.put("approvedAt", u.getApprovedAt());
        m.put("approvedBy", u.getApprovedBy());
        m.put("lastLoginAt", u.getLastLoginAt());
        m.put("createdAt", u.getCreatedAt());
        return m;
    }
}
