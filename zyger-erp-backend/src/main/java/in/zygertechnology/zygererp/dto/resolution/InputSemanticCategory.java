package in.zygertechnology.zygererp.dto.resolution;

/**
 * P3 correction (RC-1) — Semantic category of a {@code production_entry} record,
 * derived exclusively by {@link in.zygertechnology.zygererp.service.ProductionInputAuthorityResolver}.
 *
 * <p>These categories are the SINGLE source of quantity semantics. No consumer may
 * define its own {@code process_qty}/{@code produced_quantity} interpretation.
 *
 * <ul>
 *   <li>{@link #CATEGORY_A}: {@code process_qty} present, {@code produced_quantity} null
 *       &rarr; authority {@code PROCESS_QTY}, eligibility {@code ELIGIBLE}.</li>
 *   <li>{@link #CATEGORY_B}: {@code process_qty} null, {@code produced_quantity} present
 *       &rarr; authority {@code AMBIGUOUS}, eligibility {@code QUARANTINE}.</li>
 *   <li>{@link #CATEGORY_C}: both present and equal &rarr; authority {@code PROCESS_QTY},
 *       eligibility {@code ELIGIBLE}.</li>
 *   <li>{@link #CATEGORY_D}: both present and different &rarr; authority {@code AMBIGUOUS},
 *       eligibility {@code QUARANTINE} (over-allocation escalates to {@code BLOCK}).</li>
 *   <li>{@link #CATEGORY_UNKNOWN}: both null, invalid negative data, over-allocation, or
 *       any state requiring explicit investigation &rarr; {@code QUARANTINE}/{@code BLOCK}.</li>
 * </ul>
 */
public enum InputSemanticCategory {
    CATEGORY_A,
    CATEGORY_B,
    CATEGORY_C,
    CATEGORY_D,
    CATEGORY_UNKNOWN
}