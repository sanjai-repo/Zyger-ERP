# DOCUMENT_34 — P3.3 Backfill Engine Implementation Plan (Read-Only Analysis)

**Phase:** P3.3 — CONTROLLED BACKFILL ENGINE IMPLEMENTATION — **PHASE A (READ + ANALYZE ONLY)**.
**Type:** **READ-ONLY architecture/implementation plan.** No code, no migration, no schema, no data, no flag change, no backfill execution.
**Authoritative inputs:** DOCUMENT_31, DOCUMENT_32, DOCUMENT_33, and the existing implementation (`ProductionInputAuthorityResolver`, `ProductionNormalizedEventService`, `ProductionBackfillProgressService`, `ProdBackfillProgress`, `ProdBackfillEntryOutcome`, normalized event entities + repositories + natural-key constraints, reconciliation code in `ProductionBackfillDryRunService`).
**Current stable baseline:** backend **238 tests / 0 failures / 0 errors**; frontend 34 tests pass / typecheck exit 0; lint unchanged; inventory isolation proven; live DB has exactly 1 `production_entry` (PE/2026-27/00001, CATEGORY_B / QUARANTINE).

**Stop gate:** this document is analysis only. **STOP after this document.** Do not implement `ProductionBackfillService` until explicit approval.

---

## 1. Current Architecture Summary

The P3 correction (RC-1/RC-2) landed in DOCUMENT_32 and produced:

- **`ProductionInputAuthorityResolver`** — the single authority for EffectiveInputQuantity, InputAuthority, SemanticCategory, Confidence, BackfillEligibility, ReasonCode. Pure, deterministic function of a `ProductionEntry`. Executed against the live record it returns **CATEGORY_B / AMBIGUOUS / null input / MEDIUM / QUARANTINE / INPUT-AUTHORITY-NULL / not resolvable**.
- **`ProductionNormalizedEventService`** — flag-gated (`production.normalized-ops.enabled`, default false) online projection that, when ON, derives `prod_execution_session` / `prod_operation_event` / `prod_output_event` from an authoritative `ProductionEntry` in the same transaction as the legacy write. It is resolve-guarded (skips non-resolvable), inventory- and legacy-neutral, and idempotent by natural keys (absorbs `DataIntegrityViolationException` → re-find). Contains reusable `upsertSession` / `upsertOperation` / `putOutput` building blocks and the `resolvedInput` + `deriveWip` helpers.
- **`ProductionBackfillProgressService`** + **`ProdBackfillProgress`** + **`ProdBackfillEntryOutcome`** + two repositories — the progress/outcome backbone (RC-2): idempotent `startJob`, `claim` (optimistic `@Version`), `resumeFrom` (`last_successful_entry_id`), `heartbeat`, `recordOutcome` (idempotent by job+entry), `resolveEntry` (additive manual resolution on QUARANTINED only), `complete`.
- **`ProductionBackfillDryRunService`** — strictly read-only (`@Transactional(readOnly = true)`), resolver-backed reconciliation/loss-ledger; never writes progress/outcome; proven inventory-isolated.

**Gap (this phase):** there is **no actual backfill **executor**. Nothing materializes a session/op/output from a resolved ELIGIBLE legacy record into the `prod_*` tables as a standalone, approved, batched, dry-first operation. `ProductionBackfillService` is that missing executor (DOCUMENT_31 §11, DOCUMENT_33 §18 item 3).

**Live data fact:** exactly one `production_entry` exists; it is CATEGORY_B / QUARANTINE. Therefore a correctly-built engine must, **today, backfill nothing** and quarantine this record — a perfect first dry-execution outcome.

---

## 2. Exact Backfill Service Responsibilities

`ProductionBackfillService` must:

