# DOCUMENT_30 — P3 Architecture Gate Review (Read-Only)

**Phase:** P3 Architecture Gate — review of DOCUMENT_29 and the actual codebase/database.
**Scope:** Read-only review and report. **No source change, no migration, no backfill, no data write, no authority flip, no inventory change.**
**Evidence base:** live DB `zyger_erp` (localhost:5432, user `zyger`, read-only) + backend source (referenced by file:line).
**Input documents:** DOCUMENT_17…DOCUMENT_29 (authoritative set), primarily DOCUMENT_29.

---

## 1. Executive Decision

> ## **B — READY WITH REQUIRED CORRECTIONS**

The P3.1 dry-run and DOCUMENT_29 analysis are **valid and substantially correct**, and the required corrections are **identified, bounded (exactly one ambiguous record), and quarantinable**. The decision is **NOT** `C — NOT READY`: the ambiguity is cleanly isolatable and the rest of the (empty finalized) dataset carries no blocker. The decision is **NOT** `A`: a real data-semantic exception remains and must be explicitly resolved/–quarantined before any automated backfill.

Two additional **required corrections surfaced by this cross-check that DOCUMENT_29 does not fully close** are folded into the decision:

- **RC-1 — Projection input-authority gap:** `ProductionNormalizedEventService` computes `available_input` from `process_qty` **only** (no `produced_quantity` fallback — L156, L172). DOCUMENT_29 §4 states produced is a "fallback input" in code, but that fallback exists **only in the validation service, not in the normalized projection**. A Category-B record backfilled through the projection would record `available_input=0`, `good=95-still-emitted`, `rejected=5-emitted`, `wip=0`, i.e. the input (=100) would be silently lost even though outputs survive.
- **RC-2 — Backfill progress/resume not implemented and live table absent:** `prod_backfill_progress` is defined in the codebase V4 SQL but **does not exist in the live DB** (verified via information_schema: 3 prod event tables exist and are empty; `prod_backfill_progress` count = 0), **no `ProdBackfillProgress` entity/repository exists**, and **no code references the table**. The controlled-backfill proposal (DOC_28/DOC_29) relies on progress tracking + resume that has no live schema/implementation.

---

## 2. DOCUMENT 29 Validation Matrix

| Decision | Document Claim | Actual Code Evidence | Actual DB Evidence | Status | Risk | Recommendation |
| -------- | -------------- | -------------------- | ------------------ | ------ | ---- | -------------- |
| **D1 — Authority per record** | Authority must be per-record; no global assumption | Create/update set both `process_qty` and `produced_quantity` equal (ProductionController L153-166, L273-275) → C-category rows | Live `PE/2026-27/00001`: `process_qty=NULL, produced=100` → Category B | **CONFIRMED** | High | Adopt per-record classification (§3); quarantine B. |
| **D2 — Input resolution (Option C shape)** | Option C algorithm structurally aligns with code; B record needs explicit review | Validation V-05/V-07/V-18 use `process_qty ?? produced_quantity` fallback (ProductionEntryValidationService L48-49, L181, L188-189) | Record B: O_C resolves input=100; **but projection path lacks the fallback (RC-1)** | **PARTIALLY CONFIRMED** | High | Reconcile projection input authority with validation fallback before backfill. |
| **D3 — produced semantics** | produced = total-output for B; alias for C (not global) | Create writes produced=process (alias) for code rows (L165-166); **projection uses process only (RC-1)** | Record B: produced=100 = good(95)+rejected(5) = total output | **CONFIRMED (data); code split** | High | Treat produced per-record; fix projection input source. |
| **D4 — Data quality** | 1 BLOCKING (NULL process_qty) + 3 MEDIUM (job/operation/date); no dup/neg/over-alloc/broken-reversal | Reversal (L453) uses `process_qty.negate()` only (no produced fallback) — D29-02 real | 1 B record; job_card/operation/prod_date NULL; 0 dups, 0 neg, 0 over-alloc, 0 orphan | **CONFIRMED** | High | Quarantine B; record NULL dims as UNKNOWN. |
| **D5 — OEE / hours_worked** | Separate aggregate; defer to later detail model; non-blocker | `OeeDaily`/`OeeController`/`OeeDailyRepository` own `oee_daily` table; **no code reads `hours_worked`** (only entity + frontend modal) | 0 `production_entry_operator` rows | **CONFIRMED** | Low | Legacy-preserve; defer. Non-blocker. |
| **D6 — material/batch/reason** | Deferred to later detail model; no inventory write; preserved legacy | Read only in validation V-19/V-20 + first-reason fold in `ProductionNormalizedEventService` (L286-300); no StockService call | 0 child rows (m/b/rej/rw/op) | **CONFIRMED** | Low | Legacy-preserve; carry primary reason; defer arrays. Non-blocker. |
| **D7 — Reversal semantics** | Original COMPLETED + mirror CANCELLED correct; edge: reversal uses process only | Reversal mirror = CANCELLED/REVERSED (normalized L118-128); reversal row negated + `reversed_from_entry_id` (controller L449-463); **no produced fallback in reversal** (L453) | 0 reversal rows live; original not deleted (legacy) | **CONFIRMED with edge** | High | Keep model; fix/​quarantine the no-fallback reversal edge for B. |

