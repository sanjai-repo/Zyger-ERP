# DOCUMENT_29 — Data Semantics and Backfill Correction Plan (Read-Only)

**Phase:** P3 / P3.2 (dry-run continuation)
**Scope:** Read-only analysis and correction plan only. **No code change, no data write, no event insert, no authority flip, no inventory/legacy modification.**
**Source of truth (live DB):** `zyger_erp` @ localhost:5432, user `zyger`, read-only queries.
**Status of upstream documents:** DOCUMENT_26 (P3 gate PASS), DOCUMENT_27 (Options A/B/C; B approved), DOCUMENT_28 (dry-run; Readiness **B**).
**Current Readiness:** **B — READY WITH REQUIRED CORRECTIONS** (unchanged, finalized at §14).

---

## 0. Analysis Baseline

The live database currently contains **exactly one** historical `production_entry` record:

| Field | Value |
| ----- | ----- |
| id | 1 |
| entry_number | `PE/2026-27/00001` |
| status | `REJECTED` |
| entry_type | NULL |
| process_qty | **NULL** |
| produced_quantity | **100.0000** |
| good_quantity | 95.0000 |
| rejected_quantity | 5.0000 |
| rework_quantity | 0.0000 |
| scrap_quantity | 0.0000 |
| work_order_number | `WO-2026-0001` |
| part_code | `P-1001` |
| machine_code | `VMC-01` |
| operator_code | `OP-01` |
| job_card_number | NULL |
| operation_code | NULL |
| production_date | NULL |
| start_time / end_time | NULL |
| is_reversal / reversed_from_entry_id | NULL / NULL |
| quality_status | `PENDING` |

Child tables are all **empty** (0 rows): `production_entry_material`, `production_entry_batch`, `production_entry_rejection`, `production_entry_rework`, `production_entry_operator`.

Because there is only one record, all category/percentage analysis below is computed on **n = 1** and is fully representative of the entire current historical set. Recommendations are stated so they extend to future larger datasets.

---

## 1. Correction Decision Register (Summary)

| ID | Issue | Dataset Impact | Risk | Options | Recommended Resolution | Blocks Backfill |
| -- | ----- | -------------- | ---- | ------- | ---------------------- | --------------- |
| D29-01 | **Quantity authority ambiguity** — `process_qty` NULL but `produced_quantity` present (Category B) | 1/1 record (100%) | **BLOCKING** if backfilled on assumption produced==process | A) process-first; B) produced-first; C) explicit resolution algorithm | **C_QUARANTINE**: record is ambiguous → **quarantine**, never auto-backfill. See §2, §3. | **YES** (record 1) |
| D29-02 | Reversal negation edge — reversal uses `process_qty.negate()` only, no `produced` fallback (controller L453/L459-460) | Affects any future reversal of a Category B record | HIGH (wrong/zero mirrored quantity) | Fix reversal to use effective input; or quarantine B records from reversal | Quarantine B records; reversal routine to be aligned with effective-input resolution in the backfill/cutover (future) | YES (until aligned) |
| D29-03 | `produced_quantity` semantic is **total-produced** (good+rejected=100), not alias-of-process, not good-only — proven by live record vs dry-run assumed alias | 1/1 record | HIGH (incorrect quantity history if mis-assumed) | Treat produced as total-produced for B records; treat as alias only for C records | Document matrix §4: **produced_quantity = total output for B; = alias of process_qty for C (code-created).** Consistency rule applied per record, not globally. | YES |
| D29-04 | Missing job_card / operation / production_date on historical record | 1/1 record (job_card & operation & date NULL) | MEDIUM (reconciliation dimension gap) | Coalesce from work_order/route; allow null; quarantine | Mark as legacy-only / non-blocking for output backfill; reconciliation to report dimension as "UNKNOWN" | NO |
| D29-05 | **hours_worked** not consumed by current OEE/labor reporting | 0/0 operator rows today; 1 entity field | LOW | Must represent before backfill / legacy-only / separate detail model | **Separate normalized detail model later** (evidence: OeeDaily is own aggregate). See §6 | NO |
| D29-06 | material/batch/rejection/rework child detail — no inventory write path; read-only (validation) | 0 child rows today | LOW (future traceability) | map to normalized / legacy-only / reference / defer | **Defer to later normalized detail model; preserve legacy rows untouched.** Compatibility matrix §7 | NO |

Register confirmed: **D29-01 (and its derivative D29-02/D29-03 on the same record) block automated backfill; the single record is quarantinable.** If quarantined, the remainder of the (empty) dataset has zero blockers.

---

