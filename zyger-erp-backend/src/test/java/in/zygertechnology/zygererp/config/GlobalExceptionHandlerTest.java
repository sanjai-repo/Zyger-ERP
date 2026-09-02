package in.zygertechnology.zygererp.config;

import jakarta.persistence.OptimisticLockException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings("deprecation")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("Should handle OptimisticLockException with 409 CONFLICT")
    void testHandleOptimisticLock() {
        OptimisticLockException ex = new OptimisticLockException("Stale data");
        ProblemDetail pd = exceptionHandler.handleOptimisticLock(ex);

        assertEquals(HttpStatus.CONFLICT.value(), pd.getStatus());
        assertEquals("Version Conflict", pd.getTitle());
        assertEquals("VERSION_CONFLICT", pd.getProperties().get("code"));
    }

    @Test
    @DisplayName("Should handle IllegalArgumentException with 400 BAD_REQUEST")
    void testHandleIllegalArgument() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid parameter value");
        ProblemDetail pd = exceptionHandler.handleIllegalArg(ex);

        assertEquals(HttpStatus.BAD_REQUEST.value(), pd.getStatus());
        assertEquals("Validation Error", pd.getTitle());
        assertEquals("Invalid parameter value", pd.getDetail());
    }

    @Test
    @DisplayName("Should handle SecurityException with 403 FORBIDDEN")
    void testHandleSecurityException() {
        SecurityException ex = new SecurityException("User not authorized for this resource");
        ProblemDetail pd = exceptionHandler.handleSecurity(ex);

        assertEquals(HttpStatus.FORBIDDEN.value(), pd.getStatus());
        assertEquals("Access Denied", pd.getTitle());
    }

    @Test
    @DisplayName("Should handle BusinessRuleException with 422 UNPROCESSABLE_ENTITY")
    void testHandleBusinessRuleException() {
        BusinessRuleException ex = new BusinessRuleException("STOCK_DEPLETED", "Insufficient stock available", Map.of("itemId", 101L));
        ProblemDetail pd = exceptionHandler.handleBusinessRule(ex);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY.value(), pd.getStatus());
        assertEquals("Business Rule Violation", pd.getTitle());
        assertEquals("STOCK_DEPLETED", pd.getProperties().get("code"));
        assertEquals(101L, pd.getProperties().get("itemId"));
    }

    @Test
    @DisplayName("Should handle RateLimitException with 429 TOO_MANY_REQUESTS")
    void testHandleRateLimitException() {
        RateLimitException ex = new RateLimitException("Rate limit exceeded", 45);
        ProblemDetail pd = exceptionHandler.handleRateLimit(ex);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), pd.getStatus());
        assertEquals("RATE_LIMIT_EXCEEDED", pd.getProperties().get("code"));
        assertEquals(45L, pd.getProperties().get("retryAfterSeconds"));
    }

    @Test
    @DisplayName("Should handle general Exception with 500 INTERNAL_SERVER_ERROR")
    void testHandleGeneralException() {
        Exception ex = new RuntimeException("Unexpected database failure");
        ProblemDetail pd = exceptionHandler.handleGeneral(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), pd.getStatus());
        assertEquals("INTERNAL_ERROR", pd.getProperties().get("code"));
    }
}