1. **Scan** `production_entry` strictly read-only, in a deterministic order (ascending `id`), within a scoped cursor (optionally a full-feed or a job-card scope).
2. **Resolve** each entry via `ProductionInputAuthorityResolver` only (never its own semantics).
3. **Classify** into ELIGIBLE / QUARANTINE / BLOCK by the resolver result.
4. **Project** ELIGIBLE entries into `prod_execution_session` + `prod_operation_event` + `prod_output_event` using the resolver effective input and reconciled WIP, reusing the existing projection building blocks/constraints.
5. **Record an outcome** (`PROJECTED` / `ALREADY_PROJECTED` / `QUARANTINED` / `FAILED` / `SKIPPED`) per entry and update job progress counters.
6. **Advance the cursor** only on committed success (`last_successful_entry_id`), and heartbeat `last_processed_entry_id`.
7. **Honor one-entry-one-transaction** so a failed entry leaves no partial state.
8. **Enforce a block policy** (stop-on-block by default; never silently treat a BLOCK as valid).
9. **Support dry execution first** (compute + report what would be written, write nothing).
10. **Reconcile post-run** (Δ_input / Δ_acc / Δ_rej / Δ_rew / Δ_scr / Δ_wip = 0; no dup/missing; reversal pairs balance) and record the result on `ProdBackfillProgress`.
11. **Support rollback planning** — report the exact additive `prod_*` rows produced so they can be dropped/negated; legacy and stock are never touched.
12. **Emit rich audit** so every action is attributable to a `job_id` and an actor, and is replay-safe.

---

## 3. Dependency Graph

`ProductionBackfillService` depends on (and **only** on):

```
ProductionBackfillService
 ├── ProductionEntryRepository          (read-only scan; source of truth)
 ├── ProductionInputAuthorityResolver   (all quantity semantics)
 ├── ProductionBackfillProgressService  (progress + outcome lifecycle)
 ├── ProdExecutionSessionRepository     (prod_* write / existence / natural-key)
 ├── ProdOperationEventRepository       (prod_* write / natural-key)
 ├── ProdOutputEventRepository          (prod_* write / natural-key)
 ├── ProductionNormalizedEventService   (REUSE projection building blocks — or mirror the same
 │                                        natural-key upsert helpers; read-only to legacy/stock)
 └── ProductionNormalizedOpsProperties  (flag-gating decision; see §16)
```

**Explicit non-dependencies (must be zero):** `StockService`, `ProductionStockBoundary`, `StockBalanceRepository`, `stock_balance`, `stock_ledger`, and any repository that writes `production_entry`/legacy. No `JdbcTemplate` stock statement. (Proven by the same static scan pattern already used for the dry-run/projection; extend it to this service.)

Distinguish the **orchestrator** (scan/loop/classify/reconcile) from the **projection writer** (the already-existing natural-key upsert logic). Either the engine delegates to `ProductionNormalizedEventService` (which is currently flag-gated — see §16) or the engine duplicates the natural-key upsert as private helpers. Recommendation: encapsulate the projection-writing as a small internal component (e.g. a package-private writer) so the flag semantics of the online path are not accidentally coupled to the explicit batched path. Detail in §16.

---

## 4. Resolver Integration

- **Only** `ProductionInputAuthorityResolver.resolve(entry)` supplies: `effectiveInputQuantity`, `inputAuthority`, `semanticCategory`, `confidence`, `backfillEligibility`, `reasonCode`.
- The engine must treat the resolver as a pure oracle: it reads the entry, calls `resolve`, and **mirrors** the result verbatim into the outcome record.
- **No independent calculation** of `process_qty` / `produced_quantity` semantics, and **no produced→process fallback**, anywhere in the engine.
- The projection quantity mapping must reuse the same derived quantities the online service uses (input = resolved effective input; outputs = good/rejected/rework/scrap; WIP = max(input − Σoutputs, 0)), so the engine and the online path never disagree.

---

## 5. Eligibility Decision Matrix

| Resolver outcome | isResolvable() | Engine action |
|------------------|----------------|---------------|
| `ELIGIBLE` + resolvable (Category A/C, no over-allocation) | true | **Project** session/op/outputs; outcome `PROJECTED`; advance cursor. |
| `ELIGIBLE` (Category A over-allocation → still resolvable) | true | **BLOCK by policy** — over-allocation signals mis-allocation; do not project as valid history. See §12. |
| `QUARANTINE` (Category B, both-null-with-outputs, negatives non-reversal, NULL-entry) | false | **Do not project**; outcome `QUARANTINED`; effective_input stays unresolved; increment quarantine_count; continue. |
| `BLOCK` (Category D over-allocation, Category A/C over-allocation) | false (D) / policy (A/C) | **Do not project**; apply block policy (§12); never continue as valid data. |
| Already has a session natural key present | — | outcome `ALREADY_PROJECTED`; no writes; advance cursor. (§9) |

The resolver result is the **single source of truth**; the engine only maps `BackfillEligibility` to an action and an outcome code.

