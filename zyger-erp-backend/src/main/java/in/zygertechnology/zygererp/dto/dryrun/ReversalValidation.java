package in.zygertechnology.zygererp.dto.dryrun;

import lombok.Builder;
import lombok.Data;

/**
 * P3.1 — Reversal validation result (Rule 6).
 */
@Data
@Builder
public class ReversalValidation {

    private String originalEntryNumber;
    private String reversalEntryNumber;

    /** Original legacy status after reversal (expected REVERSED). */
    private String originalStatusAfter;
    /** Simulated session status of the mirror (expected CANCELLED). */
    private String mirrorSessionStatus;
    /** Simulated operation status of the mirror (expected REVERSED). */
    private String mirrorOperationStatus;

    /** Original projection stays COMPLETED (history preserved), never CANCELLED. */
    private boolean originalPreserved;
    /** Reverse-linked parent resolves to the original by reversed_from_entry_id. */
    private boolean relationshipTraceable;
    /** Mirror quantities are the negation of the original (already-negated stored). */
    private boolean quantitiesNegated;
    /** No duplicate event simulation / replay for the reversal. */
    private boolean noDuplicateSimulation;
    /** No inventory side-effect from the simulation/reversal. */
    private boolean noInventorySideEffect;
    private boolean valid;
}