package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import in.zygertechnology.zygererp.security.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/rbac")
@RequirePermission(module = "MASTER", screen = "USER", action = "VIEW")
@RequiredArgsConstructor
public class RbacController {

    private final RoleRepository roles;
    private final PermissionRepository permissions;
    private final UserRepository users;

    // ---- Roles ----

    @GetMapping("/roles")
    public List<Map<String, Object>> listRoles() {
        return roles.findAll().stream().map(this::roleMap).toList();
    }

    @GetMapping("/roles/{id}")
    public Map<String, Object> getRole(@PathVariable Long id) {
        Role role = roles.findById(id).orElseThrow(() -> new IllegalArgumentException("Role not found"));
        return roleMap(role);
    }

    @PostMapping("/roles")
    @Transactional
    @RequirePermission(module = "MASTER", screen = "USER", action = "CREATE")
    public Role createRole(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Role name is required");
        if (roles.existsByName(name)) throw new IllegalArgumentException("Role '" + name + "' already exists");

        Role role = Role.builder()
            .name(name)
            .description((String) body.get("description"))
            .active(true)
            .createdAt(Instant.now())
            .build();

        // Assign permissions if provided
        if (body.containsKey("permissionIds") && body.get("permissionIds") instanceof List<?> ids) {
            Set<Permission> perms = new HashSet<>();
            for (Object id : ids) {
                permissions.findById(Long.valueOf(id.toString())).ifPresent(perms::add);
            }
            role.setPermissions(perms);
        }

        return roles.save(role);
    }

    @PutMapping("/roles/{id}")
    @Transactional
    @RequirePermission(module = "MASTER", screen = "USER", action = "EDIT")
    public Role updateRole(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Role role = roles.findById(id).orElseThrow(() -> new IllegalArgumentException("Role not found"));

        if (body.containsKey("name")) role.setName((String) body.get("name"));
        if (body.containsKey("description")) role.setDescription((String) body.get("description"));
        if (body.containsKey("active")) role.setActive(Boolean.TRUE.equals(body.get("active")));
        role.setUpdatedAt(Instant.now());

        // Update permissions if provided
        if (body.containsKey("permissionIds") && body.get("permissionIds") instanceof List<?> ids) {
            Set<Permission> perms = new HashSet<>();
            for (Object pid : ids) {
                permissions.findById(Long.valueOf(pid.toString())).ifPresent(perms::add);
            }
            role.setPermissions(perms);
        }

        return roles.save(role);
    }

    @DeleteMapping("/roles/{id}")
    @Transactional
    @RequirePermission(module = "MASTER", screen = "USER", action = "DELETE")
    public ResponseEntity<?> deleteRole(@PathVariable Long id) {
        Role role = roles.findById(id).orElseThrow(() -> new IllegalArgumentException("Role not found"));
        if ("ADMIN".equalsIgnoreCase(role.getName())) {
            throw new IllegalArgumentException("Cannot delete the ADMIN role");
        }
        // Check if any user has this role
        // (soft delete — set inactive)
        role.setActive(false);
        role.setUpdatedAt(Instant.now());
        roles.save(role);
        return ResponseEntity.ok(Map.of("message", "Role deactivated"));
    }

    // ---- Permissions ----

    @GetMapping("/permissions")
    public List<Permission> listPermissions(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String screen) {
        if (module != null && screen != null) return permissions.findByModuleAndScreen(module, screen);
        if (module != null) return permissions.findByModule(module);
        return permissions.findAll();
    }

    @GetMapping("/permissions/tree")
    public Map<String, Map<String, List<String>>> permissionTree() {
        List<Permission> all = permissions.findAll();
        Map<String, Map<String, List<String>>> tree = new LinkedHashMap<>();
        for (Permission p : all) {
            tree.computeIfAbsent(p.getModule(), k -> new LinkedHashMap<>())
                .computeIfAbsent(p.getScreen(), k -> new ArrayList<>())
                .add(p.getAction());
        }
        return tree;
    }

    // ---- User-Role Assignment ----

    @GetMapping("/users/{userId}/roles")
    public List<Map<String, Object>> getUserRoles(@PathVariable Long userId) {
        AppUser user = users.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        return user.getRoles().stream().map(r -> Map.<String, Object>of(
            "id", r.getId(), "name", r.getName(), "description", r.getDescription()
        )).toList();
    }

    @PutMapping("/users/{userId}/roles")
    @Transactional
    @RequirePermission(module = "MASTER", screen = "USER", action = "EDIT")
    public ResponseEntity<?> assignUserRoles(@PathVariable Long userId, @RequestBody Map<String, Object> body) {
        AppUser user = users.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (body.containsKey("roleIds") && body.get("roleIds") instanceof List<?> ids) {
            Set<Role> userRoles = new HashSet<>();
            for (Object rid : ids) {
                roles.findById(Long.valueOf(rid.toString())).ifPresent(userRoles::add);
            }
            user.setRoles(userRoles);

            // Sync legacy role string from first assigned role
            if (!userRoles.isEmpty()) {
                user.setRole(userRoles.iterator().next().getName());
            }
        }

        users.save(user);
        return ResponseEntity.ok(Map.of("message", "Roles assigned"));
    }

    private Map<String, Object> roleMap(Role role) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", role.getId());
        m.put("name", role.getName());
        m.put("description", role.getDescription());
        m.put("active", role.isActive());
        m.put("permissionCount", role.getPermissions().size());

        // Group permissions by module → screen
        Map<String, Map<String, List<String>>> permTree = new LinkedHashMap<>();
        for (Permission p : role.getPermissions()) {
            permTree.computeIfAbsent(p.getModule(), k -> new LinkedHashMap<>())
                .computeIfAbsent(p.getScreen(), k -> new ArrayList<>())
                .add(p.getAction());
        }
        m.put("permissions", permTree);
        return m;
    }
}
