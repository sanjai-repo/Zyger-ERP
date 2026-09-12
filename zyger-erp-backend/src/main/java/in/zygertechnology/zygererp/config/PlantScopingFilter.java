package in.zygertechnology.zygererp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.sql.DataSource;
import java.io.IOException;
import java.sql.Connection;
import java.sql.Statement;

/**
 * FRS §3.4: Sets Postgres session variable app.current_plant_id per request
 * for Row-Level Security enforcement.
 */
@Component
public class PlantScopingFilter extends OncePerRequestFilter {

    private final DataSource dataSource;

    public PlantScopingFilter(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long plantId = resolvePlantId();
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {
            st.execute("SET app.current_plant_id = " + plantId);
        } catch (Exception ignored) {
        }
        chain.doFilter(request, response);
    }

    private long resolvePlantId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) return 1L;
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {
            var rs = st.executeQuery(
                    "SELECT plant_id FROM app_users WHERE username = '" + auth.getName() + "' LIMIT 1");
            if (rs.next()) return rs.getLong("plant_id");
        } catch (Exception ignored) {
        }
        return 1L;
    }
}
