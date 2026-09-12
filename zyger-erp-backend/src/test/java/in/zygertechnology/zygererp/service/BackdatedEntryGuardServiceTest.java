package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.config.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class BackdatedEntryGuardServiceTest {

    private BackdatedEntryGuardService guardService;

    @BeforeEach
    void setUp() {
        guardService = new BackdatedEntryGuardService();
    }

    @Test
    @DisplayName("Should pass when docDate is today")
    void testTodayDocDateAllowed() {
        String today = LocalDate.now().toString();
        assertDoesNotThrow(() -> guardService.enforce(today, "operator"));
    }

    @Test
    @DisplayName("Should pass when docDate is null or invalid format")
    void testNullOrInvalidDateIgnored() {
        assertDoesNotThrow(() -> guardService.enforce(null, "operator"));
        assertDoesNotThrow(() -> guardService.enforce("", "operator"));
        assertDoesNotThrow(() -> guardService.enforce("invalid-date", "operator"));
    }

    @Test
    @DisplayName("Should throw BusinessRuleException when docDate is significantly in the past")
    void testBackdatedDateThrowsException() {
        String oldDate = LocalDate.now().minusDays(10).toString();
        BusinessRuleException ex = assertThrows(BusinessRuleException.class,
                () -> guardService.enforce(oldDate, "operator"));

        assertEquals("BACKDATED_ENTRY", ex.getRuleCode());
        assertNotNull(ex.getDetails());
        assertEquals(oldDate, ex.getDetails().get("docDate"));
    }
}
