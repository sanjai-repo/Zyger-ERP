package in.zygertechnology.zygererp.entity;

/**
 * Interface for document entities that reference other documents.
 * Replaces reflection-based access to reference document fields.
 */
public interface ReferenceDocCapable {

    /**
     * Get the original document number that this document references.
     */
    String getOriginalDocumentNo();

    /**
     * Get the purchase order number if this is an inward document.
     */
    default String getPurchaseOrderNo() {
        return null;
    }

    /**
     * Get the sales order number if this is a sales document.
     */
    default String getSalesOrderNo() {
        return null;
    }

    /**
     * Get the issue request number if this is an issue document.
     */
    default String getIssueRequestNo() {
        return null;
    }

    /**
     * Get the allotment number if this is a release document.
     */
    default String getAllotmentNo() {
        return null;
    }

    /**
     * Get the reason code for amendments.
     */
    default String getReasonCode() {
        return null;
    }
}
