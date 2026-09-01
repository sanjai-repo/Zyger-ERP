package in.zygertechnology.zygererp.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String SECRET_32_BYTES = "12345678901234567890123456789012";
    private static final long EXPIRATION_MS = 3600000; // 1 hour

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET_32_BYTES, EXPIRATION_MS);
    }

    @Test
    @DisplayName("Should generate valid JWT token and extract subject and claims")
    void testGenerateAndExtractClaims() {
        String token = jwtService.generate("admin_user", "ADMIN");
        assertNotNull(token);
        assertTrue(jwtService.isValid(token));
        assertEquals("admin_user", jwtService.username(token));
        assertEquals("ADMIN", jwtService.role(token));
    }

    @Test
    @DisplayName("Should detect invalid or tampered JWT token")
    void testInvalidToken() {
        String token = jwtService.generate("user1", "USER");
        String tamperedToken = token + "corrupted";
        assertFalse(jwtService.isValid(tamperedToken));
    }

    @Test
    @DisplayName("Should detect expired JWT token")
    void testExpiredToken() throws InterruptedException {
        // Create token with 1ms expiration
        String shortLivedToken = jwtService.generate("user_temp", "GUEST", 1L);
        Thread.sleep(10); // Wait for expiration
        assertFalse(jwtService.isValid(shortLivedToken));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException if secret is under 32 bytes")
    void testShortSecretConstructor() {
        String shortSecret = "too_short_secret";
        assertThrows(IllegalArgumentException.class, () -> new JwtService(shortSecret, EXPIRATION_MS));
    }
}
