# DOCUMENT_31 — P3 Architecture Correction Plan (Read-Only)

**Phase:** P3 Architecture Correction Gate.
**Type:** **READ-ONLY architecture correction plan.** No Java/frontend source, no migration, no schema, no live data, no flag, no API, no inventory, no `production_entry`, no normalized event-table change. No backfill. No implementation.
**Authoritative inputs:** DOCUMENT_27, DOCUMENT_28, DOCUMENT_29, DOCUMENT_30. **Cross-checked against actual code and live DB `zyger_erp` (localhost:5432, user `zyger`, read-only).** Where a document and the code disagree, the **code is the evidence**.
**Final recommendation:** see §17.

---

## 1. Executive Summary

The correction phase must close three inconsistencies exposed by DOCUMENT_30:

1. **RC-1 — No single input-authority semantic.** Three components currently interpret `process_qty` / `produced_quantity` differently: the **validation service** uses `process_jqty ?? produced_quantity` fallback; the **normalized projection** (`ProductionNormalizedEventService`) uses `process_qty` only (available_input source); the **dry-run** (`ProductionBackfillDryRunService`) uses `process_qty` as input but simultaneously *flags* produced-not-alias and *labels* produced as process-alias in its loss ledger. DOCUMENT_27 §1.2 additionally hard-codes `process_qty (≡ produced_quantity)`. These are mutually incompatible.
2. **RC-2 — No backfill progress/resume backbone.** `prod_backfill_progress` is declared in V4 SQL but is **absent from the live DB, unreferenced by any code, and has no entity/repository**. The bounded-context reason: `spring.flyway.enabled=false` + `hibernate.ddl-auto=update` mean the runtime creates tables from **JPA entities only**, so the migration-only table never materialized.
3. **Dry-run/document inconsistency.** DOCUMENT_27's alias assumption and the dry-run's identity/loss-ledger wording (DOC_28 L150/L126) contradict the live Category-B record (process_qty NULL, produced=100=good+rejected).

The correction is **one shared contract**: a conceptual `ProductionInputAuthorityResolver` (architectural concept only — not implemented) consumed by validation, projection, dry-run, backfill, reversal, reconciliation, and quarantine, so no component independently invents quantity semantics. RC-2 adds a concrete progress/entry-outcome model. Inventory stays entirely outside this process.

---

## 2. Actual Code vs Documentation Conflict Matrix

| # | Statement in docs | Actual code (evidence) | Live DB evidence | Conflict? |
|---|-------------------|------------------------|------------------|-----------|
| C1 | DOC_27 §1.2: `process_qty (≡ produced_quantity)` → available_input | `ProductionNormalizedEventService` L156/L172 use `orZero(entry.getProcessQty())` as input; **no produced fallback** | `PE/2026-27/00001`: process_qty NULL, produced=100 | **YES** — alias assumed but not universal |
| C2 | DOC_29 §4/§3: validation uses produced as fallback input | `ProductionEntryValidationService` L48-49/L181/L188-189 use `process_qty ?? produced_quantity` | — | **No conflict** (that fallback is real, in validation only) |
| C3 | DOC_29 §3.1 / DOC_30 RC-1: produced is not globally alias; projection needs resolver | Projection uses process only → would project input=0 for B record | B record exists | **Confirmed** — projection gap is real |
| C4 | DOC_28 L150: identity `process_qty = good+rejected+rework+scrap+WIP`; L126 labels produced "produced-alias" | Dry-run `simulateEntry` L168 input=process; `computeWip(process,…)` L152/L179; loss ledger L385 "alias of process_qty" | B record: produced=100≠process(nullptr) | **YES** — dry-run reconciliation + loss ledger retain alias while finding flags non-alias |
| C5 | DOC_27 §1.2/§4: reversal mirror negated (process-based) | `ProductionController` reverse L453 negates `process_qty` only (no produced fallback); L459-460 sets produced=process=negProcess | no reversal rows live | **YES (edge)** — reversal of B would write 0 not -100 |
| C6 | DOC_27/DOC_28/DOC_29: `prod_backfill_progress` is the resume marker | No entity, no repo, no code reference; `flyway.enabled=false`, `ddl-auto=update` | Table absent from live DB (3 prod event tables present, progress missing) | **YES** — RC-2 backed by code+DB |
| C7 | DOC_29/30: normalized events emit zero inventory | `ProductionNormalizedEventService` deps = Property + 3 event repos only (L60-63); no StockService/Boundary/StockBalance | stock_ledger=41, stock_balance=17 | **No conflict** — confirmed safe |

