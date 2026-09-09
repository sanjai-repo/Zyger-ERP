package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * FRS DOC-PUR-FRS-02 §6 (PUR-04) — PO Amendment history. Written by
 * DocumentFacade.update() whenever a Purchase Order is edited outside DRAFT/REJECTED
 * (i.e. after it was RELEASED/SUBMITTED/APPROVED — a real amendment to a document the
 * vendor may already have). One row per edit, holding a JSON snapshot of the header+line
 * state immediately before the edit was applied, so "what changed" is always recoverable.
 */
@Entity @Table(name = "po_amendment_history") @Getter @Setter
public class PoAmendmentHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "po_id", nullable = false) Long poId;
    @Column(name = "po_doc_no", length = 60) String poDocNo;
    @Column(name = "revision_number") Integer revisionNumber;

    @Column(name = "status_at_amendment", length = 30) String statusAtAmendment;
    /** true if supplier, any line's orderQty, or any line's unitPrice differed from the snapshot. */
    @Column(name = "material_change") Boolean materialChange;

    @Column(name = "snapshot_before", columnDefinition = "TEXT") String snapshotBefore;
    @Column(length = 500) String remarks;

    String amendedBy;
    Instant amendedAt;

    @PrePersist
    void prePersist() {
        if (amendedAt == null) amendedAt = Instant.now();
    }
}