---

## 6. CATEGORY_B Handling

- CATEGORY_B (process_qty NULL, produced_quantity present) is `QUARANTINE`, not resolvable, effective input null.
- The engine must **never** auto-resolve it and **never** auto-convert `produced_quantity` → `process_qty`.
- It must record outcome `QUARANTINED` with `semantic_category=CATEGORY_B`, `authority=AMBIGUOUS`, `reason_code=INPUT-AUTHORITY-NULL`, `effective_input=NULL`, `eligibility=QUARANTINE`, and **skip** projection.
- **PE/2026-27/00001** (live) must remain QUARANTINED unless a future explicit, approved manual resolution exists (via `ProductionBackfillProgressService.resolveEntry`, additive — never a legacy write). A dry run must therefore report it in the Quarantine Register, not as projected.
- Regression: a unit + integration test must pin `PE/2026-27/00001`-shaped data → QUARANTINED, not projected, effective input null.

---

## 7. Transaction Boundary

- **Scope: exactly one `production_entry` per transaction** (DOCUMENT_31 §11 "commit per entry").
- The transaction must atomically include:
  1. normalized `prod_execution_session` (insert),
  2. `prod_operation_event` (insert),
  3. `prod_output_event` (inserts),
  4. `prod_backfill_entry_outcome` (outcome row),
  5. `prod_backfill_progress` (cursor + counters heartbeat).
- Implementation shape: the per-entry worker runs inside `@Transactional(propagation = REQUIRES_NEW)`; a failure rolls back **only that entry**, leaving the job cursor unchanged (so a retry re-processes it) and no partial `prod_*` rows.
- The progressive `resumeFrom` (`last_successful_entry_id`) is only advanced within this same transaction, printed/recorded after the projection succeeds — guaranteeing restart never re-emits committed work nor skips eligible work.

---

## 8. Progress / Resume Lifecycle

```
startJob(jobId, scope)   -> NOT_STARTED          (idempotent; existing job returned)
claim(jobId)             -> RUNNING              (only from NOT_STARTED/PAUSED/FAILED; @Version guarded)
loop entries ascending id, filtered to id > resumeFrom(jobId):
    per entry txn:
        resolve -> action
        project + recordOutcome + heartbeat   (in txn)
        on success set last_successful_entry_id = entry.id
    (QUARANTINE/SKIPPED/ALREADY_PROJECTED still update last_processed but NOT last_successful
      unless defined—see note)
    on failure: txn rolls back; job.status -> FAILED (policy) and stop / continue-by-policy
complete(jobId, COMPLETED|RECONCILIATION_FAILED, reconciliationStatus)
```

**Resume correctness requirement (DOCUMENT_31 §13):** `resumeFrom(jobId)` returns `last_successful_entry_id`; the scan starts strictly after it. Two workers cannot claim the same scope (optimistic `@Version` + claim guard). Crash recovery = re-invoke with the same `job_id`; committed entries resume, quarantined/eligible entries re-derive deterministically.

**Note on cursor semantics:** `last_successful_entry_id` should advance for entries that are *committed-and-settled* (PROJECTED / ALREADY_PROJECTED / SKIPPED as duplicates), whereas QUARANTINED entries should **not** advance the success cursor unless the engine intends to re-surface them on every run. Recommended policy: QUARANTINE does **not** advance `last_successful_entry_id` (they are neither succeeded nor terminal for a future manual resolution), but it does advance `last_processed_entry_id` and `quarantine_count`. This preserves DOCUMENT_33's requirement that resolution is a separate approved step. The exact choice is an explicit approval point; the author recommends the above.

---

## 9. Idempotency Strategy

- **DB natural keys (already enforced):**
  - session `UNIQUE (entry_number)`,
  - operation `UNIQUE (session_id, subjob_number, operation_code, seq)`,
  - output `UNIQUE (session_id, operation_event_id, output_type, item_code, location)`.
- **Replay semantics:** before inserting, the engine checks existence via the existing repo lookups (`findByEntryNumber`, `findBySessionIdAndSubjobNumberAndOperationCodeAndSeq`, `findBySessionIdAndOperationEventIdAndOutputTypeAndItemCodeAndLocation`). On a pre-existing natural key the engine records outcome `ALREADY_PROJECTED` and writes **nothing**.
- **Race absorption:** if a concurrent/duplicate emission throws `DataIntegrityViolationException` on a natural key, the engine absorbs it and re-finds the winner (same pattern as `ProductionNormalizedEventService`), so a duplicate is a safe no-op, never a rollback of the authoritative write.
- **Progress cursor** guarantees committed work is skipped before any insert attempt.