**Net:** The documents, code, and DB are consistent on inventory safety and on the live Category-B anomaly, but **inconsistent on input authority** (RC-1) and **incomplete on progress/resume** (RC-2).

---

## 3. RC-1 Root Cause Analysis

The semantic split is **not accidental** — it reflects a transition:

- **Write-time semantics (create/update, controller L153-166/L273-275):** the app *copies* effective qty into both `process_qty` and `produced_quantity`, so freshly-created rows are Category C (alias holds). This made the alias convenient.
- **Validation semantics (V-05/V-07/V-18, L48-49/L188-189):** reads `process_qty ?? produced_quantity` — a process-first fallback to produced.
- **Projection semantics (`ProductionNormalizedEventService` L156/L172/L190):** input = `process_qty` **only**, no fallback. Written before/independently of the Category-B analysis; it assumes any authoritative entry has process_qty.
- **Historical/legacy semantics (record 1):** a real Category-B row where `process_qty` is NULL, so the projection fallback gap becomes real (input would be 0) and the alias is false (produced=total-output).

**Root cause:** there is **no single code location** that resolves "what is the effective input for this record?" — each consumer re-implements a partial rule (fallback in validation, process-only in projection, alias in dry-run loss-ledger). DOCUMENT_27's `≡` notation formalized the alias as if universal, which is false for historical data.

**Fix (architecture only):** centralize resolution behind one contract (below) so all consumers derive the same `EffectiveInputQuantity`, `SemanticCategory`, and confidence from the same predicate set.

---

## 4. Single Input Authority Resolution Architecture

**Conceptual contract (not implemented).** A single resolver interface/algorithm:

```
ProductionInputAuthorityResolver.resolve(production_entry) -> InputAuthorityResult
```

`InputAuthorityResult` carries, per record:
- `InputAuthority` — enum: `PROCESS_QTY`, `PRODUCED_QTY`, `AMBIGUOUS` (source of effective input).
- `EffectiveInputQuantity` — `BigDecimal` (the authoritative started/in quantity used for WIP & reconciliation).
- `SemanticCategory` — `CATEGORY_A | CATEGORY_B | CATEGORY_C | CATEGORY_UNKNOWN` (exact definitions §5).
- `Confidence` — `HIGH` (both consistent), `MEDIUM` (single-source, needs review), `LOW` (conflicting/ambiguous).
- `BackfillEligibility` — `ELIGIBLE | QUARANTINE | BLOCK` (§5 table + §14).
- `ReasonCode` — stable code (e.g. `INPUT-AUTHORITY-NULL`, `PRODUCED-DIFF`, `PROCESS_EQ_PRODUCED`, `BOTH_NULL`, `NEGATIVE`, `OVERALLOCATION`, `PARTIAL_WIP`) so findings are machine-comparable.

**Consumers (all must use the contract, none may invent rules):**
`ProductionEntryValidationService` · `ProductionNormalizedEventService` · `ProductionBackfillDryRunService` · actual backfill · reversal mapping · reconciliation · quarantine classification.

```
                    ┌──────────────────────────┐
                    │ Input Authority Resolver │
                    └────────────┬─────────────┘
                                 │
                 ┌───────────────┼────────────────┐
                 │               │                │
                 ▼               ▼                ▼
           Validation      Event Projection    Dry Run
                 │               │                │
                 └───────────────┼────────────────┘
                                 │
                                 ▼
                         Actual Backfill
                                 │
                                 ▼
                          Reconciliation
```

**Rule:** no component may independently define `process_qty` semantics, `produced_quantity` semantics, or fallback rules. All read the resolver output.

---

## 5. Semantic Category Definitions

Derived from actual code + DB evidence (not blindly reused). The category is a **property of the resolver result**, a function of (process_qty, produced_quantity, output-allocated-sum) and record kind.

