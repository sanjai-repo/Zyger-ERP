package in.zygertechnology.zygererp.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

class FinancialYearTest {

    @Test
    @DisplayName("Should correctly format label from start year")
    void testLabelFromStartYear() {
        assertEquals("25-26", FinancialYear.label(2025));
        assertEquals("26-27", FinancialYear.label(2026));
        assertEquals("99-00", FinancialYear.label(2099));
        assertEquals("00-01", FinancialYear.label(2000));
    }

    @ParameterizedTest
    @CsvSource({
        "25-26, 2025",
        "26-27, 2026",
        "30-31, 2030"
    })
    @DisplayName("Should correctly parse FY label back to start year")
    void testParseLabelValid(String label, int expectedStartYear) {
        assertEquals(expectedStartYear, FinancialYear.parseLabel(label));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException for invalid FY labels")
    void testParseLabelInvalid() {
        assertThrows(IllegalArgumentException.class, () -> FinancialYear.parseLabel(null));
        assertThrows(IllegalArgumentException.class, () -> FinancialYear.parseLabel("2025"));
        assertThrows(IllegalArgumentException.class, () -> FinancialYear.parseLabel("invalid-label"));
    }

    @Test
    @DisplayName("Should generate formatted range text")
    void testRangeText() {
        String range = FinancialYear.rangeText(2025);
        assertEquals("1-Apr-2025 to 31-Mar-2026", range);
    }

    @Test
    @DisplayName("Should return a non-null current FY label and positive start year")
    void testCurrentYearDefaults() {
        int currentStart = FinancialYear.currentStartYear();
        assertTrue(currentStart > 2000);
        assertNotNull(FinancialYear.currentLabel());
        assertTrue(FinancialYear.currentLabel().contains("-"));
    }
}