---

## 10. Duplicate Handling

- Duplicate of a **session** → `ALREADY_PROJECTED`, no insert.
- Duplicate **operation** (same session) → leave the existing operation; do not create a duplicate op; escalate only if status/quantity mismatch would be misrepresentative.
- Duplicate **output** (same session/op/type/item/location) → skip; the natural key is definitive.
- Duplicate **outcome** (same job+entry) → `recordOutcome` is already idempotent (returns early); never double-count.
- **No duplicate naming:** each scope uses one `job_id`; re-invoking `startJob` returns the same job (no double progress row).

---

## 11. Quarantine Handling

- Triggered when `BackfillEligibility == QUARANTINE` (and not resolvable).
- Actions: **no** `prod_*` event insert; record outcome `QUARANTINED` with the full resolver snapshot; increment `quarantine_count`; effective input preserved as `NULL`/unresolved; **no legacy modification**.
- Execution continues to the next entry by default (quarantine is non-fatal).
- Manual resolution is additive and separate: `ProductionBackfillProgressService.resolveEntry` stores an explicit input + eligibility on the outcome; the engine only ever projects an entry after the resolver returns ELIGIBLE (i.e. after a future resolution plus a re-run, not by mutation).

---

## 12. Block Handling

- Triggered when the resolver escalates to `BLOCK` (over-allocation: allocated output > input) or when an A/C entry that is technically resolvable exhibits over-allocation.
- **Policy (default): STOP-on-block.** A BLOCK indicates corrupt/mis-allocated quantity history; proceeding would create incorrect normalized WIP/history. The engine halts the run, sets job `status = RECONCILIATION_FAILED` (or a BLOCK-specific FAILED state), records the `BLOCK` outcome + reason (`OVERALLOCATION`), and **never** continues that entry as valid data.
- An optional, explicit, approved **"continue-with-block, report-only"** mode may be considered, but the default must be conservative (stop-on-block) and any bypass must be explicit, logged, and never silently treated the entry as valid.
- Decision point for approval: **stop-on-block is the recommended default; continue-with-block is disallowed unless separately approved.**

---

## 13. Failure Handling

- Per-entry failure (validation, block, DB error, resolver exception) rolls back that entry's transaction only (`REQUIRES_NEW`), leaving prior committed entries intact.
- The engine:
  1. records outcome `FAILED` + reason (`NEG-WIP`, `OVERALLOCATION`, or a persisted exception summary) in the *next* (recovering) step or a failure ledger, not in the rolled-back txn;
  2. increments `failure_count`, sets `last_error`;
  3. by policy either **stops** the job (`status = FAILED`) or **continues** with remaining entries (configurable; recommended default: stop on BLOCK/DB integrity, continue on QUARANTINE only).
- A retry with the same `job_id` resumes from the last committed cursor; a crashed mid-entry txn leaves nothing committed.

---

## 14. Reconciliation Strategy

After the run (per DOCUMENT_31 §11), compute and store on `ProdBackfillProgress`:

```
Δ_input = Σ legacy input-authority          − Σ prod_execution_session.available_input
Δ_acc   = Σ legacy good_quantity            − Σ session.accepted_output
Δ_rej   = Σ legacy rejected_quantity        − Σ session.rejected
Δ_rew   = Σ legacy rework_quantity          − Σ session.rework
Δ_scrap = Σ legacy scrap_quantity           − Σ session.scrap
Δ_wip   = Σ legacy WIP                      − Σ session.wip        (authority-based per record)
```

where each legacy term uses the resolver's `EffectiveInputQuantity` (and produced only as total-output for Category B, which is quarantined and therefore contributes 0 to a successful reconciliation). Add:
- **duplicate detection:** count of `ALREADY_PROJECTED` vs expected;
- **missing projection:** expected sessions vs actual (must reconcile to 0 within the scoped feed);
- **reversal pair balance:** sum of original + mirror sessions/quantities = 0 for each reversed pair.

Outcome: `reconciliationStatus = PASS` (all Δ = 0, no dup/missing, reversal balances) or `FAIL` (→ job `RECONCILIATION_FAILED`, no backfill considered complete).