| Category | Predicate (per record) | InputAuthority | EffectiveInput | BackfillEligibility | Note |
|----------|------------------------|----------------|----------------|---------------------|------|
| **CATEGORY_A** | `process_qty` NOT NULL (regardless of produced) | `PROCESS_QTY` | `process_qty` | ELIGIBLE (subject to F check) | process is declared input |
| **CATEGORY_B** | `process_qty` IS NULL AND `produced_quantity` NOT NULL | `AMBIGUOUS` (produced is recorded but is total-output evidence, not certified input) → **QUARANTINE** | not auto-assigned | QUARANTINE | the live record class |
| **CATEGORY_C** | both NOT NULL AND `process_qty == produced_quantity` | `PROCESS_QTY` | `process_qty` | ELIGIBLE | code-created alias holds |
| **CATEGORY_UNKNOWN** | anything else: both NULL; both present and ≠; negative; reversal rows | `AMBIGUOUS` | none | QUARANTINE / BLOCK (see matrix) | conflicting/missing/invalid |

These extend the DOCUMENT_29 A–F lettering. DOC_29 categories fold in: B→`CATEGORY_B`, A & C→`CATEGORY_A`/`CATEGORY_C`, D/E/F→`CATEGORY_UNKNOWN` (with reason codes distinguishing them). **No global rule** (never "produced=process" universally; never "process authoritative" universally).

---

## 6. Per-Record Decision Matrix

| Case | process_qty (P) | produced_quantity (Pd) | Output Sum (O = good+rej+rew+scr) | Effective Input | Authority | Category | Backfill Action |
|------|-----------------|------------------------|----------------------------------|-----------------|-----------|----------|-----------------|
| **1 (both equal)** | present | present, = P | O ≤ P | `P` | `PROCESS_QTY` | CATEGORY_C | ELIGIBLE — WIP = P−O ≥ 0 |
| **2 (P NULL, produced = O)** | NULL | present, Pd = O | O (=Pd) | **none auto** | `AMBIGUOUS` | CATEGORY_B | **QUARANTINE** — produced recorded as total-output, not certified input; explicit review |
| **3 (both present differ)** | present | present, Pd ≠ P | — | `P` | `PROCESS_QTY` (with drift flag) | CATEGORY_UNKNOWN | BLOCK if Pd meaningful; reconcile why differ |
| **4 (both NULL)** | NULL | NULL | — (or O>0) | none | `AMBIGUOUS` | CATEGORY_UNKNOWN | QUARANTINE — no recorded input |
| **5 (negative/reversal values)** | negated (as stored on reversal rows) | negated | negated negatives | treat sign-aware; WIP=0 for reversal | kind-aware | CATEGORY_UNKNOWN | BLOCK/QUARANTINE until kind resolved (see §8) |
| **6 (O exceeds effective input)** | present (or resolved) | any | O > P | P | `PROCESS_QTY` | CATEGORY_UNKNOWN | **BLOCK** — over-allocation ⇒ negative-WIP history |
| **7 (partial production, residual WIP)** | present | present (equal) | O < P | `P` | `PROCESS_QTY` | CATEGORY_C | ELIGIBLE — WIP = P−O > 0 (residual WIP) |

**Live record:** matches **Case 2 → QUARANTINE** (`PE/2026-27/00001`, P=NULL, Pd=100=95+5). It carries neither auto-authority nor auto-backfill.

---

## 7. Quantity and WIP Reconciliation Rules

WIP is computed **only after** effective input authority is resolved (never before, never on a frozen alias).

```
allocated_output := good + rejected + rework + scrap
WIP             := EffectiveInput − allocated_output        (EffectiveInput from §4/§5)
guard           : WIP is clipped to ≥ 0 ONLY for display/reversal rows;
                  a resolver with O > EffectiveInput is Category-Unknown/BLOCK,
                  never silently zeroed into a valid history.
```

**Reconciliation deltas** (do not use `process_qty` as universal input):
```
Δ_input := legacyInputAuthority − Σ(session.available_input)   // legacyInputAuthority = resolver.EffectiveInput
Δ_acc   := legacy.good_quantity        − Σ(session.accepted_output)
Δ_rej   := legacy.rejected_quantity    − Σ(session.rejected)
Δ_rew   := legacy.rework_quantity      − Σ(session.rework)
Δ_scr   := legacy.scrap_quantity       − Σ(session.scrap)
Δ_wip   := legacyWip − session.wip     // both per-record authority-based
legacyWip := EffectiveInput − (good+rej+rew+scr)
```
Every formula **names the authoritative field and the category** it belongs to (from the resolver), satisfying "which field is authoritative, why, under which category."