## 2. Mandatory Decision 1 — Quantity Authority

The instruction forbids assuming `produced_quantity = process_qty` and forbids silently choosing one field as authority.

### 2.1 Category distribution (live, n=1)

| Category | Condition | Records | % | Job Cards | Work Orders | Items | Date Ranges | Sample IDs |
| -------- | --------- | ------- | -- | --------- | ----------- | ----- | ----------- | ---------- |
| A | `process_qty` present, valid (any produced) | 0 | 0% | 0 | 0 | 0 | 0 | — |
| B | `process_qty` NULL, `produced_quantity` present | **1** | **100%** | 0 (job_card NULL) | 1 (`WO-2026-0001`) | 1 (`P-1001`) | 0 (date NULL) | `id=1`, `PE/2026-27/00001` |
| C | Both present and equal | 0 | 0% | 0 | 0 | 0 | 0 | — |
| D | Both present, different | 0 | 0% | 0 | 0 | 0 | 0 | — |
| E | Both NULL | 0 | 0% | 0 | 0 | 0 | 0 | — |
| F | Outputs (`good+rejected+rework+scrap = 100`) exceed selected input authority | 0 | 0% | 0 | 0 | 0 | 0 | — |

### 2.2 Record 1 specific reconciliation

```
produced_quantity  = 100.0000
good  = 95.0000
rejected = 5.0000
rework = 0.0000
scrap = 0.0000
allocated_output = good + rejected + rework + scrap = 100.0000
process_qty       = NULL

If input authority = produced_quantity (=100): WIP = 100 - 100 = 0  (consistent, outputs fully allocated)
If input authority = process_qty (=NULL/0):      WIP = 0 - 100 = -100 → clamped to 0; but input ambiguous
```

Because `process_qty` is NULL, **no non-arbitrary input authority exists for record 1**. The outputs are internally self-consistent (good+rejected=produced=100), but the authoritative input is unrecorded. Per the instruction, this is an **ambiguous record**.

### 2.3 Proposed authority rule (applied per record, not globally)

1. If `process_qty` present and `process_qty >= allocated_output` → **Category A/C: `process_qty` is the authority** (WIP = process_qty − allocated_output, may be ≥ 0). This matches the code create path (L165-166) where both columns equal.
2. If `process_qty` present and `< allocated_output` → **Category F anomaly; QUARANTINE** (over-allocation, would create negative WIP / incorrect history).
3. If `process_qty` NULL but `produced_quality` present and `produced_quantity >= allocated_output` → **Category B: produced_quantity is the only recorded quantity — but authority is NOT silently assumed; the record is a candidate for QUARANTINE + explicit review** because the code create path never leaves process_qty NULL (see §4). Only explicit reviewer sign-off may treat produced as authority.
4. If both NULL or both present-and-different → **QUARANTINE** (E = no input; D = conflicting input).
5. No ambiguous record is auto-backfilled (see §13 quarantine flow).

---

## 3. Mandatory Decision 2 — Canonical Input Quantity Rule (proposal only, NOT implemented)

Three candidate strategies below, each with the live-record outcome.

### Option A — `process_qty` First
```
Input = process_qty when present; fallback produced_quantity when process_qty missing; else 0.
```
- **Affected records:** 1/1 would fall back to produced→100.
- **Reconciliation:** 100 − 100 = 0 ✓ (self-consistent).
- **Data-loss risk:** None on this record.
- **Ambiguity risk:** **HIGH** — silently promotes `produced_quantity` to input authority for B records, which the instruction forbids assuming.
- **Compatibility current code:** HIGH for C records (matches create L153/L165); but reversal (L453) and validation already use exactly this fallback => Option A is effectively what validation does today.
- **Compatibility future normalized model:** input semantic would be "produced-as-input", which conflicts with WIP definition (input should be started qty, not total output).
- **Backfill risk:** MEDIUM-HIGH — acceptable only if reviewer explicitly confirms produced==process for B records; NOT recommended as automatic default.