---

## 15. Rollback Strategy

- Backfill is **additive only**: it inserts `prod_*` rows and never mutates legacy or stock.
- **Rollback = remove exactly the rows the run produced**, scoped by `job_id`/entry outcome, in reverse dependency order: outputs → operations → sessions, then mark outcomes `SKIPPED`/recorded and set `ProdBackfillProgress.status = ROLLED_BACK`.
- **Never** a `DELETE`/`UPDATE` against `production_entry`, `stock_ledger`, or `stock_balance`.
- Compensation for a reversal is additive (a negated mirror), consistent with P3-06, so a rerun/roll-forward, not an in-place edit, is the correction mechanism.
- A rollback plan (list of affected `prod_*` rows + count by outcome) must be printable from a dry run and from the execution report, so a human operator can confirm scope before dropping rows.

---

## 16. Feature-Flag Recommendation

**Decision (recommendation only — not applied):**

The task frames three options:
- **A.** require the existing `production.normalized-ops.enabled` flag;
- **B.** use a dedicated backfill execution flag;
- **C.** manual invocation only by an approved internal command.

**Architecture recommendation: reject A; adopt B + C together.**

Rationale:
- The existing flag (`production.normalized-ops.enabled`, default `false`, env `PROD_NORMALIZED_OPS_ENABLED`) governs the **online write-time projection** (each validated `ProductionEntry` write during normal operation). Backfill is a **distinct, explicit, batched, back-dated** operation — coupling it to the online flag would either (a) silently start back-filling when someone enables online projection, or (b) silently suppress an explicitly-authorized backfill because online ops are off. Both are wrong.
- A **dedicated backfill execution flag** (e.g. `production.backfill.enabled`, default `false`, env `PROD_BACKFILL_ENABLED`) gives a separate, revocable, auditable on-switch for the batched executor.
- **Independently of any flag**, the engine must be **invoked only manually/by an approved internal command** and must **require a dry run first** (`dryRun=true` default). This keeps execution intentional and never automatic at boot or on a schedule.

**Gating rule to implement (Phase B):** projection writing by the engine proceeds only when (dedicated backfill flag ON) AND (invoked through an approved, authorized command path) AND (a dry run of the same scope was performed and reviewed). The engine must refuse to write when any gate is closed, and must log the exact gate state. The existing online flag stays untouched.

---

## 17. Security / Authorization Recommendation

- **No public/unauthenticated API.** The existing dry-run has **no controller** (service-only) — the backfill engine must follow the same posture.
- **Invocation surface:** only an **approved internal command** (e.g. a `@PreAuthorize`-guarded, ADMIN/BACKFILL_OPERATOR-role endpoint, or an operator CLI/console behind the security filter chain). Document that any endpoint is protected and role-gated.
- **Roles:** gate execution to an explicit administrative role (`ADMIN`, or a dedicated `BACKFILL_OPERATOR`); never anonymous (`SecurityConfig` default denies all except the listed permit-all paths — keep backfill off that permit list).
- **Audit:** every run is attributed to `job_id` + actor (`created_by`), outcomes recorded per entry; reconcile report persisted on the progress row.
- **Dry-run-mandatory:** execution path refuses to write unless a dry run of the same scope recently passed.
- **Idempotency/anti-concurrency guard:** single claim via `@Version` + job-id; an already-RUNNING/COMPLETED/ROLLED_BACK job rejects re-entry unless a resume is intended.

---

## 18. Inventory Isolation Proof Plan

Extend the existing pattern (`ProductionBackfillDryRunIntegrationTest.inventoryIsolationStaticScan` + `ProjectionResolverProgressIntegrationTest.projectionInventoryIsolation`) to the new engine:

1. **Static/DI scan:** assert `ProductionBackfillService` bytecode/constructor graph has **zero** references to `StockService`, `ProductionStockBoundary`, `StockBalanceRepository`, and no `stock_ledger`/`stock_balance` usage.
2. **Runtime count-stability:** in an integration test, wrap a (dry + controlled) run and assert `COUNT(stock_ledger)` and `COUNT(stock_balance)` unchanged before/after.
3. **No stock SQL:** grep the new service + its writer for any `INSERT/UPDATE` targeting `stock_*`.
4. **Boundary single path:** confirm the only production→stock bridge remains `ProductionStockBoundary.recordJobCardCompleteGood -> StockService.recordStockIn` (job-card completion) and is untouched by the engine.

