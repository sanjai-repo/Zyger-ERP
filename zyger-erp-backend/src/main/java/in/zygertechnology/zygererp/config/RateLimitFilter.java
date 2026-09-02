package in.zygertechnology.zygererp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiter rateLimiter;

    public RateLimitFilter(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String clientIp = request.getRemoteAddr();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            clientIp = forwarded.split(",")[0].trim();
        }

        // Auth endpoints get stricter rate limiting (separate key with prefix)
        String path = request.getRequestURI();
        boolean isAuthEndpoint = path.startsWith("/api/auth/");
        String rateLimitKey = isAuthEndpoint ? "auth:" + clientIp : clientIp;

        if (!rateLimiter.isAllowed(rateLimitKey)) {
            long retryAfter = rateLimiter.retryAfterMs(rateLimitKey);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/problem+json");
            response.setHeader("Retry-After", String.valueOf(retryAfter / 1000));
            response.getWriter().write(
                    "{\"type\":\"/errors/rate-limit\",\"title\":\"Rate Limit Exceeded\"," +
                    "\"status\":429,\"detail\":\"Too many requests. Retry after " + (retryAfter / 1000) + " seconds.\"," +
                    "\"instance\":\"" + request.getRequestURI() + "\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals("/api/health") || path.equals("/actuator/health");
    }
}
