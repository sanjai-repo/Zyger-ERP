package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.VendorLedgerEntry;
import in.zygertechnology.zygererp.repo.VendorLedgerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * FRS DOC-PUR-FRS-02 §11 (PUR-09/PUR-11) — Vendor Ledger service: records entries and
 * derives a running balance + ageing (0-30/31-60/61-90/90+) per supplier.
 *
 * [ASSUMPTION] Ageing allocates decrease-entries (returns/payments) against the OLDEST
 * outstanding increase-entries first (standard FIFO ageing) — there is no per-invoice
 * "amount paid" tracking, so this is derived on read rather than stored.
 */
@Service
@RequiredArgsConstructor
public class VendorLedgerService {

    private final VendorLedgerRepository repo;

    @Transactional
    public VendorLedgerEntry record(String partyCode, String partyName, LocalDate date, String txType,
                                     String refDocType, String refDocNo, BigDecimal amount,
                                     String remarks, String user) {
        if (partyCode == null || partyCode.isBlank() || amount == null) return null;
        // Idempotency: never post the same source document's ledger effect twice.
        if (refDocType != null && refDocNo != null && repo.existsByRefDocTypeAndRefDocNo(refDocType, refDocNo)) {
            return null;
        }
        VendorLedgerEntry en = new VendorLedgerEntry();
        en.setPartyCode(partyCode);
        en.setPartyName(partyName);
        en.setEntryDate(date != null ? date : LocalDate.now());
        en.setTxType(txType);
        en.setRefDocType(refDocType);
        en.setRefDocNo(refDocNo);
        en.setAmount(amount);
        en.setRemarks(remarks);
        en.setCreatedBy(user);
        return repo.save(en);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> ledgerFor(String partyCode) {
        List<VendorLedgerEntry> entries = repo.findByPartyCodeOrderByEntryDateAscIdAsc(partyCode);
        BigDecimal running = BigDecimal.ZERO;
        List<Map<String, Object>> rows = new ArrayList<>();
        for (VendorLedgerEntry en : entries) {
            running = running.add(en.getAmount());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", en.getId());
            row.put("entryDate", en.getEntryDate());
            row.put("txType", en.getTxType());
            row.put("refDocType", en.getRefDocType());
            row.put("refDocNo", en.getRefDocNo());
            row.put("amount", en.getAmount());
            row.put("runningBalance", running);
            row.put("remarks", en.getRemarks());
            rows.add(row);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("partyCode", partyCode);
        out.put("partyName", entries.isEmpty() ? null : entries.get(entries.size() - 1).getPartyName());
        out.put("balance", running);
        out.put("entries", rows);
        return out;
    }

    /** Outstanding (unpaid/undebited) balance for one supplier, > 0 only, bucketed by age. */
    @Transactional(readOnly = true)
    public Map<String, Object> ageingFor(String partyCode) {
        return ageingBuckets(repo.findByPartyCodeOrderByEntryDateAscIdAsc(partyCode));
    }

    /** Ageing across every supplier with any ledger activity, grouped by supplier. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> ageingAll() {
        Map<String, List<VendorLedgerEntry>> byParty = new LinkedHashMap<>();
        for (VendorLedgerEntry en : repo.findAllByOrderByPartyCodeAscEntryDateAscIdAsc()) {
            byParty.computeIfAbsent(en.getPartyCode(), k -> new ArrayList<>()).add(en);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (var entry : byParty.entrySet()) {
            Map<String, Object> row = ageingBuckets(entry.getValue());
            row.put("partyCode", entry.getKey());
            row.put("partyName", entry.getValue().get(entry.getValue().size() - 1).getPartyName());
            out.add(row);
        }
        return out;
    }

    private Map<String, Object> ageingBuckets(List<VendorLedgerEntry> entries) {
        // FIFO: outstanding "lots" from increase entries (amount > 0), each decrease entry
        // (amount < 0) consumes the oldest lots first.
        List<LocalDate> lotDates = new ArrayList<>();
        List<BigDecimal> lotAmounts = new ArrayList<>();
        for (VendorLedgerEntry en : entries) {
            BigDecimal amt = en.getAmount();
            if (amt == null) continue;
            if (amt.signum() > 0) {
                lotDates.add(en.getEntryDate());
                lotAmounts.add(amt);
            } else if (amt.signum() < 0) {
                BigDecimal toConsume = amt.abs();
                for (int i = 0; i < lotAmounts.size() && toConsume.signum() > 0; i++) {
                    BigDecimal avail = lotAmounts.get(i);
                    if (avail.signum() <= 0) continue;
                    BigDecimal take = avail.min(toConsume);
                    lotAmounts.set(i, avail.subtract(take));
                    toConsume = toConsume.subtract(take);
                }
            }
        }
        LocalDate today = LocalDate.now();
        BigDecimal b0 = BigDecimal.ZERO, b30 = BigDecimal.ZERO, b60 = BigDecimal.ZERO, b90 = BigDecimal.ZERO, b90p = BigDecimal.ZERO;
        for (int i = 0; i < lotAmounts.size(); i++) {
            BigDecimal remaining = lotAmounts.get(i);
            if (remaining.signum() <= 0) continue;
            long ageDays = ChronoUnit.DAYS.between(lotDates.get(i), today);
            if (ageDays <= 30) b0 = b0.add(remaining);
            else if (ageDays <= 60) b30 = b30.add(remaining);
            else if (ageDays <= 90) b60 = b60.add(remaining);
            else b90p = b90p.add(remaining);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("bucket_0_30", b0);
        out.put("bucket_31_60", b30);
        out.put("bucket_61_90", b60);
        out.put("bucket_90_plus", b90p);
        out.put("totalOutstanding", b0.add(b30).add(b60).add(b90p));
        return out;
    }
}
