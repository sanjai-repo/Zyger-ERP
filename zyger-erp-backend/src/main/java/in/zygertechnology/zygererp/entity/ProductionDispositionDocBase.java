package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

/**
 * P9 — Shared mapped superclass for the three first-class disposition documents
 * (Rejection/Defect Record, Scrap, Rework). ADR-PROD-003 = CREATE NEW first-class docs;
 * each concrete header maps to its own table.
 *
 * <p>RECORDING-ONLY (R1 classification): these documents never modify the referenced
 * {@link ProductionEntry} quantities, WIP, produced/pending, subjob roll-ups, normalized
 * events, or Inventory balances.
 */
@Getter
@Setter
@MappedSuperclass
public abstract class ProductionDispositionDocBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "doc_number", length = 80, nullable = false, unique = true)
    private String docNumber;

    @Column(name = "entry_id", nullable = false)
    private Long entryId;

    @Column(name = "entry_number", length = 80, nullable = false)
    private String entryNumber;

    @Column(name = "job_card_number", length = 80)
    private String jobCardNumber;

    @Column(name = "subjob_number", length = 80)
    private String subjobNumber;

    @Column(name = "operation_code", length = 80)
    private String operationCode;

    @Column(name = "part_code", length = 60)
    private String partCode;

    @Column(name = "part_description", length = 200)
    private String partDescription;

    @Column(length = 30, nullable = false)
    private String status = "DRAFT";

    @Column(name = "reversal_reason", length = 255)
    private String reversalReason;

    @Column(name = "reversed_from_doc_id")
    private Long reversedFromDocId;

    @Column(name = "is_reversal", nullable = false)
    private Boolean isReversal = false;

    @Column(length = 500)
    private String remarks;

    @Column(name = "created_by", length = 80)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_by", length = 80)
    private String updatedBy;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private Long version;
}