**Net:** DOCUMENT_29's seven decisions are technically sound. Two **code-side gaps** (RC-1 projection input source; RC-2 progress/resume) are not fully captured and are added as required corrections.

---

## 3. Data Semantic Classification

No global assumption. Categories are **input-authority classes** determined per record.

| Category | Legacy predicate | Input authority | Normalized mapping | Backfill eligibility | Quarantine rule |
| -------- | ---------------- | --------------- | ------------------ | -------------------- | --------------- |
| **A** | `process_qty` present (any produced/outputs) | `process_qty` | session.available_input = process_qty | ELIGIBLE | none |
| **B** | `process_qty` NULL, `produced_quantity` present | Undetermined (produced is total-output, not certified input) | **Ambiguous** — DO NOT auto-map input | QUARANTINE | Explicit review before any auto backfill |
| **C** | both present and equal | `process_qty` (= produced) | session.available_input = process_qty | ELIGIBLE | Rule of thumb: `produced == process`; else downgrade |
| **D** | both present and different | Conflicting | Ambiguous | BLOCK | Manual reconciliation |
| **E** | both NULL but outputs present | No input | Ambiguous (input lost) | QUARANTINE | Manual/source-input lookup |
| **F** | outputs > selected input authority | Input under-allocates | Over-allocation → negative WIP history | BLOCK | Manual correction of input/output |

Outcome on the live set (n=1): **record 1 → Category B → QUARANTINE.**

---

## 4. Backfill Eligibility Rules

- **ELIGIBLE** — Category A/C (and confirmed post-review resolution of B). Can be processed by the automated backfill job.
- **QUARANTINE** — Category B (pending explicit reviewer sanction), E, and any record flagged `INPUT-AUTHORITY-NULL`/`PRODUCED-DIFF` by the dry-run. Excluded from automated backfill; routed to a manual review queue; resolved input recorded; only then processed.
- **BLOCK** — Category D (conflicting inputs) and F (over-allocation). Not automatically resolved; requires architecture/domain decision first.

**Live record evaluation:** `PE/2026-27/00001` (status REJECTED, process_qty NULL, produced=100=good+rejected) → **Category B → QUARANTINE.** It must not silently block the (empty) eligible population; it must not be auto-backfilled.

---

## 5. Quantity Reconciliation

The reconciliation must respect the real per-record semantics — the formula is **authority-conditional**, never frozen to one field.

For a finalized, eligible record with input authority `I` (per §3):
```
allocated_output = good + rejected + rework + scrap
WIP = I − allocated_output        (I = process_qty for A/C; resolved input for B after review)
WIP ≥ 0  required
produced_quantity = total produced output (good+rejected+rework+scrap)?? PROVABLE ONLY PER RECORD
                     - Category C (code-created): produced == process (alias)
                     - Category B (live): produced == total output (NOT alias)
```

**Record 1 reconciliation (live):**
```
I (input) = ? (process_qty NULL → not selectable) [QUARANTINE until reviewed]
good=95, rejected=5, rework=0, scrap=0
allocated_output = 100
produced_quantity = 100 (= good + rejected = total produced output)
```

Critical correction — **the dry-run's reconciliation is inconsistent with the corrected semantics:** `ProductionBackfillDryRunService`:
- `simulateEntry` sets `simulatedAvailableInput = process` (L168) and `computeWip(process, ...)` (L152, L179-183) → input authority frozen to `process_qty`, ignoring the produced total-output evidence it itself surfaces;
- the loss ledger (L385) labels `produced_quantity` as "**alias of process_qty (P3-04); verified, never good**", which **contradicts** record 1 where produced=total-output, not an alias.

