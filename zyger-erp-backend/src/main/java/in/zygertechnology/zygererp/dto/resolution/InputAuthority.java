package in.zygertechnology.zygererp.dto.resolution;

/**
 * P3 correction (RC-1) — Which field is authoritative for the effective input quantity
 * of a {@code production_entry}. Determined exclusively by
 * {@link in.zygertechnology.zygererp.service.ProductionInputAuthorityResolver}.
 */
public enum InputAuthority {
    /** {@code process_qty} is the authoritative input. */
    PROCESS_QTY,
    /** Authority cannot be safely resolved; the record must be quarantined. */
    AMBIGUOUS
}