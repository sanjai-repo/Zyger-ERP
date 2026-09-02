package in.zygertechnology.zygererp.entity;

/**
 * Inspection purpose / source classification for quality inspections.
 * Drives which header sections and source validations apply.
 */
public enum QualityInspectionType {
    IQC,
    LO,
    JOMIN,
    FAI,
    IPQC,
    LINE,
    LAST_OFF,
    FINAL
}
