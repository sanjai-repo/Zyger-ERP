package in.zygertechnology.zygererp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CorrelationIdFilterTest {

    @Mock
    private FilterChain filterChain;

    private CorrelationIdFilter filter;

    @BeforeEach
    void setUp() {
        filter = new CorrelationIdFilter();
    }

    @Test
    @DisplayName("Should use existing X-Request-Id header if present in request")
    void testExistingCorrelationId() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader("X-Request-Id", "CUSTOM-REQ-12345");

        filter.doFilterInternal(request, response, filterChain);

        assertEquals("CUSTOM-REQ-12345", response.getHeader("X-Request-Id"));
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("Should generate new correlation ID if X-Request-Id header is missing")
    void testGeneratedCorrelationId() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        String generatedId = response.getHeader("X-Request-Id");
        assertNotNull(generatedId);
        assertFalse(generatedId.isBlank());
        assertEquals(8, generatedId.length());
        verify(filterChain, times(1)).doFilter(request, response);
    }
}
