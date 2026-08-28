package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.entity.Permission;
import in.zygertechnology.zygererp.entity.Role;
import in.zygertechnology.zygererp.entity.Screen;
import in.zygertechnology.zygererp.entity.UserScreenPermission;
import in.zygertechnology.zygererp.repo.UserRepository;
import in.zygertechnology.zygererp.repo.ScreenRepository;
import in.zygertechnology.zygererp.repo.UserScreenPermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class RbacService {

    private final UserRepository users;
    private final ScreenRepository screenRepo;
    private final UserScreenPermissionRepository userScreenPermRepo;

    /**
     * Returns all permission codes for a user, derived from their assigned roles.
     * Format: "MODULE:SCREEN:ACTION" (e.g., "MASTER:ITEM:CREATE")
     */
    @Transactional(readOnly = true)
    public Set<String> getUserPermissionCodes(String username) {
        AppUser user = users.findByUsername(username).orElse(null);
        if (user == null) return Set.of();

        Set<String> codes = roleDerivedCodes(user);
        codes.addAll(perUserOverrideCodes(user.getId()));
        return codes;
    }

    private Set<String> roleDerivedCodes(AppUser user) {
        Set<String> codes = new HashSet<>();
        if (user.getRoles() == null) return codes;
        for (Role role : user.getRoles()) {
            if (!role.isActive()) continue;
            if (role.getPermissions() != null) {
                for (Permission perm : role.getPermissions()) {
                    codes.add(perm.code());
                }
            }
        }
        return codes;
    }

    /**
     * Translates a user's per-screen access overrides (user_screen_permissions) into
     * role-compatible "MODULE:SCREEN:ACTION" codes. The overrides ADD to the role baseline
     * (least-privilege default: zero until a role or a per-user grant provides access).
     * On-screen flags map to wildcard screen "*" to align with controller-level
     * {@code @RequirePermission} checks that use module-level screen wildcards.
     */
    private Set<String> perUserOverrideCodes(Long userId) {
        if (userId == null || screenRepo == null || userScreenPermRepo == null) return Set.of();
        Set<String> codes = new HashSet<>();
        List<UserScreenPermission> overrides = userScreenPermRepo.findByUserId(userId);
        Map<Long, Screen> screens = new HashMap<>();
        for (Screen s : screenRepo.findAll()) screens.put(s.getId(), s);
        for (UserScreenPermission p : overrides) {
            Screen s = screens.get(p.getScreenId());
            if (s == null || s.getModule() == null || s.getModule().isBlank() || !s.isActive()) continue;
            String mod = s.getModule().toUpperCase();
            if (p.isCanView()) codes.add(mod + ":*:VIEW");
            if (p.isCanCreate()) codes.add(mod + ":*:CREATE");
            if (p.isCanEdit()) codes.add(mod + ":*:EDIT");
            if (p.isCanDelete()) codes.add(mod + ":*:DELETE");
            if (p.isCanExport()) codes.add(mod + ":*:EXPORT");
        }
        return codes;
    }

    /**
     * Returns all permission codes for a user, including wildcards.
     * A permission like "MASTER:*:*" grants all master actions.
     */
    @Transactional(readOnly = true)
    public Set<String> getUserPermissionsWithWildcards(String username) {
        Set<String> codes = getUserPermissionCodes(username);
        Set<String> expanded = new HashSet<>(codes);

        for (String code : codes) {
            String[] parts = code.split(":");
            if (parts.length == 3) {
                String module = parts[0];
                String screen = parts[1];
                String action = parts[2];

                // Module wildcard: MASTER:*:* covers all screens/actions in MASTER
                if (!"*".equals(module)) {
                    expanded.add(module + ":*:*");
                    expanded.add(module + ":" + screen + ":*");
                }
            }
        }
        return expanded;
    }

    /**
     * Checks if a user has a specific permission (roles + per-user overrides).
     */
    @Transactional(readOnly = true)
    public boolean hasPermission(String username, String module, String screen, String action) {
        AppUser user = users.findByUsername(username).orElse(null);
        if (user == null) return false;

        // Admin bypass
        if (hasAdminRole(user)) return true;

        Set<String> codes = getUserPermissionCodes(username);
        for (String code : codes) {
            if (matches(code, module, screen, action)) return true;
        }
        return false;
    }

    private boolean hasAdminRole(AppUser user) {
        if ("ADMIN".equalsIgnoreCase(user.getRole())) return true;
        return user.getRoles().stream()
            .anyMatch(r -> r.isActive() && "ADMIN".equalsIgnoreCase(r.getName()));
    }

    private boolean matches(String code, String module, String screen, String action) {
        String[] parts = code.split(":");
        if (parts.length != 3) return false;
        boolean moduleMatch = "*".equals(module) || "*".equals(parts[0]) || parts[0].equalsIgnoreCase(module);
        boolean screenMatch = "*".equals(screen) || "*".equals(parts[1]) || parts[1].equalsIgnoreCase(screen);
        boolean actionMatch = "*".equals(action) || "*".equals(parts[2]) || parts[2].equalsIgnoreCase(action);
        return moduleMatch && screenMatch && actionMatch;
    }
}
