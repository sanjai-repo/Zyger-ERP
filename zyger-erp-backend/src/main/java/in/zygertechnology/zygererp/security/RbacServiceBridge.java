package in.zygertechnology.zygererp.security;

import in.zygertechnology.zygererp.service.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Bridge interface to break circular dependency between RbacAspect (security) and RbacService (service layer).
 */
@Component
@RequiredArgsConstructor
public class RbacServiceBridge {
    private final RbacService rbacService;

    public Set<String> getUserPermissionsWithWildcards(String username) {
        return rbacService.getUserPermissionsWithWildcards(username);
    }

    public boolean hasPermission(String username, String module, String screen, String action) {
        return rbacService.hasPermission(username, module, screen, action);
    }
}
