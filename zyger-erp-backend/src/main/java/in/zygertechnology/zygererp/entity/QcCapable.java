package in.zygertechnology.zygererp.entity;

/**
 * Interface for document entities that can require quality inspection.
 * Replaces reflection-based access to qcRequired field.
 */
public interface QcCapable {

    Boolean getQcRequired();

    void setQcRequired(Boolean qcRequired);
}
