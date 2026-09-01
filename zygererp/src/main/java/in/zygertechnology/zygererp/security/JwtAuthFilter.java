package in.zygertechnology.zygererp.security;

import in.zygertechnology.zygererp.service.RbacService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwt;
    private final RbacService rbacService;

    public JwtAuthFilter(JwtService jwt, RbacService rbacService) {
        this.jwt = jwt;
        this.rbacService = rbacService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwt.isValid(token) && !jwt.isDenied(token)
                    && SecurityContextHolder.getContext().getAuthentication() == null) {
                String username = jwt.username(token);
                String role = jwt.role(token);

                List<SimpleGrantedAuthority> authorities = new ArrayList<>();

                // Add legacy role authority
                if (role != null && !role.isBlank()) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
                }

                // Load RBAC permissions from database
                Set<String> permissionCodes = rbacService.getUserPermissionsWithWildcards(username);
                for (String code : permissionCodes) {
                    authorities.add(new SimpleGrantedAuthority("PERM_" + code));
                }

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(username, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        chain.doFilter(request, response);
    }
}