Deliverable: all four assertions green in the Phase B test suite.

---

## 19. Legacy Data Protection Proof

1. The engine touches `production_entry` **read-only** (scan via `ProductionEntryRepository` finders/`findById`); it holds no write reference and never calls `save`/`delete` on legacy entities.
2. An integration test snapshots the legacy row values + a checksum (entry_number|process_qty|produced_quantity|good|rejected|rework|scrap) before and after a (dry + controlled) run and asserts **identical**.
3. Assert no legacy column (`process_qty`, `produced_quantity`, `good_quantity`, `rejected_quantity`, `rework_quantity`, `scrap_quantity`) is assigned anywhere in the engine (grep/findings).
4. Confirms the "additive only" invariant: the only inserts land in the five `prod_*` / progress / outcome tables.

---

## 20. File-by-File Implementation Plan (Phase B — NOT in Phase A)

| File | Action | Change (future) |
|------|--------|-----------------|
| `service/ProductionBackfillService.java` (new) | **CREATE** | Orchestrator: dry + executor, scan/resolve/classify/project/record/reconcile/rollback-plan. |
| `service/ProductionBackfillEventWriter.java` (new, package-private) | **CREATE** | Encapsulates natural-key upsert of session/op/outputs (reuse or mirror `ProductionNormalizedEventService` helpers); inventory/legacy-neutral. |
| `dto/backfill/BackfillJobRequest.java`, `BackfillRunResult.java`, `BackfillEntryDecision.java` (new) | **CREATE** | Command + dry-run/execution result DTOs (scopes, dryRun flag, per-entry decisions, reconciliation, rollback list). |
| `service/ProductionBackfillProgressService.java` | **NO CHANGE** | Reused as-is. |
| `service/ProductionInputAuthorityResolver.java` | **NO CHANGE** | Reused as-is. |
| `repo/ProductionEntryRepository.java` | **MAYBE ADD (read-only)** | Optional pageable/findAll-by-id-cursor composite for efficient scoped scans (read-only-only; no mutation). Approval point. |
| `entity/ProdBackfillProgress.java` / `ProdBackfillEntryOutcome.java` | **NO CHANGE** | Reused as-is (optionally add a `BLOCK` outcome value if not present — a Phase-B additive check). |
| `ProductionNormalizedEventService.java` | **NO CHANGE** | Do not alter online flag logic; writer mirrors its helpers (no coupling to online flag). |
| `application.yaml` / `ProductionNormalizedOpsProperties.java` | **NO CHANGE / MAYBE ADD** | Add dedicated `production.backfill.enabled` (default false) only after approval (§16). Do **not** change normalized-ops flag. |
| Controller/CLI wrapper (new, gated) | **CREATE (guarded)** | Internal, `@PreAuthorize` ADMIN/BACKFILL_OPERATOR-only; never public. **No endpoint in Phase A.** |
| Tests (new/extended) | **CREATE** | See §21 + §18 + §19. |
| `V5__prod_backfill_infrastructure.sql` | **NO CHANGE** | Schema already additive; do not edit. |

**Phase B sequencing:** (1) DTOs, (2) writer, (3) orchestrator with dry-path, (4) dedicated flag (gated), (5) internal gated command, (6) reconciliation + rollback-plan, (7) full test suite, (8) inventory + legacy isolation proofs. All additive; nothing applied to live data.

---

## 21. Test Plan

**Unit (resolver + decision logic, no DB):**
- Classification/eligibility mapping for CATEGORY_A/C (ELIGIBLE/resolvable), A over-allocation (BLOCK-by-policy), CATEGORY_B (QUARANTINE, not resolvable, null input), CATEGORY_D (QUARANTINE), D over-allocation (BLOCK), negatives, both-null, reversal mirror (resolvable), reversal-of-B (QUARANTINE).
- Dry-run decision builder: given resolved ELIGIBLE, produces a "would-write" plan with no DB calls.
- Block policy: stop-on-block default vs continue-with-block refusal.
- No legacy/stock symbols referenced (static scan) at unit level.

