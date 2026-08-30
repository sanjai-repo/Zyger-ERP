package in.zygertechnology.zygererp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory rate limiter (sliding window per client IP).
 * §2.4: Rate limiting without Bucket4j dependency.
 */
@Component
public class RateLimiter {

    private final ConcurrentHashMap<String, RequestWindow> windows = new ConcurrentHashMap<>();

    private final int maxRequestsPerMinute;
    private static final long WINDOW_MS = 60_000;

    public RateLimiter(@Value("${app.rate-limit.per-minute:600}") int maxRequestsPerMinute) {
        this.maxRequestsPerMinute = maxRequestsPerMinute;
    }

    public boolean isAllowed(String clientKey) {
        long now = System.currentTimeMillis();
        RequestWindow w = windows.compute(clientKey, (k, existing) -> {
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RequestWindow(now, 1);
            }
            existing.count.incrementAndGet();
            return existing;
        });
        return w.count.get() <= maxRequestsPerMinute;
    }

    public long retryAfterMs(String clientKey) {
        RequestWindow w = windows.get(clientKey);
        if (w == null) return 0;
        long elapsed = System.currentTimeMillis() - w.windowStart;
        return Math.max(0, WINDOW_MS - elapsed);
    }

    private static class RequestWindow {
        final long windowStart;
        final AtomicInteger count;

        RequestWindow(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = new AtomicInteger(count);
        }
    }
}
