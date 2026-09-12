# DOCUMENT_25 — P3 CONDITION CLOSURE & IMPLEMENTATION APPROVAL

**Status:** READ-ONLY. No source/migration/DB/entity/API/frontend changes.
**Prerequisite:** DOCUMENT_24 (P3 Final Architecture Gate Report — recommendation B).
**Purpose:** Convert DOCUMENT_24's 7 conditions into an explicit implementation gate, validate architecture rules A–G, and produce the final approval matrix.
**Ends with exactly one recommendation. STOP.**

---

## PART 1 — 7-CONDITION CLOSURE REVIEW

For each condition (from DOCUMENT_24): Condition ID · Exact statement · Why it exists · Risk if unresolved · Codebase component affected · Proposed approach · Files/tables/APIs affected · Test proving satisfaction · Rollback · Classification.

---

### CONDITION 1 — Single-transaction event derivation

**Exact statement:** *"Events must be derived inside the same transaction as the legacy write (never a separate post-commit async write that could separate legacy and events), OR an equivalent out-of-band re-derivation with documented reconciliation must be adopted."*

1. **Why it exists:** Prevents the "legacy committed, events lost" partial-failure class that would break the future cutover.
2. **Risk if unresolved:** Event rows missing/inconsistent vs legacy → broken operation-level reads, backfill divergence, cutover distrust.
3. **Codebase component affected:** `ProductionController.createProductionEntry`/`productionEntryAction` (both `@Transactional`); new `ProductionNormalizedEventService`.
4. **Proposed approach:** Insert event projection calls **inside the existing `@Transactional` method**, after `productionEntries.save`/before return, using the already-validated in-memory aggregate. No async/`@TransactionalEventListener(AFTER_COMMIT)` for the write path.
5. **Files/tables/APIs affected:** `ProductionController`, new `ProductionNormalizedEventService`, `prod_execution_session`/`_operation_event`/`_output_event`.
6. **Test:** Transaction-rollback test: force a throw after legacy save ⇒ assert legacy **and** events **and** posting all absent.
7. **Rollback:** N/A to code change (rollback = revert the projection insertion); data-wise, undo is a single TX rollback with no partial state.
8. **Classification:** **MUST RESOLVE BEFORE P3** (design invariant for the whole model).

---

### CONDITION 2 — Reuse existing idempotency guard

**Exact statement:** *"Reuse the existing `X-Idempotency-Key`/`PostingIdempotencyKey` guard — do not introduce a second idempotency mechanism."*

1. **Why it exists:** One idempotency mechanism = one source of truth for retry/dedup; a second mechanism risks divergence and duplicate posting.
2. **Risk if unresolved:** Two guards disagree; retry slips through one of them → duplicate quantities and duplicate stock.
3. **Codebase component affected:** `productionEntryAction` POST guard (L310–321, 374–383), `PostingIdempotencyKeyRepository`, `PostingIdempotencyKey`.
4. **Proposed approach:** Extend the existing guard so a SUCCESS idempotency key also short-circuits event emission (events only emitted on first pass). Reuse the same header + table; no new idempotency table for event writes (event uniqueness uses natural keys, but the retry gate is the same POST key).
5. **Files/tables/APIs affected:** `ProductionController` (POST), `PostingIdempotencyKeyRepository` (read), new event service (called only on first pass).
6. **Test:** Duplicate `X-Idempotency-Key` POST → single legacy *, single event set, single posting.
7. **Rollback:** flag/config off; existing guard untouched as today.
8. **Classification:** **MUST RESOLVE BEFORE P3** (dedup authority).

---

### CONDITION 3 — Reconciliation zero-drift gate before cutover

**Exact statement:** *"The reconciliation zero-drift gate (§3/§9 SQL, 9 scenarios, §11) must pass on a representative production-data snapshot BEFORE cutover; any scenario drift blocks cutover."*

1. **Why it exists:** Cutover to events as authoritative is unsafe if the two models disagree on quantities.
2. **Risk if unresolved:** Silent quantity drift across legacy↔events; erroneous reports/stock belief.
3. **Codebase component affected:** `production_entry*` (read-only), new `ProductionQuantityReconciliationService`; reports.
4. **Proposed approach:** A reconciliation job (explicit, not startup) that runs the §9 SQL over a snapshot; publish PASS/FAIL; cutover gated on 0-row drift.
5. **Files/tables/APIs affected:** add `prod_backfill_progress`/recon-report read; new reconciliation service; no legacy mutation.
6. **Test:** Reconciliation tests per §3 scenarios + zero-drift SQL returning 0 rows on seeded data.
7. **Rollback:** recon is read-only; no rollback needed beyond not flipping the flag.
8. **Classification:** **MUST RESOLVE BEFORE P3** (cutover gate). Runs during P3, but is a **hard precondition to flip the flag to authoritativeness**.

