package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * FRS DOC-PUR-FRS-02 §11 (PUR-09/PUR-11) — Vendor Ledger / Accounts Payable.
 * A minimal, append-only running ledger per supplier. Not a DocEntity/DocumentFacade document
 * type (it has no lifecycle of its own) — rows are written by other documents as they POST
 * (Purchase Invoice increases the payable, Purchase Return with debitNoteRequired decreases it).
 *
 * [ASSUMPTION] `amount` is signed: positive = increases what we owe the vendor (a bill),
 * negative = decreases it (a return debit note or a recorded payment). The running balance for
 * a vendor is simply the sum of their entries' `amount`, in date/id order — there is no separate
 * Payment document type in this system yet (see FRS §2 "Invoice -> Payment" gap), so in practice
 * today only INVOICE and RETURN entries exist; `amount` for PAYMENT is included here so the
 * schema doesn't need to change when that document type is eventually built.
 */
@Entity @Table(name = "vendor_ledger_entry") @Getter @Setter
public class VendorLedgerEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "party_code", length = 60, nullable = false) String partyCode;
    @Column(name = "party_name", length = 200) String partyName;

    @Column(name = "entry_date", nullable = false) LocalDate entryDate;

    /** OPENING_BALANCE | INVOICE | PAYMENT | RETURN */
    @Column(name = "tx_type", length = 30, nullable = false) String txType;

    @Column(name = "ref_doc_type", length = 40) String refDocType;
    @Column(name = "ref_doc_no", length = 60) String refDocNo;

    @Column(nullable = false, precision = 16, scale = 2) BigDecimal amount;

    @Column(length = 300) String remarks;

    String createdBy;
    Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
