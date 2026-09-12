package in.zygertechnology.zygererp.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterTest {

    private RateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        // Set low limit for easy testing (3 requests per minute)
        rateLimiter = new RateLimiter(3);
    }

    @Test
    @DisplayName("Should allow requests under the maximum limit")
    void testAllowRequestsUnderLimit() {
        String clientIp = "192.168.1.100";
        assertTrue(rateLimiter.isAllowed(clientIp));
        assertTrue(rateLimiter.isAllowed(clientIp));
        assertTrue(rateLimiter.isAllowed(clientIp));
    }

    @Test
    @DisplayName("Should block requests exceeding the maximum limit")
    void testBlockRequestsExceedingLimit() {
        String clientIp = "192.168.1.101";
        assertTrue(rateLimiter.isAllowed(clientIp));
        assertTrue(rateLimiter.isAllowed(clientIp));
        assertTrue(rateLimiter.isAllowed(clientIp));
        // 4th request exceeds limit of 3
        assertFalse(rateLimiter.isAllowed(clientIp));
    }

    @Test
    @DisplayName("Should track rate limits independently per client key")
    void testIndependentClientKeys() {
        String clientA = "10.0.0.1";
        String clientB = "10.0.0.2";

        assertTrue(rateLimiter.isAllowed(clientA));
        assertTrue(rateLimiter.isAllowed(clientA));
        assertTrue(rateLimiter.isAllowed(clientA));
        assertFalse(rateLimiter.isAllowed(clientA)); // Client A limited

        // Client B should still be allowed
        assertTrue(rateLimiter.isAllowed(clientB));
    }

    @Test
    @DisplayName("Should calculate retryAfterMs correctly")
    void testRetryAfterMs() {
        String clientIp = "192.168.1.102";
        assertEquals(0, rateLimiter.retryAfterMs(clientIp));

        rateLimiter.isAllowed(clientIp);
        long retryMs = rateLimiter.retryAfterMs(clientIp);
        assertTrue(retryMs > 0 && retryMs <= 60000);
    }
}
