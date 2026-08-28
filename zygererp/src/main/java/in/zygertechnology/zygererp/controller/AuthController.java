package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.entity.LoginAuditLog;
import in.zygertechnology.zygererp.entity.RefreshToken;
import in.zygertechnology.zygererp.repo.UserRepository;
import in.zygertechnology.zygererp.repo.LoginAuditLogRepository;
import in.zygertechnology.zygererp.repo.RefreshTokenRepository;
import in.zygertechnology.zygererp.security.CurrentUserRoles;
import in.zygertechnology.zygererp.security.JwtService;
import in.zygertechnology.zygererp.service.UserApprovalService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private static final long ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000L;
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository users;
    private final PasswordEncoder enc;
    private final JwtService jwt;
    private final LoginAuditLogRepository auditLogs;
    private final RefreshTokenRepository refreshTokens;
    private final UserApprovalService userApprovalService;

    @Value("${app.security.password-min-length:8}")
    private int passwordMinLength;

    @Value("${app.security.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${app.security.lockout-minutes:15}")
    private int lockoutMinutes;

    private final ConcurrentHashMap<String, LoginAttempt> attempts = new ConcurrentHashMap<>();

    @PostMapping("/login")
    public Map<String,Object> login(@RequestBody Map<String,String> body, HttpServletRequest request) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Username and password are required");
        }

        LoginAttempt attempt = attempts.getOrDefault(username, new LoginAttempt());
        if (attempt.lockedUntil > System.currentTimeMillis()) {
            logAudit(username, "LOCKED_OUT", request);
            throw new IllegalArgumentException("Account temporarily locked. Try again later.");
        }

        AppUser u = users.findByUsername(username)
                .orElseThrow(() -> {
                    recordFailedAttempt(username);
                    logAudit(username, "FAILED", request);
                    return new IllegalArgumentException("Invalid credentials");
                });

        String status = u.getStatus() == null ? "ACTIVE" : u.getStatus().toUpperCase();
        if (!"ACTIVE".equals(status)) {
            logAudit(username, status.equals("PENDING") ? "PENDING" : "DISABLED", request);
            String msg = switch (status) {
                case "PENDING" -> "Account is awaiting admin approval.";
                case "REJECTED" -> "Account was rejected. Contact the administrator.";
                case "SUSPENDED" -> "Account is suspended. Contact the administrator.";
                default -> "Account is disabled.";
            };
            throw new IllegalArgumentException(msg);
        }

        if (!u.isActive()) {
            logAudit(username, "DISABLED", request);
            throw new IllegalArgumentException("Account is disabled");
        }

        if (!enc.matches(password, u.getPassword())) {
            recordFailedAttempt(username);
            logAudit(username, "FAILED", request);
            throw new IllegalArgumentException("Invalid credentials");
        }

        attempts.remove(username);
        logAudit(username, "SUCCESS", request);
        u.setLastLoginAt(Instant.now());
        users.save(u);

        String role = u.getRole() == null ? "USER" : u.getRole();
        String accessToken = jwt.generate(u.getUsername(), role, ACCESS_TOKEN_TTL_MS);
        String refreshToken = issueRefreshToken(u.getId());

        Map<String,Object> response = new LinkedHashMap<>();
        response.put("accessToken", accessToken);
        response.put("refreshToken", refreshToken);
        response.put("token", accessToken);
        response.put("username", u.getUsername());
        response.put("role", role);
        return response;
    }

    @PostMapping("/refresh")
    public Map<String,Object> refresh(@RequestBody Map<String,String> body) {
        String raw = body.get("refreshToken");
        if (raw == null || raw.isBlank()) throw new IllegalArgumentException("Refresh token is required");

        RefreshToken rt = refreshTokens.findByToken(sha256(raw))
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (rt.getRevokedAt() != null) throw new IllegalArgumentException("Refresh token has been revoked");
        if (rt.getExpiresAt().isBefore(Instant.now())) throw new IllegalArgumentException("Refresh token has expired");

        AppUser u = users.findById(rt.getUserId())
                .filter(AppUser::isActive)
                .orElseThrow(() -> new IllegalArgumentException("User account is missing or disabled"));

        // FRS §9: Rotate refresh token — revoke old, issue new
        rt.setRevokedAt(Instant.now());
        refreshTokens.save(rt);

        String role = u.getRole() == null ? "USER" : u.getRole();
        String accessToken = jwt.generate(u.getUsername(), role, ACCESS_TOKEN_TTL_MS);
        String newRefreshToken = issueRefreshToken(u.getId());

        Map<String,Object> response = new LinkedHashMap<>();
        response.put("accessToken", accessToken);
        response.put("refreshToken", newRefreshToken);
        response.put("token", accessToken);
        response.put("username", u.getUsername());
        response.put("role", role);
        return response;
    }

    @PostMapping("/logout")
    public Map<String,Object> logout(@RequestBody Map<String,String> body) {
        String raw = body.get("refreshToken");
        if (raw != null && !raw.isBlank()) {
            refreshTokens.findByToken(sha256(raw)).ifPresent(rt -> {
                if (rt.getRevokedAt() == null) {
                    rt.setRevokedAt(Instant.now());
                    refreshTokens.save(rt);
                }
            });
        }
        return Map.of("message", "Logged out successfully");
    }

    /**
     * Self-service: returns the effective per-screen access matrix for the logged-in user.
     * Drives UI visibility (menu + action buttons). Strict allow-list for normal users;
     * ADMIN users get every screen fully granted.
     */
    @GetMapping("/screens")
    public List<Map<String,Object>> myScreens() {
        String username = CurrentUserRoles.username();
        AppUser u = users.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return userApprovalService.effectiveMatrix(u.getId());
    }

    private String issueRefreshToken(Long userId) {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        String raw = sb.toString();

        refreshTokens.save(RefreshToken.builder()
                .token(sha256(raw))
                .userId(userId)
                .expiresAt(Instant.now().plus(REFRESH_TOKEN_TTL))
                .build());
        return raw;
    }

    private static String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    private void logAudit(String username, String outcome, HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        auditLogs.save(LoginAuditLog.builder()
                .username(username)
                .outcome(outcome)
                .ipAddress(ip)
                .build());
    }

    @PostMapping("/signup")
    public Map<String,Object> signup(@RequestBody Map<String,String> body) {
        String displayName = body.getOrDefault("displayName", "").trim();
        String username = body.getOrDefault("username", "").trim();
        String email = body.getOrDefault("email", "").trim();
        String password = body.getOrDefault("password", "");
        String requestedRole = body.getOrDefault("requestedRole", "").trim();

        if (displayName.isBlank()) throw new IllegalArgumentException("Display name is required");
        if (username.isBlank()) throw new IllegalArgumentException("Username is required");
        if (email.isBlank()) throw new IllegalArgumentException("Email is required");
        if (password.isBlank()) throw new IllegalArgumentException("Password is required");

        if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$"))
            throw new IllegalArgumentException("Invalid email format");

        if (password.length() < passwordMinLength)
            throw new IllegalArgumentException("Password must be at least " + passwordMinLength + " characters");
        if (!password.matches(".*[A-Z].*"))
            throw new IllegalArgumentException("Password must contain at least one uppercase letter");
        if (!password.matches(".*[a-z].*"))
            throw new IllegalArgumentException("Password must contain at least one lowercase letter");
        if (!password.matches(".*\\d.*"))
            throw new IllegalArgumentException("Password must contain at least one digit");
        if (!password.matches(".*[^A-Za-z0-9].*"))
            throw new IllegalArgumentException("Password must contain at least one special character");

        if (users.existsByUsername(username))
            throw new IllegalArgumentException("Username already exists");

        AppUser u = new AppUser();
        u.setUsername(username);
        u.setPassword(enc.encode(password));
        u.setFullName(displayName);
        u.setEmail(email);
        u.setRole("USER");
        u.setStatus("PENDING");
        u.setRequestedRole(requestedRole.isBlank() ? null : requestedRole);
        u.setActive(false);
        u.setCreatedBy("self-registration");
        u.setCreatedAt(java.time.Instant.now());
        users.save(u);

        return Map.of("message", "Registration successful. Your account is pending admin approval.",
                "username", u.getUsername());
    }

    @PostMapping("/forgot-password")
    public Map<String,Object> forgotPassword(@RequestBody Map<String,String> body) {
        String email = body.getOrDefault("email", "").trim();
        if (email.isBlank()) throw new IllegalArgumentException("Email is required");
        return Map.of("message", "If an account with that email exists, a password reset link has been sent.");
    }

    private void recordFailedAttempt(String username) {
        LoginAttempt attempt = attempts.computeIfAbsent(username, k -> new LoginAttempt());
        int count = attempt.count.incrementAndGet();
        if (count >= maxLoginAttempts) {
            attempt.lockedUntil = System.currentTimeMillis() + (lockoutMinutes * 60L * 1000L);
        }
    }

    private static class LoginAttempt {
        final AtomicInteger count = new AtomicInteger(0);
        volatile long lockedUntil = 0;
    }
}
