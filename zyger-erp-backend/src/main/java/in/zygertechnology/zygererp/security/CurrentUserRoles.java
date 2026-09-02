package in.zygertechnology.zygererp.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUserRoles {

    private CurrentUserRoles() {}

    public static boolean hasAnyRole(String... roles) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        for (String role : roles) {
            String wanted = "ROLE_" + role.toUpperCase().replaceFirst("^ROLE_", "");
            for (GrantedAuthority a : auth.getAuthorities()) {
                if (wanted.equalsIgnoreCase(a.getAuthority())) return true;
            }
        }
        return false;
    }

    public static String username() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "system";
    }
}