### Option B — `produced_quantity` First
```
Input = produced_quantity when present; fallback process_qty when produced missing; else 0.
```
- **Affected records:** 1/1 → produced=100 as input.
- **Reconciliation:** 100 − 100 = 0 ✓.
- **Data-loss risk:** Low on this record; but treats produced (an OUTPUT-leaning total) as INPUT, distorting WIP semantics for any record where produced is total-output rather than started-in.
- **Ambiguity risk:** HIGH — unconditionally inverts semantics.
- **Compatibility current code:** LOW — create/update/reversal/validation all use process-first fallback (L153/L273/L453); Option B would disagree with existing code.
- **Compatibility future normalized model:** POOR (same WIP distortion as A but without A's code tie-in).
- **Backfill risk:** HIGH — reverses today's process-first convention.

### Option C — Explicit Legacy Quantity Resolution Algorithm (candidate)
```
IF process_qty IS NOT NULL AND process_qty >= allocated_output  -> input = process_qty
ELSE IF produced_quantity IS NOT NULL AND produced_quantity >= allocated_output -> input = produced_quantity
ELSE -> INPUT AUTHORITY AMBIGUOUS (quarantine; no auto-backfill)
```
- **Affected records:** process_qty NULL → first clause false; produced=100 ≥ 100 → second clause true → input=100. Record would resolve to 100 under C.
- **Reconciliation:** 100 − 100 = 0 ✓.
- **Data-loss risk:** None on this record.
- **Ambiguity risk:** LOW for the algorithm itself (explicit, deterministic, guardrails). Residual ambiguity remains **only if reviewer has not sanctioned produced-as-input for B** — the algorithm does not auto-claim authority; ambiguous branch is explicit.
- **Compatibility current code:** HIGH alignment — mirrors the effective-input resolution already in validation (V-05/V-07/L181/L189) and matches create for C records; the algorithm's produced-fallback is exactly the fallback the code uses.
- **Compatibility future normalized model:** Medium — introduces an explicit "resolve then project" step; the normalized input = resolved input, resurrecting the started-quantity semantic that WIP needs.
- **Backfill risk:** LOW, PROVIDED the resolved record (1) is still routed through explicit review due to its B nature (per §2.3 item 3 quarantine).

### 3.1 Recommendation

Do **not** globally recommend any single automatic rule.

- For Category **C** records (code-created, both equal): `Input = process_qty` (identical to produced) — safe, matches code.
- For Category **B** records (the live record): **the algorithm (Option C) is the correct *shape***, but the record is the dataset's only evidence of B and must be **explicitly reviewed/sanctioned** before being backfilled. Until then it remains ambiguous and is **quarantined** (it is the only record).
- Recommendation: adopt **Option C as the resolution algorithm**, with B/E/D/F routing to quarantine + explicit reviewer sign-off. This satisfies "do not silently assume one field as authority."

---

## 4. Mandatory Decision 3 — `produced_quantity` Semantic Analysis

Evidence collected from code:

- Create (controller L153-166): `qty = process_qty ?? produced_quantity ?? 0`; then `setProducedQuantity(qty)` and `setProcessQty(qty)`. → both columns set equal; `produced` is written as a copy of effective process. So for code-created records, produced is an **alias of process_qty (Category C)**.
- Update (L273-275): identical alias behavior.
- Reversal (L453-460): negates `process_qty` into BOTH `produced` and `process` of the reversal row; no produced fallback (edge for B records).
- Validation (V-05): effective `process_qty = process_qty ?? produced_quantity`; enforces `> 0`. V-07: `good+rejected+rework+scrap <= process_qty` (effective). So validation treats produced as a fallback input, never as good-only.
- Reports/API (list GET returns entity; row map includes `producedQuantity` at L979): both fields exposed verbatim.
- Frontend (ProductionEntryScreen.tsx): form bound to `processQty ?? producedQuantity` (L516); list shows `r.processQty || r.producedQuantity` (L659) → produced is a display fallback for process.
- Historical data (record 1): `produced=100`, `good=95`, `rejected=5`; `process_qty=NULL`. `100 = 95 + 5 = good + rejected` → produced here is **total produced output**, NOT an alias of process (process is null) and NOT good-only.

### 4.1 Semantic matrix

| Field | Code Meaning | Validation Meaning | Historical Data Meaning | Report Meaning | Proposed Backfill Meaning |
| ----- | ------------ | ------------------ | ----------------------- | -------------- | ------------------------- |
| `process_qty` | Effective in-quantity; equal to produced after create (alias target) | Input authority (V-05, V-07, V-18/sequence) | NULL on record 1 (B) | Input/process quantity | **Primary input authority when present and ≥ allocated output** (Category A/C) |
| `produced_quantity` | Copy of effective process (alias of process_qty) on create | Fallback input when process NULL (V-05/V-18) | **Total output = good+rejected = 100** (NOT alias, NOT good-only) | Display fallback for process | **Input only when process NULL AND produced ≥ allocated output AND explicitly reviewed**; else documented as total-output. **Never silently treated as process alias.** |
| `good_quantity` | Accepted output; auto-derived = process − (rework+reject) when omitted (L160-162) | Must be ≤ process; part of allocated sum | 95 | Accepted/qty | **Derived output / good output ≥ 0** |
| `rejected_quantity` | Rejected output | ≤ process; == Σ rejection-reason quantities (V-08); reason mandatory when > 0 | 5 | Rejected/output | **Derived output / rejected output = reason detail** |
| `rework_quantity` | Rework output | ≤ process; rework reason mandatory (V-09) | 0 | Rework/output | **Derived output / rework output ≥ 0** |
| `scrap_quantity` | Scrap output | ≤ process; part of allocated sum | 0 | Scrap/output | **Derived output / scrap output ≥ 0** |

No code is changed in producing this matrix (read-only analysis).

---

## 5. Mandatory Decision 4 — Historical Data Quality Classification

Live scan (n=1) findings:

| Check | Result | Count | Classification |
| ----- | ------ | ----- | -------------- |
| NULL `process_qty` | present on record 1 | 1 | **HIGH** (drives D29-01 authority ambiguity; quarantine) |
| NULL `produced_quantity` | none | 0 | PASS |
| quantity mismatch (process ≠ produced, both present) | none | 0 | PASS (no C/D mix present) |
| negative quantities (any of 6 qty fields) | none | 0 | PASS |
| allocated output > input | none (100 ≤ 100) | 0 | PASS |
| missing job card | job_card_number NULL | 1 | MEDIUM (dimension gap; coalesce or "UNKNOWN"; non-blocking for output backfill) |
| missing work order | present (`WO-2026-0001`) | 0 | PASS |
| missing operation | operation_code NULL | 1 | MEDIUM (dimension gap) |
| missing production date | production_date NULL | 1 | MEDIUM (dimension gap) |
| duplicate entry numbers | none | 0 | PASS (0 dup) |
| broken reversal links | none (0 reversal rows, 0 REVERSED origins) | 0 | PASS |

**BLOCKING rule:** A finding is BLOCKING if proceeding with backfill could create an incorrect quantity history. The **NULL `process_qty` on record 1** is HIGH and, combined with the un-sanctioned produced-as-input ambiguity, is **BLOCKING for that record** (it is the only record). All other checks are PASS/non-blocking; no second BLOCKING issue exists.

Net: 1 BLOCKING (the single Category B record, via authority ambiguity); 3 MEDIUM (missing job_card/operation/date — non-blocking, recordable as UNKNOWN).

---

## 6. Mandatory Decision 5 — OEE / Operator Hours

Evidence:

- `production_entry_operator.hours_worked` is declared in `ProductionEntryOperator.java:33-34` and sunk to `BigDecimal.ZERO` in its `@PrePersist` (L43). It is read by **no** OEE/labor/report service.
- OEE is a **separate aggregate**: `OeeDaily` (own columns `planned_time_min`, `run_time_min`, `downtime_min`, `ideal_cycle_time_sec`, `good_qty`, `total_qty`, availability/performance/quality/oee ratios) persisted to its own `oee_daily` table and populated via `OeeController` POST — **not derived from `production_entry` or `hours_worked`**.
- `OeeDailyRepository`/`OeeController` do not touch `production_entry_operator`. No code reads `hours_worked` for OEE, labor, machine utilization, operator productivity, or production cost today.

### Classification (exactly one)

> **3. Can be represented through a separate normalized detail model later.**

Rationale: OEE already lives in its own model; `hours_worked` is currently unused for OEE/labor. There is no active consumer that requires it before backfill. It should be preserved in legacy and optionally carried into a future normalized operator/labor detail model. It is **not** a backfill blocker.

---

## 7. Mandatory Decision 6 — Material / Batch / Reason Detail

Child tables are currently **empty (0 rows)** on the live DB; evidence below is about how the code treats them.

| Child | Code usage (evidence) | Inventory write? | Classification | Traceability preserved |
| ----- | --------------------- | ---------------- | -------------- | ---------------------- |
| `production_entry_material` | Read in validation V-19 (consumed ≤ available); read in entity relation. **No StockService/StockBalanceRepository/ProductionStockBoundary consumption in production path** | No | **Deferred to later normalized detail model; preserved in legacy untouched.** | YES (legacy rows retained; normalized reference via entry_id/session linkage) |
| `production_entry_batch` | Read in validation V-20 (allocated total must equal good OR process). No inventory write | No | **Deferred; preserved in legacy.** Linked through normalized reference (entry_id) | YES |
| `production_entry_rejection` | `ProductionNormalizedEventService` reads first reason (reason_code/description) → mapped to output/event reason; validation V-08 enforces Σ reason quantities == rejected | No | **Linked through normalized reference (entry_id); per-reason detail deferred.** No loss: reason_code already carried as an event attribute | YES |
| `production_entry_rework` | `ProductionNormalizedEventService` reads first reason (V-09 rework reason mandatory); mapped to rework event reason | No | **Linked through normalized reference; per-reason detail deferred** | YES |

No child row currently exists, so there is no existing traceability to lose. For future rows: keep the legacy child rows authoritative for full detail; carry the **first/primary reason code** into events as today; defer full multi-reason, material consumption, and batch allocation arrays to a dedicated normalized detail model (later phase). **Nothing is silently dropped.**

---

## 8. Mandatory Decision 7 — Reversal Semantics Confirmation

Current normalized model (from P3 + DOCUMENT_27/28): reversal is a compensating reversed session; original preserved untouched; mirror keyed to the reversal's own `entry_number`.

Validation against the model:

| Case | Historical evidence | Valid? | Notes |
| ---- | ------------------- | ------ | ----- |
| Original POSTED | n/a (0 POSTED history rows today) | Valid by design | Original event = COMPLETED |
| Reversal record | 0 reversal rows today; reversal creates negated row (L453-465) | Valid | Reversal mirror = REVERSED/CANCELLED |
| Partial output | good=95, rework/reject/scrap≥0 | Valid | WIP = input − good − rejected − rework − scrap |
| Rejected output | rejected=5 on record 1 | Valid | carried as rejected output |
| Rework output | rework=0 | Valid | same handling |
| Scrap output | scrap=0 | Valid | same handling |

The mapping **`Original Event = COMPLETED; Reversal Mirror = REVERSED/CANCELLED`** is semantically correct for the reconciled cases and the reversal mirror carries negated quantities (L449-460), preserving origin linkage via `reversed_from_entry_id`.

**One correction identified (does not require implementation here):** reversal uses `process_qty.negate()` with **no `produced_quantity` fallback** (L453/L459). For a Category B record (`process_qty` NULL), a reversal would write `produced/process = 0` instead of `-100`, producing a wrong mirror. This is why Category B records are quarantined from automated reversal/backfill until the reversal routine is aligned to the effective-input resolution (Option C) — captured as D29-02.

**Conclusion:** No change to the normalized model is needed; the model is correct. Quarantine only papers over the reversal edge until alignment. Implementation is not changed in this document.

---

## 9. Backfill Readiness Rule (single result)

**Result: `B — READY WITH CONTROLLED EXCEPTIONS`**

Rationale:
- Quantity authority ambiguity **does** remain for **one** Category B record (`PE/2026-27/00001`) — `process_qty` NULL. So **A** (ready with no ambiguity) is not claimable.
- The ambiguity is **exactly one, fully identified, and explicitly quarantinable** (no auto-backfill; reviewed manually). This satisfies the B condition, not C (C requires ambiguity that cannot be quarantined; here the single ambiguous record is cleanly isolatable).
- With the single record quarantined, the effective remaining automated-backfill volume is zero and the rest of the (empty) dataset has no blockers.

**(The reviewer may override to A only after explicitly sanctioning produced-as-input for record 1; otherwise B with quarantine stands.)**

---

## 10. Quarantine Mechanism (proposed, not executed)

```
Historical Production Entry (all production_entry rows)
        ↓
Quantity Authority Analysis (this document §2)
        ↓
Valid (A/C: process_qty present & >= allocated output)   Ambiguous (B/E/D/F)
        ↓                                                 ↓
  AUTO BACKFILL (empty today)                        QUARANTINE
                                                       ↓
                                                Manual Review (entry PE/2026-27/00001)
                                                       ↓
                                                Explicit Resolution (input agreed = 100, record sanctioned)
                                                       ↓
                                              Controlled Backfill (post-approval only)
```

Guarantee: **no ambiguous record is automatically backfilled.** `PE/2026-27/00001` is the sole quarantined record.

---

## 11. STOP Gate

After this document is created:

- **STOP.**
- No actual backfill.
- No insert of historical normalized events.
- No change to normalized authority / no authority flip enabling.
- No Production Entry behavior change.
- No inventory postings.
- No modification of legacy `production_entry*` data.
- No code change arising from §3/§6/§7/§8 (proposals only).

Wait for the reviewer's explicit decision on the correction items (register §1) before any controlled backfill.

---

## 12. Change Log
- Created DOCUMENT_29 with 7 decisions, correction register, quarantine flow, and Readiness **B — READY WITH CONTROLLED EXCEPTIONS**.
- No code, schema, data, flag, or inventory files touched.