**Integration (Testcontainer, `@BeforeEach` truncate like existing suites):**
- **Dry execution:** dryRun=true writes **zero** rows (session/op/output/progress/outcome) and reports the ELIGIBLE wouldn't-write set; legacy + stock unchanged.
- **Eligible projection:** a Category-C entry projects session/op/outputs in one txn with resolver available_input and matching WIP.
- **Atomicity:** a forced mid-entry failure rolls back the whole entry (no partial session/op/outputs; cursor unchanged).
- **Idempotency:** re-running the same entry yields `ALREADY_PROJECTED`, no duplicate session/op/outputs.
- **Quarantine:** Category-B record → `QUARANTINED` outcome, no events, effective input null, `quarantine_count` incremented.
- **Block:** over-allocation → BLOCK outcome + stop; no events; job status reflects block.
- **Resume:** after committing entry 2, resume with same job_id starts after `last_successful_entry_id` and re-surfaces only later/eligible entries; crash-sim (no commit) reprocesses the in-flight entry.
- **Reconciliation:** post-run Δ_* = 0 for a clean feed; a planted mismatch → `RECONCILIATION_FAILED`.
- **Rollback plan:** prints the additive `prod_*` rows; rollback removes only those; legacy + stock checksums unchanged.
- **Inventory isolation + legacy protection proofs** (§18, §19) green.

Target: extend the existing 238-test suite; do not regress FE (untouched) or lint baseline.

---

## 22. OFF LIMITS (Never Modify)

- `StockService`, `ProductionStockBoundary`, `StockBalanceRepository`
- `stock_ledger`, `stock_balance` (tables and any row)
- `production_entry` **rows and columns** — never `UPDATE`; never write `process_qty`, `produced_quantity`, `good_quantity`, `rejected_quantity`, `rework_quantity`, `scrap_quantity`
- `ProductionEntryValidationService`
- `ProductionController` and the online write/reversal path
- `V4__prod_normalized_events.sql` (immutable) and any applied migration (additive `V5` already exists; no edit)
- `config/ProductionNormalizedOpsProperties.java` and the `production.normalized-ops.enabled` value (do **not** change/rename; the online flag stays as-is)
- `application.yaml` feature-flag section **for normalized-ops** (a new dedicated backfill flag may be added only under §16 approval)
- `ProductionInputAuthorityResolver`, `ProductionBackfillProgressService`, `ProdBackfillProgress`, `ProdBackfillEntryOutcome`, normalized event entities/repositories — all **NO CHANGE** (reused)

---

## 23. Go / No-Go Recommendation

**Recommendation for the FUTURE Phase B: GO (conditional, additive, dry-first).**

Rationale:
- The design is fully unblocked architecturally: resolver (RC-1) and progress/outcome backbone (RC-2) exist; normalized event tables + natural-key idempotency exist; inventory isolation and legacy protection patterns are established.
- **Critical caveat:** there is currently **no ELIGIBLE record** in the live DB. The sole record `PE/2026-27/00001` is CATEGORY_B / QUARANTINE and must not be auto-backfilled until an **explicit approved manual resolution** exists (DOCUMENT_33 → B). Therefore building the engine is safe and worthwhile, and its *only *correct dry-run outcome today is "nothing eligible; quarantine PE/2026-27/00001." It must **defend that** and refuse live execution.
- **Conditions for Go (Phase B):** (1) dedicated backfill execution flag, default OFF (§16); (2) internal, authorized, role-gated invocation only (§17); (3) dry-run mandatory before any write (§16); (4) stop-on-block default (§12); (5) inventory + legacy isolation proofs shipped with the tests (§18/§19); (6) no live execution until a record is explicitly resolved → ELIGIBLE **and** an operator approval is recorded.
- **No-Go triggers:** any single gate above is skipped; any write path touches legacy/stock; any auto-trigger; any public unauthenticated endpoint; any produced→process auto-conversion.

**STOP — Phase A is complete. No code, no migration, no backfill, no flag change, no live data change. Await explicit approval to proceed to Phase B.**

---

## Change Log

- Created DOCUMENT_34 (P3.3 Phase A read-only analysis): current architecture summary, backfill service responsibilities, dependency graph, resolver integration, eligibility matrix, CATEGORY_B rule, transaction boundary, progress/resume lifecycle, idempotency/duplicate/quarantine/block/failure handling, reconciliation, rollback, feature-flag recommendation (reject A; adopt B+C), security/authorization, inventory isolation + legacy protection proof plans, file-by-file Phase B plan, test plan, OFF LIMITS list, and conditional GO recommendation. **No files modified. STOP.**