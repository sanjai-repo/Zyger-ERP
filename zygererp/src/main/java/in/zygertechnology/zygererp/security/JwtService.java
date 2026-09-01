package in.zygertechnology.zygererp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    /**
     * In-memory access-token deny-list keyed by the JWT {@code jti} claim.
     * Stores expiry epoch-millis so entries are auto-cleaned after the token would
     * have naturally expired. A logged-out/revoked token is rejected with 401
     * immediately instead of remaining valid until its TTL runs out.
     */
    private final Map<String, Long> denied = new ConcurrentHashMap<>();

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalArgumentException(
                "JWT secret must be at least 32 bytes (256 bits). Current length: " + bytes.length
                + " bytes. Set JWT_SECRET env var to a secure random string.");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMs = expirationMs;
    }

    public String generate(String username, String role) {
        return generate(username, role, expirationMs);
    }

    public String generate(String username, String role, long ttlMillis) {
        Date now = new Date();
        return Jwts.builder()
                .subject(username)
                .id(UUID.randomUUID().toString())
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttlMillis))
                .signWith(key)
                .compact();
    }

    public String username(String token) {
        return parse(token).getSubject();
    }

    public String role(String token) {
        return parse(token).get("role", String.class);
    }

    public boolean isValid(String token) {
        try {
            parse(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Blacklist an access token so it is rejected immediately, until its natural expiry. */
    public void deny(String token) {
        try {
            Claims claims = parse(token);
            String id = claims.getId();
            if (id != null && !id.isBlank()) {
                denied.put(id, claims.getExpiration().getTime());
            }
        } catch (Exception ignored) {
            // Not a valid/parseable token — nothing to blacklist.
        }
    }

    /** Whether the token has been explicitly revoked via logout. */
    public boolean isDenied(String token) {
        try {
            String id = parse(token).getId();
            if (id == null || id.isBlank()) return false;
            Long expiry = denied.get(id);
            if (expiry == null) return false;
            // Lazy eviction: drop the entry once the token's natural lifetime has passed.
            if (expiry <= System.currentTimeMillis()) {
                denied.remove(id);
                return false;
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public void clearDenied() {
        denied.clear();
    }

    private Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
    }
}
