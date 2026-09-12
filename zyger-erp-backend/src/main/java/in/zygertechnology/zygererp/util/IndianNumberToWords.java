package in.zygertechnology.zygererp.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Converts rupee amounts to words using the Indian numbering system
 * (Hundred / Thousand / Lakh / Crore). Shared by the HTML print templates.
 */
public final class IndianNumberToWords {

    private static final String[] ONES = {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"};
    private static final String[] TENS = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};

    private IndianNumberToWords() {
    }

    /** Rounds the amount to whole rupees and converts to words ("One Lakh ... Only"). */
    public static String toWords(BigDecimal amount) {
        if (amount == null) return "Zero Only";
        return toWords(amount, true);
    }

    /** Converts to words; appends " Only" when onlyRupees is true and no paise are present. */
    public static String toWords(BigDecimal amount, boolean appendOnly) {
        if (amount == null) amount = BigDecimal.ZERO;
        BigDecimal rounded = amount.setScale(0, RoundingMode.HALF_UP);
        long rupees = rounded.longValueExact();

        String body;
        if (rupees == 0) {
            body = "Zero";
        } else if (rupees < 0) {
            return "Minus " + toWords(rounded.abs(), appendOnly);
        } else {
            body = toWords(rupees);
        }
        return appendOnly ? body + " Only" : body;
    }

    private static String toWords(long n) {
        StringBuilder sb = new StringBuilder();
        long crore = n / 10000000; n %= 10000000;
        long lakh = n / 100000; n %= 100000;
        long thousand = n / 1000; n %= 1000;
        long hundred = n / 100; n %= 100;
        if (crore > 0) sb.append(twoDigit(crore)).append(" Crore ");
        if (lakh > 0) sb.append(twoDigit(lakh)).append(" Lakh ");
        if (thousand > 0) sb.append(twoDigit(thousand)).append(" Thousand ");
        if (hundred > 0) sb.append(ONES[(int) hundred]).append(" Hundred ");
        if (n > 0) {
            if (sb.length() > 0) sb.append("and ");
            sb.append(twoDigit(n));
        }
        return sb.toString().trim();
    }

    private static String twoDigit(long n) {
        if (n < 20) return ONES[(int) n];
        return (TENS[(int) (n / 10)] + " " + ONES[(int) (n % 10)]).trim();
    }
}