---

### CONDITION 4 — `prod_output_event` never calls StockService

**Exact statement:** *"`prod_output_event` must never invoke `StockService`; a test asserts exactly one posting per POST."*

1. **Why it exists:** Guarantees events are execution/mirror records, not a second stock-writing path (Rule C).
2. **Risk if unresolved:** Direct/duplicate stock postings from event code → inventory corruption.
3. **Codebase component affected:** `prod_output_event` (writers), `ProductionNormalizedEventService`, `ProductionStockBoundary`, `StockService`.
4. **Proposed approach:** Event services inject **no** `StockService`/`StockBalanceRepository`; posting stays only in `ProductionEntryAction POST/REVERSE` → `ProductionStockBoundary`. Add a static scan gate (extend P2's stock-write scan) to fail CI if event classes reference stock.
5. **Files/tables/APIs affected:** `ProductionNormalizedEventService` (no stock dep), lint/scan config.
6. **Test:** Inventory non-duplication test: `StockService` invoked exactly once per POST; zero direct stock writes from event code.
7. **Rollback:** scan/config off; posting behavior unchanged.
8. **Classification:** **MUST RESOLVE BEFORE P3** (Rule C hard gate).

---

### CONDITION 5 — Backfill additive-only with its own marker

**Exact statement:** *"Backfill stays additive-only with its own progress marker; never mutates legacy rows."*

1. **Why it exists:** Legacy history must remain untouched and reversible (Rule G).
2. **Risk if unresolved:** In-place legacy mutation → irreversible data change, history loss, audit break.
3. **Codebase component affected:** `production_entry*` (must be read-only), new `prod_backfill_progress`.
4. **Proposed approach:** Backfill only INSERTs event rows from legacy reads, tracked in `prod_backfill_progress`; never UPDATE/DELETE legacy.
5. **Files/tables/APIs affected:** `prod_backfill_progress`, new backfill job (not created yet).
6. **Test:** Backfill run twice → idempotent, no legacy change (checksum legacy before/after identical), progress advances then completes.
7. **Rollback:** delete event rows + reset `prod_backfill_progress`; legacy untouched.
8. **Classification:** **MUST RESOLVE BEFORE P3** (method/approach fixed; implementation deferred).

---

### CONDITION 6 — No change to legacy schema/status/numbering/boundary

**Exact statement:** *"No change to `production_entry*` schema/entities, legacy status vocabulary, numbering, or the inventory boundary."*

1. **Why it exists:** Preserves backward compatibility and the P2 boundary (Rule C/E, §5).
2. **Risk if unresolved:** Breaking existing APIs, reports, pending screens, or re-introducing direct stock paths.
3. **Codebase component affected:** `production_entry*`, `ProductionController` (status), `DocNumberService`, `ProductionStockBoundary`, `StockService`.
4. **Proposed approach:** P3 OFF-LIMITS list enforced; event lifecycle is a namespaced projection (§7), never stored on legacy status columns.
5. **Files/tables/APIs affected:** none of the listed legacy surfaces; all new code is additive.
6. **Test:** Legacy compatibility suite (§5 matrix) green with flag ON and OFF; existing DB records unchanged.
7. **Rollback:** all P3 additions are additive; reverting = removing new files/flag, legacy untouched.
8. **Classification:** **MUST RESOLVE BEFORE P3** (guard-rail — enforced, not configurable).

---

### CONDITION 7 — Mixed-version rolling deployment safety

**Exact statement:** *"Mixed-version safety relies on derived-not-authoritative events + unique constraints — must be validated by the concurrent/mixed-version tests before rolling deployment."*

1. **Why it exists:** During rolling deploy, Server A (new) may emit events while Server B (old) does not; must not corrupt stock or legacy (Rule F).
2. **Risk if unresolved:** Two behaviors concurrent → duplicate posting or inconsistent event coverage.
3. **Codebase component affected:** `application.yaml` flag; `ProductionController`; event service; `StockService`.
4. **Proposed approach:** Flag read per-request from config **plus** DB-level idempotency/uniqueness; events are derived (never authoritative-write), and legacy is authoritative for posting in **every** version ⇒ mixed versions cannot double-post or double-write authoritative data. Validate via concurrent/mixed-version tests.
5. **Files/tables/APIs affected:** `application.yaml` (`production.normalized-ops.enabled`), event DDL unique constraints.
6. **Test:** Concurrent request tests + a simulated mixed-version test (event-emitter and non-emitter paths) asserting single posting, no dupes.
7. **Rollback:** flag OFF on all instances; event additions harmless.
8. **Classification:** **MUST RESOLVE BEFORE P3** for any rolling deployment (design fixed; runtime validated by tests).

---

## PART 2 — FINAL P3 APPROVAL MATRIX

| ID | Condition | Risk | Resolution Required | Verification | Approval Status |
|----|-----------|------|---------------------|--------------|-----------------|
| C1 | Same-tx event derivation | legacy/event split | same `@Transactional` scope | tx-rollback test | **MUST RESOLVE BEFORE P3** |
| C2 | Reuse existing idempotency guard | duplicate qty/posting | single dedup authority | dup-key POST test | **MUST RESOLVE BEFORE P3** |
| C3 | Reconciliation zero-drift gate | quantity drift at cutover | recon snapshot PASS | zero-drift SQL / 9 scenarios | **MUST RESOLVE BEFORE P3** |
| C4 | `prod_output_event` never posts stock | duplicate/direct stock | no StockService dep + scan | once-per-POST test + scan | **MUST RESOLVE BEFORE P3** |
| C5 | Backfill additive-only + marker | legacy mutation | INSERT-only backfill | idempotent/checksum test | **MUST RESOLVE BEFORE P3** (approach fixed; impl deferred) |
| C6 | No legacy schema/status/numbering/boundary change | compat break | OFF-LIMITS enforcement | legacy compat suite | **MUST RESOLVE BEFORE P3** (guard-rail) |
| C7 | Mixed-version safety | concurrent divergence | derived-not-authoritative + unique + tests | concurrent/mixed-version tests | **MUST RESOLVE BEFORE P3** |

**Verdict:** All 7 conditions must be resolved before P3. All are tractable and consistent with the actual codebase; none require an unresolved architectural decision. Conditions C1–C4, C7 are resolved by the *design + tests*; C5 (backfill) and C6 (guard-rail) are resolved by *constraints + deferred implementation*.

---

## PART 3 — ARCHITECTURE RULES A–G VALIDATION

### A. Single Source of Truth
Validated. At every stage exactly one authoritative writer exists:
- Legacy authoritative phases: `production_entry` is the only accepted-input writer; events are derived in the same tx, never a second accepted-input gateway.
- Cutover: events become the single source; legacy is read-only archive.
- No phase has two competing accepted-input writers. Event tables are projections, not a competing transaction system. (Namespace: because events derive from the already-committed-to-validator aggregate and share the POST idempotency key, they cannot independently accept new production.)

### B. No Unsafe Dual Write
Validated. The design mandates **one DB transaction** for legacy + event write (Condition C1), plus the proven recovery guard (existing `X-Idempotency-Key` → `PostingIdempotencyKey` SUCCESS) and natural-key uniqueness. Prohibited scenarios are each eliminated:
- *legacy succeeds, event permanently fails* → impossible: same tx rolls back both (C1).
- *event succeeds, legacy fails* → impossible: same tx (C1).
- *retry duplicates quantities* → POST idempotency key returns already-processed (C2) + unique natural keys.
- *retry duplicates stock posting* → same POST key + `StockLedger.existsByDocNoAndDocType` (C4).

### C. Inventory Posting
Validated. P3 events never independently post inventory. `ProductionEntryAction POST/REVERSE` is the only inventory posting authority. Exact chain:
```
Production Entry Action
→ ProductionStockBoundary / approved Production boundary
→ StockService
→ stock_ledger + stock_balance
```
Event tables mirror **execution information only** (output quantities as mirror records, never posting). Condition C4 + scan gate enforce it. No change without a future approved architecture decision.

### D. Quantity Authority — semantic mapping (reconciled with actual code, NOT the bare equation)
Facts from code: `createProductionEntry` sets `produced_quantity = process_qty` (L163–164); validator V-07 (L54–63) enforces `good + rework + rejected + scrap = allocatedSum ≤ process_qty`; reversal negates good/rework/reject/scrap/process (L421–431).

**The invariant is an INEQUALITY (`allocatedSum ≤ process_qty`), so the equation**
`process_qty = good + rejected + rework + scrap + WIP`
**is authoritative only as the DEFINITION of WIP (residual): `WIP = process_qty − allocatedSum ≥ 0`**, guaranteed non-negative by V-07. It is NOT an independent input.

| Legacy Field | Business Meaning | Event Mapping | Quantity Sign | Reversal Behavior | Source of Truth |
|---|---|---|---|---|---|
| `good_quantity` | Accepted output produced | `prod_output_event` output_type=ACCEPTED | + | negated on reverse (L421) | `production_entry` (legacy authoritative) |
| `rejected_quantity` | Rejected output | output_type=REJECTED | + | negated on reverse | `production_entry` |
| `rework_quantity` | Rework output | output_type=REWORK | + | negated on reverse | `production_entry` |
| `scrap_quantity` | Scrap output | output_type=SCRAP | + | negated on reverse | `production_entry` |
| `process_qty` | Quantity processed = upper bound (input) | session `available_input` | + | negated on reverse (L425) | `production_entry` |
| `produced_quantity` | **Alias of `process_qty`** (set equal at create L163–164); NOT good output | (derived) `available_input` | + | negated on reverse (L431) | `production_entry` |
| WIP (derived) | `process_qty − (good+reject+rework+scrap)` residual | session `wip` | + (≥0) | recomputed on reversal | **derived (not a stored legacy column)** |

Confirmed: `produced_quantity` ≠ good output; it equals `process_qty`. Using `produced_quantity` as "Accepted output" would be WRONG and cause drift. This is reconciled with actual semantics.

### E. Reversal
Validated against code (reverse branch L396–473; only DRAFT can be hard-deleted L287, so POSTED history is永不 deleted):
1. **Reverses inventory exactly once** — reverse creates a negated `ProductionEntry` (is_reversal=true, is∈REVERSED) → POST→boundary→StockService single negated posting; not repeatable because original entry becomes REVERSED and reverse guard (L397–399) blocks re-reverse, and POST idempotency key prevents duplicate negation.
2. **Does not delete historical events** — legacy POSTED row is kept (only its status→REVERSED), audit row written; derived events are **preserved** and a matching reversing event set appended (negated quantities per §D), never DELETE of the original event rows.
3. **Marks derived events appropriately** — session/operation/output mirror rows get `REVERSED`/negated projection while original history remains visible; no historical row is deleted.
4. **Preserves auditability** — `ProductionEntryAuditLog` `REVERSE` event links `reversed_from_entry_id` (L434, L468 metadata) and the reversal child; event rows carry mirrored IDs.
5. **Cannot be replayed as new production quantity** — reversal produces **negating** event outputs and the session/entry is terminal; a replay is blocked by the same POST idempotency key and by `entry.status=REVERSED` guard.

### F. Feature Flag Safety — `production.normalized-ops.enabled`
Validated (mixed-version safe):
- **Deployment/compat strategy:** flag read per-request (config-backed, not cached cross-instance in a way that diverges); **events are derived, never authoritative-write**, and **legacy is authoritative for posting in every version** ⇒ a new Server A emitting events and an old Server B not emitting cannot double-post or double-write authoritative data.
- Unique natural keys + `UNIQUE` constraints + shared POST idempotency key make duplicate event emission impossible regardless of per-instance version.
- OFF on all instances → pure legacy behavior; ON → additive events. Rolling deploy is safe because no version changes the posting authority or accepts input differently.

### G. Backfill Safety
Validated:
- **NOT automatic on startup** — backfill is an **explicit** job (CLI/endpoint/on-demand batch), never wired into app startup.
- **Idempotent** — deterministic natural-key event IDs + `UNIQUE` constraints; re-runnable.
- **Resumable** — `prod_backfill_progress` marker rows track last processed `production_entry.id` per `job_card`.
- **Measurable** — progress table + counts; reconciliation SQL reports drift.
- **Reconciliation-gated** — 0-row drift required before cutover; PASS/FAIL published.
- **Reversible without deleting historical legacy data** — backfill only INSERTs event rows; rollback = delete event rows + reset progress; legacy rows untouched.

---

## FINAL RECOMMENDATION

All 7 conditions are resolvable before P3 without any unresolved architectural decision, provided the design constraints (same-transaction derivation, single idempotency authority, no stock from events, additive-only backfill, namespaced lifecycle, mixed-version-safe flag) are locked and covered by the test plan (Part 1 + Part 2 matrix, Rules A–G).

Given that C1–C7 are each classified **MUST RESOLVE BEFORE P3** but are all *satisfiable by design + tests* with no open architecture question, and that the recommendation must be exactly one option from the allowed set, the appropriate classification is:

**B — SAFE TO IMPLEMENT ONLY A SPECIFIC P3 SUBSET**

Rationale: full P3 (including authoritativeness cutover + backfill) must not start until C1–C7 are closed (they are NOT yet implemented); but a **read-only, additive, flag-gated, same-transaction event projection subset + its test suite** can be approved and implemented now, while authoritativeness flip, backfill, and cutover remain gated on the reconciliation PASS (Condition C3) — which is a *later* cutoff within P3, not part of the initial safe subset.

---
## STOP

No source code, migration, DB schema, entity, API, or frontend was modified to produce this document. P3 implementation has **not** started. Await your approval of the recommended B-subset (and the gated conditions) before any implementation.