The dry-run correctly *flags* the contradiction (INPUT-AUTHORITY-NULL, PRODUCED-DIFF) but its **reconciliation math and loss-ledger text still hard-code the process alias**, so the dry-run report (DOCUMENT_28) and DOCUMENT_29 §4 are not fully aligned. Reconciliation must adopt the authority-conditional formula from DOCUMENT_29 §2/§5 above (input only from the per-record authority; produced NEVER blanket-assumed an alias).

---

## 6. Reversal Safety

Verified that reversal in the current design **cannot** create duplicate events or duplicate inventory:

- **Original preserved:** reversal does not delete the original; it sets `status=REVERSED` + `reversal_reason` (controller L484-486); legacy row remains.
- **Reversal traceable:** a new row with `is_reversal=true`, `reversed_from_entry_id=<original.id>`, `entry_number=PE-REV…` (L431-462).
- **Normalized mirrors idempotent / no event duplication:** both original and reversal project under **UNIQUE natural keys** — session `UNIQUE(entry_number)` (V4), operation `UNIQUE(session_id, subjob, op, seq)`, output `UNIQUE(session_id, operation_event_id, output_type, item_code, location)`. Replay absorbs `DataIntegrityViolationException` (ProductionNormalizedEventService L143-145, L236-240, L269-271). Original stays COMPLETED; reversal is a separate negated CANCELLED mirror (L118-128) — **no event duplication**.
- **No historical deletion:** nothing deletes `production_entry` or event rows on reversal.
- **EDGE (D29-02, confirmed):** reversal computes `negProcess = process_qty.negate()` with **no produced fallback** (controller L453/L459). Reversing Category-B record 1 would write reversal `produced/process = 0` instead of `-100` → an incorrect mirror. **This is why B records are quarantined from automated reversal/backfill** until the reversal routine adopts the per-record effective input.

**No inventory duplication:** reversal touches no stock; normalized projection has zero StockService coupling (see §7). StockService's own docNo+docType idempotency guard sits in the Job-Card path, untouched.

---

## 7. Inventory Safety

Proof that the proposed (and current) normalized/backfill path can never post inventory:

- **`ProductionNormalizedEventService` has zero stock coupling.** It depends only on `ProductionNormalizedOpsProperties`, `ProdExecutionSessionRepository`, `ProdOperationEventRepository`, `ProdOutputEventRepository` (L60-63). The sole "Stock" string is a javadoc statement (verified by grep=1, a comment). No `StockService`, no `StockBalanceRepository`, no `ProductionStockBoundary`, no direct stock SQL.
- **Dry-run is read-only + isolated:** `ProductionBackfillDryRunService` depends only on `ProductionEntryRepository` + `JdbcTemplate` (read-only `SELECT`); enforces `@Transactional(readOnly=true)`; asserts inventory isolation via stable `stock_ledger`/`stock_balance` counts (L488-497). Live baseline: `stock_ledger=41`, `stock_balance=17` (unchanged).
- **`ProductionStockBoundary` is the ONLY sanctioned production→stock bridge**, delegating solely to `StockService.recordStockIn(...)` for the **Job-Card completion** path (L42-48). It is never invoked from event projection/backfill.
- **Design rule honored:** Production → `ProductionStockBoundary` → `StockService` → stock_ledger+stock_balance. Normalized events and backfill add **zero** inventory writes.

✓ Never calls StockService · ✓ never calls ProductionStockBoundary · ✓ never updates stock_balance · ✓ never inserts stock_ledger.

---

## 8. Controlled Backfill Proposal

Recommended shape if approved (per DOCUMENT_27 Option B + DOCUMENT_29 quarantine). **Not implemented.**

