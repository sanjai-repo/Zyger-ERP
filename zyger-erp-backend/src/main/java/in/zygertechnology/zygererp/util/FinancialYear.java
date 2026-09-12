package in.zygertechnology.zygererp.util;

import java.time.LocalDate;
import java.time.Month;

/**
 * Financial-year helper (Indian: April–March).
 * FY 2025-26 runs 2025-04-01 to 2026-03-31.
 */
public final class FinancialYear {

    private FinancialYear() {}

    /** Start year of the current FY (e.g. 2025 for FY 2025-26). */
    public static int currentStartYear() {
        LocalDate now = LocalDate.now();
        return now.getMonthValue() >= Month.APRIL.getValue() ? now.getYear() : now.getYear() - 1;
    }

    /** Label like "25-26" for the current FY. */
    public static String currentLabel() {
        return label(currentStartYear());
    }

    /** Label like "25-26" from a start year. */
    public static String label(int startYear) {
        int endYear = startYear + 1;
        return String.format("%02d-%02d", startYear % 100, endYear % 100);
    }

    /** Parse "25-26" back to start year 2025. */
    public static int parseLabel(String label) {
        if (label == null || !label.contains("-")) throw new IllegalArgumentException("Invalid FY label: " + label);
        String[] parts = label.split("-");
        int first = Integer.parseInt(parts[0].trim());
        return first < 100 ? 2000 + first : first;
    }

    /** Full range text: "1-Apr-2025 to 31-Mar-2026". */
    public static String rangeText(int startYear) {
        return String.format("1-Apr-%d to 31-Mar-%d", startYear, startYear + 1);
    }
}