Verification against lifecyc real semantics (done read-only):
- **create/update** (controller): writes P=Pd (→C) — consistent with resolver OUTPUT for C.
- **validation** (L48-49): process-first fallback — must be replaced by resolver (still returns P for A/C, produced only after review for B).
- **POST** (controller L362-411 + projection L112-115): outputs projected; input should come from resolver, not raw `process_qty`.
- **reversal** (controller L453): currently process-only (edge) — resolver must feed reversal mirror.
- **DB semantics:** B record proves produced=total-output → Category B is real; do not fold into C.

---

## 8. Reversal Semantic Architecture

The classification must handle four distinct legacy states:

| Legacy state | Meaning | Resolver/backfill handling |
|--------------|---------|----------------------------|
| **Original** (status POSTED/COMPLETED) | normal final | ELIGIBLE (Category A/C) → COMPLETED session |
| **REVERSED original** (status REVERSED, the pre-reversal row) | original kept; NOT deleted | its COMPLETED projection preserved; **never** re-derived as CANCELLED |
| **Reversal entry** (is_reversal=true, status POSTED, negated) | compensating mirror | mirror session CANCELLED, op REVERSED, negated outputs; keyed to its own entry_number |
| **Category-B influenced** | process_qty NULL on original or reversal | **QUARANTINE** — do not silently transform produced into process |

Rules:
- Authority must resolve **separately for the original AND for the reversal row**. A reversal of Category-B must not be auto-assumed; if authority can’t be safely resolved, result is **QUARANTINE**.
- The reversal **negation must use the resolver’s effective input** (fixes the process-only edge at controller L453/L459), so `produced`/`process` of the mirror are both negated correctly (−100 for record 1), not 0.
- Historical POSTED entries are never deleted; corrections are additive mirrors.

---

## 9. RC-2 Progress/Resume Architecture

### 9.1 Chosen model
`prod_backfill_progress` **is the correct controlled mechanism** (one row per backfill scope unit), provided it is actually materialized (it is not today). Justified fields (only those required):

| Field | Justification |
|-------|---------------|
| `job_id` | unique backfill run identity (UUID) — new, required for multi-run isolation |
| `scope` | what this row covers: `job_card_number` (UNIQUE per scope) — matches `uq_prod_backfill_progress_job` |
| `status` | job-level state (vocabulary §9.2) |
| `last_processed_entry_id` | watermark of last `production_entry.id` attempted within scope (resume cursor) |
| `last_successful_entry_id` | watermark of last successfully committed entry (restart-from-after-this, no rework of committed) |
| `batch_number` | current batch/chunk ordinal (batch visibility) |
| `started_at` / `completed_at` | run timing |
| `failure_count` | consecutive failures (backoff/retry trigger) |
| `last_error` | last failure detail (diagnostics) |
| `quarantine_count` | count quarantined within scope (visibility) |
| `processed_count` / `success_count` | total attempted / succeeded |
| `skip_count` | count already-projected or reason-skipped |
| `reconciliation_status` | reconciled/not (0-drift result) — links to job outcome |
| `version` | `@Version` optimistic lock (concurrency guard) |
| `reconciliation_status` duplicate intent is merged into the single `reconciliation_status` column.

`last_successful_entry_id` and `last_processed_entry_id` are **both** justified: processed is the cursor of all entries attempted; successful is the safe resume point (only committed). Batch resumption uses `last_successful_entry_id`.

### 9.2 Job-level state vocabulary (single)
`NOT_STARTED` → `RUNNING` → (`PAUSED` | `FAILED` | `COMPLETED` | `RECONCILIATION_FAILED` | `ROLLED_BACK`).
- `RECONCILIATION_FAILED` = job finished inserts but post-backfill reconciliation (Δ≠0/duplicate/missing) failed — distinct from a crash (`FAILED`).
- `ROLLED_BACK` = a controlled global revert was performed (additive rows dropped; legacy untouched).
No alternate vocabulary.

