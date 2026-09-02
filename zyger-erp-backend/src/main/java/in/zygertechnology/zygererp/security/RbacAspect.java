package in.zygertechnology.zygererp.security;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Aspect
@Component
public class RbacAspect {

    @Before("@annotation(in.zygertechnology.zygererp.security.RequirePermission) || @within(in.zygertechnology.zygererp.security.RequirePermission)")
    public void checkPermission(JoinPoint joinPoint) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new AccessDeniedException("Authentication is required to access this resource");
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequirePermission targetPerm = method.getAnnotation(RequirePermission.class);
        if (targetPerm == null) {
            targetPerm = joinPoint.getTarget().getClass().getAnnotation(RequirePermission.class);
        }

        if (targetPerm == null) return;
        final RequirePermission perm = targetPerm;

        String username = auth.getName();
        String module = perm.module();
        String screen = perm.screen();
        String action = perm.action();

        // ADMIN bypass via Spring authority
        boolean isAdmin = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equalsIgnoreCase("ROLE_ADMIN") || a.equalsIgnoreCase("ADMIN"));
        if (isAdmin) return;

        // Check PERM_ authorities loaded by JwtAuthFilter
        boolean hasPermission = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("PERM_"))
                .map(a -> a.substring(5)) // strip "PERM_" prefix
                .anyMatch(code -> {
                    String[] parts = code.split(":");
                    if (parts.length != 3) return false;
                    boolean moduleMatch = "*".equals(module) || "*".equals(parts[0]) || parts[0].equalsIgnoreCase(module);
                    boolean screenMatch = "*".equals(screen) || "*".equals(parts[1]) || parts[1].equalsIgnoreCase(screen);
                    boolean actionMatch = "*".equals(action) || "*".equals(parts[2]) || parts[2].equalsIgnoreCase(action);
                    return moduleMatch && screenMatch && actionMatch;
                });

        if (!hasPermission) {
            throw new AccessDeniedException(
                "Access denied: user '" + username + "' lacks permission '" +
                module + ":" + screen + ":" + action + "'"
            );
        }
    }
}
