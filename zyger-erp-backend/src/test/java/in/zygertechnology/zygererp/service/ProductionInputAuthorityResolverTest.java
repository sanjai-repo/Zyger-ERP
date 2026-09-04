package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.dto.resolution.*;
import in.zygertechnology.zygererp.entity.ProductionEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * P3 correction (RC-1) — pure unit tests of {@link ProductionInputAuthorityResolver}.
 *
 * <p>These assert the four semantic categories plus the unknown/invalid handling and the
 * "no silent zero" rule. No database is required — the resolver is a pure function of a
 * {@link ProductionEntry}.
 */
class ProductionInputAuthorityResolverTest {

    private ProductionInputAuthorityResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new ProductionInputAuthorityResolver();
    }

    private ProductionEntry entry(String process, String produced, String good, String rejected,
                                  String rework, String scrap) {
        return ProductionEntry.builder()
                .entryNumber("PE-X")
                .processQty(q(process))
                .producedQuantity(q(produced))
                .goodQuantity(q(good))
                .rejectedQuantity(q(rejected))
                .reworkQuantity(q(rework))
                .scrapQuantity(q(scrap))
                .build();
    }

    private BigDecimal q(String s) {
        return s == null ? null : new BigDecimal(s);
    }

    @Test
    @DisplayName("CATEGORY_A: process present, produced null -> PROCESS_QTY / ELIGIBLE / resolvable")
    void categoryA() {
        InputResolutionResult r = resolver.resolve(entry("100", null, "90", "5", "3", "2"));
        assertEquals(InputSemanticCategory.CATEGORY_A, r.getCategory());
        assertEquals(InputAuthority.PROCESS_QTY, r.getAuthority());
        assertEquals(BackfillEligibility.ELIGIBLE, r.getEligibility());
        assertEquals(ResolutionConfidence.HIGH, r.getConfidence());
        assertEquals(0, new BigDecimal("100").compareTo(r.getEffectiveInputQuantity()));
        assertTrue(r.isResolvable());
    }

    @Test
    @DisplayName("CATEGORY_B: process null, produced present -> AMBIGUOUS / QUARANTINE / NOT resolvable (live PE/2026-27/00001)")
    void categoryB() {
        InputResolutionResult r = resolver.resolve(entry(null, "100", "90", "5", "3", "2"));
        assertEquals(InputSemanticCategory.CATEGORY_B, r.getCategory());
        assertEquals(InputAuthority.AMBIGUOUS, r.getAuthority());
        assertEquals(BackfillEligibility.QUARANTINE, r.getEligibility());
        assertEquals("INPUT-AUTHORITY-NULL", r.getReasonCode());
        // No silent authority: effective input must be null, never produced, never zero.
        assertNull(r.getEffectiveInputQuantity());
        assertFalse(r.isResolvable());
    }

    @Test
    @DisplayName("CATEGORY_C: both present and equal -> PROCESS_QTY / ELIGIBLE / resolvable")
    void categoryC() {
        InputResolutionResult r = resolver.resolve(entry("100", "100", "90", "5", "3", "2"));
        assertEquals(InputSemanticCategory.CATEGORY_C, r.getCategory());
        assertEquals(InputAuthority.PROCESS_QTY, r.getAuthority());
        assertEquals(BackfillEligibility.ELIGIBLE, r.getEligibility());
        assertEquals("PROCESS_EQ_PRODUCED", r.getReasonCode());
        assertTrue(r.isResolvable());
    }

    @Test
    @DisplayName("CATEGORY_D: both present and different -> AMBIGUOUS / QUARANTINE / NOT resolvable")
    void categoryD() {
        InputResolutionResult r = resolver.resolve(entry("100", "150", "90", "5", "3", "2"));
        assertEquals(InputSemanticCategory.CATEGORY_D, r.getCategory());
        assertEquals(InputAuthority.AMBIGUOUS, r.getAuthority());
        assertEquals(BackfillEligibility.QUARANTINE, r.getEligibility());
        assertEquals("PRODUCED-DIFF", r.getReasonCode());
        assertNull(r.getEffectiveInputQuantity());
        assertFalse(r.isResolvable());
    }

    @Test
    @DisplayName("CATEGORY_D over-allocation: outputs exceed process -> BLOCK, reason OVERALLOCATION")
    void categoryDOverAllocation() {
        InputResolutionResult r = resolver.resolve(entry("100", "150", "100", "20", "10", "5"));
        assertEquals(InputSemanticCategory.CATEGORY_D, r.getCategory());
        assertEquals(BackfillEligibility.BLOCK, r.getEligibility());
        assertEquals("OVERALLOCATION", r.getReasonCode());
        assertFalse(r.isResolvable());
    }

    @Test
    @DisplayName("CATEGORY_A over-allocation: outputs exceed process -> BLOCK (no incorrect quantity history)")
    void categoryAOverAllocation() {
        InputResolutionResult r = resolver.resolve(entry("100", null, "100", "20", "10", "5"));
        assertEquals(BackfillEligibility.BLOCK, r.getEligibility());
        // Input remains authoritative (process_qty) but BLOCK guards against backfill.
        assertEquals(0, new BigDecimal("100").compareTo(r.getEffectiveInputQuantity()));
        assertTrue(r.isResolvable());
        assertFalse(r.getEligibility() == BackfillEligibility.ELIGIBLE, "BLOCK prevents backfill despite resolvable input");
    }

    @Test
    @DisplayName("both null, no outputs -> CATEGORY_UNKNOWN / QUARANTINE / NOT resolvable")
    void bothNullNoOutputs() {
        InputResolutionResult r = resolver.resolve(entry(null, null, null, null, null, null));
        assertEquals(InputSemanticCategory.CATEGORY_UNKNOWN, r.getCategory());
        assertEquals(BackfillEligibility.QUARANTINE, r.getEligibility());
        assertNull(r.getEffectiveInputQuantity());
        assertFalse(r.isResolvable());
    }

    @Test
    @DisplayName("both null with outputs -> QUARANTINE, reason BOTH-NULL-WITH-OUTPUTS")
    void bothNullWithOutputs() {
        InputResolutionResult r = resolver.resolve(entry(null, null, "90", "5", "3", "2"));
        assertEquals("BOTH-NULL-WITH-OUTPUTS", r.getReasonCode());
        assertEquals(BackfillEligibility.QUARANTINE, r.getEligibility());
        assertFalse(r.isResolvable());
    }

    @Test
    @DisplayName("negative process -> UNKNOWN / QUARANTINE, no silent zero (no NEG-WIP projection)")
    void negativeProcess() {
        InputResolutionResult r = resolver.resolve(entry("-100", null, "90", "5", "3", "2"));
        assertEquals(InputSemanticCategory.CATEGORY_UNKNOWN, r.getCategory());
        assertEquals("NEGATIVE-QUANTITY", r.getReasonCode());
        assertEquals(BackfillEligibility.QUARANTINE, r.getEligibility());
        assertNull(r.getEffectiveInputQuantity());
        assertFalse(r.isResolvable());
    }

    @Test
    @DisplayName("negative output -> UNKNOWN / QUARANTINE (reversal must be classified as reversal, not negative data)")
    void negativeOutput() {
        // A standalone negative-output record (reversal handled by reversal classification,
        // not by this resolver) must still be non-resolvable to avoid silent projection.
        InputResolutionResult r = resolver.resolve(entry("100", "100", "-90", "0", "0", "0"));
        assertEquals("NEGATIVE-QUANTITY", r.getReasonCode());
        assertEquals(BackfillEligibility.QUARANTINE, r.getEligibility());
        assertFalse(r.isResolvable());
    }

    @Test
    @DisplayName("null entry -> UNKNOWN / QUARANTINE, reason NULL-ENTRY")
    void nullEntry() {
        InputResolutionResult r = resolver.resolve(null);
        assertEquals("NULL-ENTRY", r.getReasonCode());
        assertEquals(BackfillEligibility.QUARANTINE, r.getEligibility());
        assertFalse(r.isResolvable());
    }

    @Test
    @DisplayName("legitimate reversal (negated, is_reversal=true) -> resolvable mirror, ELIGIBLE for projection (never backfill-like)")
    void reversalMirrorResolvable() {
        ProductionEntry rev = entry("-100", "-100", "-85", "-5", "-6", "-2");
        rev.setIsReversal(true);
        InputResolutionResult r = resolver.resolve(rev);
        assertEquals("REVERSAL-MIRROR", r.getReasonCode());
        assertEquals(BackfillEligibility.ELIGIBLE, r.getEligibility());
        assertEquals(0, new BigDecimal("-100").compareTo(r.getEffectiveInputQuantity()));
        assertTrue(r.isResolvable(), "reversal mirror must be projected (negated CANCELLED session)");
    }

    @Test
    @DisplayName("reversal of Category B (process_qty NULL on mirror) -> QUARANTINE, never silently promote produced into process")
    void reversalOfCategoryBQuarantined() {
        ProductionEntry rev = entry(null, "-100", "-85", "-5", "-6", "-2");
        rev.setIsReversal(true);
        InputResolutionResult r = resolver.resolve(rev);
        assertEquals(InputSemanticCategory.CATEGORY_B, r.getCategory());
        assertEquals("INPUT-AUTHORITY-NULL", r.getReasonCode());
        assertEquals(BackfillEligibility.QUARANTINE, r.getEligibility());
        assertNull(r.getEffectiveInputQuantity());
        assertFalse(r.isResolvable());
    }
}