### 9.3 Per-entry outcome states (DIFFERENT concept from job status)
`PROJECTED` (inserted) · `ALREADY_PROJECTED` (natural-key hit, no-op) · `QUARANTINED` (excluded by resolver) · `FAILED` (entry error) · `SKIPPED` (explicit skip reason, e.g. non-finalized DRAFT if out of scope).
**Job-level status describes the run; entry-level outcome describes each row.** A job can be `RUNNING` while individual entries are a mix of the five outcomes.

### 9.4 Resume design
| Concern | Design |
|---------|--------|
| Transaction boundary | one entry = one transaction (session+op+outputs+progress update commit atomically); chunk of N entries = N independent transactions |
| Batch size | configurable chunk (default 100) bound memory/rollback; `batch_number` increments per chunk |
| Commit point | after each entry's transaction commits, `last_successful_entry_id` advances; crash leaves watermark at last commit |
| Crash recovery | on restart read `status∈{RUNNING,PAUSED,FAILED}`, resume from `last_successful_entry_id`+1 |
| Duplicate prevention | (a) natural-key UNIQUE on session/op/output (DB backstop), (b) `last_successful_entry_id` skip, (c) `@Version` row-level optimistic lock to prevent concurrent claim |
| Concurrency lock | `SELECT … FOR UPDATE`/advisory lock + `@Version` on the progress row; one worker per scope |
| Restart behavior | does not duplicate events (natural keys + committed-cursor), does not skip eligible (resume from success cursor), does not process quarantined incorrectly (resolver re-ran; quarantine outcome re-applied) |
| Partial batch behavior | a mid-chunk crash leaves earlier committed entries intact (idempotently recoverable), later entries not-yet-processed; no partial entry ever persists (entry=txn) |
| Failed entry behavior | catch, rollback that entry only, record `FAILED` outcome + `failure_count`/`last_error`, exponential backoff then continue; after N consecutive → job `FAILED` |
| Quarantine behavior | resolver marks entry `QUARANTINED`; job **skips** it (no insert, no error), increments `quarantine_count`; manual-resolution flow promotes later |

**Proof obligations** (test-plan §16): restart does not duplicate events; restart does not skip eligible records; restart does not process quarantined records incorrectly.

---

## 10. Dry-Run Correction Architecture

`ProductionBackfillDryRunService` must consume the **same resolver** as production projection and real backfill. Corrections:

| Item | Current (evidence) | Corrected |
|------|--------------------|-----------|
| Available input calc | L168 `simulatedAvailableInput=process` (process-only) | input = `resolver.EffectiveInputQuantity` per record |
| produced/process semantic | L385 loss ledger "produced_quantity = alias of process_qty" | produced classified per category (total-output for B; alias only for C) |
| Loss-ledger wording | DOC_28 L126 "produced-alias", L150 identity via process_qty | wording names per-record authority & category; no universal alias |
| Quantity reconciliation | L152/L179 `computeWip(process,…)`; identity assumes process | Δ_input uses `EffectiveInput`; WIP = EffectiveInput−O |
| Category classification | only ad-hoc findings (INPUT-AUTHORITY-NULL etc.) | emit `SemanticCategory` + `ReasonCode` from resolver |
| Reversal validation | `reversalValidation` checks negated good only | validate original vs mirror using resolver-effective input (including B handling) |

The dry-run remains strictly read-only and inventory-isolated; only the *semantic source* changes to the resolver.

---

## 11. Future Actual Backfill Architecture

```
feed = SELECT production_entry ORDER BY id       (read-only over legacy; source of truth)
for each entry:
    r = InputAuthorityResolver.resolve(entry)
    per r.BackfillEligibility:
        ELIGIBLE  -> insert session/op/outputs (effective input; natural-key idempotent) + progress
        QUARANTINE-> progress outcome=QUARANTINED; skip; quarantine_count++
        BLOCK     -> halt or mark BLOCK; never auto-resolve
commit per entry (entry=txn)
post-run: Reconciliation (Δ_input/Δ_acc/Δ_rej/Δ_rew/Δ_scr/Δ_wip = 0; no dup/missing; reversal pairs balance)
```
- **Writes only:** `prod_execution_session`, `prod_operation_event`, `prod_output_event`, `prod_backfill_progress`. **Never** `production_entry*`, `stock_ledger`, `stock_balance`.
- Idempotent by natural keys + committed cursor; reversible by dropping additive rows (legacy untouched).