- **New files (proposed):** `ProductionBackfillService` (job), `ProductionBackfillProgressStore` (progress/resume), `ProdBackfillProgress` entity + repo (aligns V4 `prod_backfill_progress` — **see RC-2: table/entity missing live/from code**), quarantine resolution DTO/adapter, backfill command.
- **Modified files:** `ProductionNormalizedEventService` — add per-record input-authority resolution (process-first with validated produced fallback / explicit quarantine) so input ≠ 0 for resolved B (see RC-1); no stock coupling introduced.
- **Database writes:** insert `prod_execution_session`/`prod_operation_event`/`prod_output_event` (natural-key idempotent); insert `prod_backfill_progress` rows; **none** to `production_entry*`, `stock_ledger`, `stock_balance`.
- **Transaction boundaries:** one backfill **unit per entry** (session+operation+outputs+progress) committed as a single transaction; failure rolls back that entry only; progress updated in same transaction.
- **Batch strategy:** process entries in pages by `id` watermark (server-side cursor), not a bulk single transaction (avoids lock/rollback blast radius).
- **Idempotency strategy:** rely on natural-key UNIQUE constraints (session/op/output); a re-run of an already-inserted entry is a no-op via `saveAndFlush` + `DataIntegrityViolationException` absorb; check `prod_execution_session` before insert for skip.
- **Progress tracking:** upsert `prod_backfill_progress` per job_card/`last_entry_id`/`processed`/`status`; **RC-2: this table + entity + repo must first be materialized** (absent today).
- **Resume strategy:** on restart, load last `prod_backfill_progress`, resume from `last_entry_id` watermark; idempotent skip of already-done entries.
- **Quarantine handling:** classifier runs first; quarantine table/set holds Category B/E/D/F + dry-run findings; automated job **skips** quarantined entries; a separate manual-resolution flow promotes resolved entries to eligible with a recorded authority + approver.
- **Failure handling:** per-entry try/catch; on failure record `status=FAILED` in progress, roll back that entry, continue; never partial-commit an entry's session/op/outputs.
- **Rollback strategy:** entry-level rollback via the transaction; no global rollback; globally safe because backfill only *adds* event rows and never mutates legacy/inventory.

---

## 9. Test Plan

- **Unit tests:** input-authority classifier (A/B/C/D/E/F); WIP formula per authority; produced-alias vs total-output; dry-run reconciliation vs corrected formula.
- **Integration tests:** backfill of eligible A/C records → correct session/op/output rows; live-record-equivalent B record → recorded as quarantine, not backfilled.
- **Idempotency tests:** re-run backfill on same entry → no duplicate session/op/output (natural-key); progress not double-incremented.
- **Restart/resume tests:** kill after entry N; resume from watermark; N processed once, subsequent entries processed.
- **Concurrency tests:** two workers/threads backfilling overlapping entries → zero duplicates (UNIQUE + absorb).
- **Quarantine tests:** B/E/D/F records excluded by classifier; manual-resolution flow promotes correctly; resolved authority persisted.
- **Reversal tests:** reverse an eligible POSTED entry → original COMPLETED preserved, CANCELLED mirror row, `reversed_from_entry_id` set, no event duplication, no stock; reverse of Category-B (quarantined) blocked until resolution (covers D29-02).
- **Zero-inventory tests:** assert `stock_ledger` and `stock_balance` counts byte-unchanged after full backfill run; assert backfill/event service has no StockService/StockBalanceRepository/ProductionStockBoundary dependency (bytecode/DI graph check; extend the existing inventory`isolationStaticScan`).
- **Quantity-reconciliation tests:** good/rejected/rework/scrap vs input authority per category; `WIP = I − outputs ≥ 0`; produced==total-output (B) vs produced==process (C).
- **Mixed-semantic-category tests:** a dataset spanning A/B/C/D/E/F validates that no global rule leaks and quarantine/BLOCK behave independently.

---

## 10. Final Stop Gate

> ## **REQUIRES ARCHITECTURE CORRECTION**

Decision detail:
- **Base: `B — READY WITH REQUIRED CORRECTIONS`** (record-1 ambiguity + quarantine strategy are acceptable).
- **Additional required corrections before any automated backfill:**
  1. **RC-1** — projection input authority must adopt the per-record resolver (process-first with validated produced fallback / explicit quarantine) so a resolved Category-B record projects a non-zero `available_input`; reconcile the dry-run reconciliation + loss-ledger text with DOCUMENT_29 §4/§5 (no hard-coded "produced == alias").
  2. **RC-2** — materialize `prod_backfill_progress` (add entity/repository + live schema alignment; it exists today only as V4 SQL and **is absent from the live DB and unreferenced by any code**).
  3. **D29-02** — reversal negation must use the per-record effective input (not `process_qty` alone) before B records may be reversed.
  4. **Quarantine execution** — the quarantine store + manual-resolution promotion flow are not yet implemented.

Until these are closed and the reviewer explicitly sanctions the Category-B resolution, **no actual backfill, no authority flip, no feature-flag enable, no schema/migration execution, no Production Entry behavior change, no inventory change, no legacy-data modification** — per the absolute prohibitions.

**STOPPED.** Awaiting reviewer approval.

---

## 12. Change Log
- Created DOCUMENT_30: read-only architecture-gate review of DOCUMENT_29 vs live code + DB.
- No source, schema, migration, data, flag, API, or inventory files modified.