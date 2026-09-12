package in.zygertechnology.zygererp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class AuditFlushFilter extends OncePerRequestFilter {

    private final AuditLogCollector collector;

    public AuditFlushFilter(AuditLogCollector collector) {
        this.collector = collector;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            filterChain.doFilter(request, response);
        } finally {
            try {
                collector.flush();
            } catch (Exception e) {
                log().error("Failed to flush audit log", e);
            }
        }
    }

    private org.slf4j.Logger log() {
        return org.slf4j.LoggerFactory.getLogger(AuditFlushFilter.class);
    }
}