---

## 12. Migration Strategy (read-only evaluation)

Deployment facts (verified live):
- `spring.flyway.enabled=false`; `hibernate.ddl-auto=update`; live Flyway history = **single baseline at version "11"** (no V1–V4 rows); 3 prod event tables exist (0 rows); `prod_backfill_progress` absent.

Evaluations:
- **V4 immutability:** V4 is **not** under Flyway-checksum protection here (Flyway off, no V4 history row), and it only affects DBs where Flyway manages schema — modifying already-applied V4 elsewhere risks checksum drift. **Do not modify V4.**
- **Fresh DB behavior:** with Flyway off, fresh tables come from `ddl-auto` over entities, so a lone SQL V4 has no effect unless Flyway is enabled → **a JPA entity is the reliable carrier here**.
- **Existing DB behavior:** progress table can be added by Hibernate `ddl-auto` once a `ProdBackfillProgress` entity exists, plus (for Flyway-managed environments) a **new additive `V5__prod_backfill_progress.sql`**.
- **Checksum safety / immutability:** never edit an applied migration; add new versions. V1–V4 remain untouched.
- **V4's own declaration:** keep V4's `CREATE TABLE IF NOT EXISTS prod_backfill_progress` only if we accept we won't rely on it in this runtime; the **entity + additive V5** are the corrected mechanism.

**Recommendation:** (1) new `ProdBackfillProgress` @Entity (ddl-auto creates table), (2) additive `V5` migration with `IF NOT EXISTS` for Flyway-managed prod, (3) V4 left as-is. **Nothing applied now.**

---

## 13. Idempotency and Concurrency Strategy

- **Natural keys (DB-enforced UNIQUE):** session `(entry_number)`; op `(session_id, subjob_number, operation_code, seq)`; output `(session_id, operation_event_id, output_type, item_code, location)`. Replay = no-op (absorb `DataIntegrityViolationException` → re-find).
- **Entry-level transaction** prevents partial rows; a duplicate emission of an already-committed entry is skipped by natural key.
- **Progress cursor** (`last_successful_entry_id`) skips committed work before any insert attempt.
- **Concurrency:** one claimer per scope via `SELECT … FOR UPDATE`/advisory lock + `@Version`; two workers cannot process the same scope row.
- **Outcome idempotency:** per-entry outcomes `PROJECTED`/`ALREADY_PROJECTED`/`QUARANTINED`/`FAILED`/`SKIPPED` are monotone per run; re-running a quarantined entry re-derives QUARANTINED (resolver deterministic), never an unintended insert.

---

## 14. Quarantine Architecture

- **Deterministic classifier** = resolver. Any `BackfillEligibility ≠ ELIGIBLE` (Category B, Category Unknown without safe authority, F over-allocation, negative/ambiguity) → QUARANTINE or BLOCK.
- **Quarantine store:** `prod_backfill_progress` (per scope) exposes `quarantine_count`; a separate quarantine record set (or the entry-outcome list) records `entry_number`, `SemanticCategory`, `ReasonCode`, `EffectiveInput=NULL`, `Confidence`, `requester`, `resolution=None`.
- **Manual resolution flow:** reviewer supplies explicit `EffectiveInputQuantity` + authority for a quarantined entry; promotes it to ELIGIBLE with recorded authority + approver; only then may it enter controlled backfill.
- **Guarantee:** no ambiguous record is automatically backfilled; `PE/2026-27/00001` is the sole quarantined record today.

---

## 15. Inventory Isolation Proof Requirements

The architecture keeps inventory **outside** semantic resolution, dry-run, backfill, and projection. Proofs (extend the existing pattern in `ProductionBackfillDryRunIntegrationTest.inventoryIsolationStaticScan`):

1. **Static/DI scan:** resolver, dry-run, backfill, and projection must have **zero** dependencies on `StockService`, `ProductionStockBoundary`, `StockBalanceRepository` (bytecode/constructor-graph check).
2. **Runtime count-stability:** after each pipeline stage, `COUNT(*)` on `stock_ledger` and `stock_balance` unchanged.
3. **No stock SQL:** no `INSERT/UPDATE` targeting `stock_*` in resolver/backfill/dry-run code paths.
4. **Boundary single path:** the only production→stock bridge remains `ProductionStockBoundary.recordJobCardCompleteGood → StockService.recordStockIn` (Job-Card completion) — untouched.

✓ No StockService ✓ No ProductionStockBoundary ✓ No StockBalanceRepository ✓ No stock_balance writes ✓ No stock_ledger writes — for semantic resolution, dry-run, backfill, normalized projection.

---

## 16. File-by-File Future Change Plan

Classification: CREATE / MODIFY / REFACTOR / NO CHANGE / OFF LIMITS. **Nothing applied now.**

| File | Classification | Change (future) |
|------|----------------|-----------------|
| `service/ProductionInputAuthorityResolver.java` (new) | **CREATE** | shared contract per §4/§5 (InputAuthority, EffectiveInput, SemanticCategory, Confidence, BackfillEligibility, ReasonCode) |
| `service/ProductionBackfillService.java` (new) | **CREATE** | actual backfill (§11) |
| `service/ProductionBackfillProgressService.java` (new) | **CREATE** | progress/entry-outcome/resume (§9) |
| `entity/ProdBackfillProgress.java` (new) | **CREATE** | JPA progress entity (§9, RC-2) |
| `repo/ProdBackfillProgressRepository.java` (new) | **CREATE** | find/upsert progress |
| `dto/dryrun/*` | **NO CHANGE** | existing DTOs reusable; add fields only if needed |
| `service/ProductionNormalizedEventService.java` | **REFACTOR** | derive available_input via resolver, not raw process_qty (RC-1) |
| `service/ProductionEntryValidationService.java` | **REFACTOR** | replace local fallback (L48-49/L188-189) with resolver |
| `service/ProductionBackfillDryRunService.java` | **REFACTOR** | resolver-based input/category/reconciliation/loss-ledger (§10) |
| `controller/ProductionController.java` | **MODIFY** | reversal negation uses resolver effective input (L453/L459) |
| `entity/ProductionEntry.java` | **NO CHANGE** | authoritative legacy unchanged |
| `migration/V4__prod_normalized_events.sql` | **NO CHANGE (immutable)** | never edit applied migration |
| `migration/V5__prod_backfill_progress.sql` (new) | **CREATE (additive)** | for Flyway-managed environments only (RC-2) |
| `entity/ProductionStockBoundary.java` / `service/StockService.java` | **OFF LIMITS** | inventory boundary untouched |
| `config/ProductionNormalizedOpsProperties.java` | **NO CHANGE** | flag stays OFF default |
| `application.yaml` | **NO CHANGE** | `flyway.enabled=false`, `ddl-auto=update`, `normalized-ops.enabled=false` unchanged |

---

## 17. Final Decision

> ## **B — REQUIRES ADDITIONAL ARCHITECTURE REVIEW**

Rationale:
- **Not A (ready to implement):** the resolver contract (§4) is design-only and not yet reviewed/approved by stakeholders; RC-2's `prod_backfill_progress` model, though designed, depends on understanding the odd runtime (Flyway off / ddl-auto) that must be confirmed as the intended deployment mode; the Category-B quarantine + manual-resolution flow and the reversal-of-B behavior should be validated before implementation is blessed.
- **Not C (unsafe):** the correction is well-bounded — the single ambiguous record is quarantinable, inventory isolation is already proven, and the resolver design removes the conflict. Nothing about the architecture is fundamentally unsafe; it is simply not yet fully reviewed/consented at the level required to begin implementation.

After this plan is updated per review feedback and the resolver/quarantine/status model are explicitly approved, the phase may re-issue as **A — READY TO IMPLEMENT ARCHITECTURE CORRECTIONS**.

---

## 18. Mandatory Stop Gate

**STOP.** No implementation. No source/schema/migration/data/flag/API/inventory change. No backfill. Wait for explicit review and approval of this architecture-correction plan before any coding.

## 19. Change Log
- Created DOCUMENT_31 (read-only): RC-1 resolver architecture + RC-2 progress/resume design + dry-run correction + migration strategy + idempotency/quarantine/inventory proofs + file-by-file plan; final decision **B — REQUIRES ADDITIONAL ARCHITECTURE REVIEW**.
- No files modified.