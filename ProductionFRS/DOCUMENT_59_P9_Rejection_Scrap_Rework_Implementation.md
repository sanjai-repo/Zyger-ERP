# DOCUMENT_59 — P9 — REJECTION / SCRAP / REWORK — IMPLEMENTATION CONTRACT

| Field | Value |
|---|---|
| Document ID | DOCUMENT_59 |
| Title | P9 — Rejection / Scrap / Rework — Implementation Contract |
| Document Type | Implementation contract (audit → contract → implement → verify) |
| Module | Production (P9) |
| Status | IMPLEMENTED_AND_VERIFIED (per §24 verification; gates green, STOP conditions reported in §23) |
| Authorization | P9 — REJECTION / SCRAP / REWORK (controlled implementation authorization) |
| Prior state | P8 Capability A `IMPLEMENTED_AND_VERIFIED` (DOCUMENT_58); git clean of commits, staged 0 |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |

---

## 1. Current Architecture (source-verified)

Committed Production records rejection/rework/scrap as **child line items of the Production Entry**,
not as first-class documents:

- `production_entry` carries `good_quantity`, `rejected_quantity`, `rework_quantity`,
  `scrap_quantity`, `process_qty`, `produced_quantity`, `quality_status`, `status`
  (`DRAFT/POSTED/SUBMITTED/APPROVED/CANCELLED/REVERSED`).
- `production_entry_rejection` (`reason_code`, `reason_description`, `quantity`) and
  `production_entry_rework` (`+ target_process_code`) are entry-level child tables (V1 baseline:
  lines 5608 / 5636). Scrap has **no** child table and **no** scrap reason/disposition anywhere.
- Entry POST (`ProductionController.productionEntryAction` "post", L384-457) validates (V-08
  rejected>0 ⇒ reasons required + sum(reason.qty)==rejected; V-09 rework>0 ⇒ reasons required),
  updates the subjob (`completed/rejected/rework/scrap` roll-up, L397-424), sets `POSTED`, persists
  the `X-Idempotency-Key`, projects the P3 normalized events, writes the POST audit. **No quality-gate
  check and no stock posting.**
- Entry REVERSE (L458-580) creates a negated mirror `PE-REV`, decrements subjob mirrors (floored at 0),
  sets original `REVERSED`, audits, projects the compensating mirror.
- Subjob ↔ Route Operation mapping is 1:1 via `JobCardSubjob.operation_code` (CLAR-PROD-005); route is
  frozen by V-22 (posted entries cannot be edited). `JobCard` has `@Version`; `JobCardSubjob` has no
  `@Version`.
- Numbering uses `DocNumberService` (`doc_sequence` + `numbering_config`); V2 seeds
  job-card/production-entry/product-conversion/production-return/production-log-sheet/idle-time-entry.
  **No rejection/scrap/rework doc type is registered.**
- Inventory: entry POST/REVERSE never touch `StockService`/`stock_ledger`/`stock_balance`; FG receipt
  happens only at Job Card complete (`ProductionStockBoundary` → `stockService.recordStockIn`, dedupe
  via `(docNo, docType)`); Consumption POST writes one physical OUT per line; Production Return maps
  condition→stockStatus (`SCRAP→SCRAP`, `REWORK/QC_HOLD→QC_HOLD`, else FREE). **P6 Model B-a intact.**
- Quality: `quality_status` on the entry is recorded (default `PENDING`), JobCardService holds
  (`QUALITY_HOLD`/`PRODUCTION_HOLD`); there is **no gate check at entry POST**. A separate stub
  (`production/api`) writes only `prod_operation_execution_event` (V6) — not part of this capability.
- Frontend: `ProductionEntryScreen.tsx` collects rejected/rework quantities + reason modals,
  `ProductionRejectionScreen.tsx` is a read-only report; routing via `config/screenRegistry.tsx` +
  `config/navigation.ts`; API via `src/services/*Api.ts` + `apiClient`.

## 2. Approved Business Rules (DOCUMENT_57 §4, applied 1:1)

| ID | Adopted rule (applied verbatim) |
|---|---|
| ADR-PROD-003 | Rejection / Scrap / Rework = **CREATE NEW first-class documents**. |
| ADR-PROD-004 | Numbering **REUSE** `DocNumberService` + `doc_sequence` + `numbering_config`; register all Production doc types; BR-NUM-001 never-reuse. |
| ADR-PROD-005 | **REUSE** `StockService`; Production never writes `stock_ledger`/`stock_balance` directly. |
| CLAR-PROD-002 | WIP formula retained: `WIP = max(resolvedInput − (good + rejected + rework + scrap), 0)`; `produced = good + rework + rejected`; rejected split **R1** via first-class disposition documents; unclassified remainder stays `rejected` (WIP shows it). |
| CLAR-PROD-005 | Subjob ↔ Route Operation 1:1; route frozen once an entry is posted; rework as rework-route subjobs. |
| CLAR-PROD-011 | Batch identity mandatory at rejection/rework/scrap **for batch/lot-controlled items only**. |
| CLAR-PROD-012 | Gate enforced by default at operation/subjob completion and entry post; Production = record output + override request; Quality = inspection status/disposition. |
| CLAR-PROD-003 + D-C1 | Strict disposition; unknown disposition is a **validation error (never FREE)**; only FREE/QC_HOLD to counted balances; SCRAP via controlled posting. |
| BR-PROD-REJ-001 (DOC_46) | Rejection classification/disposition = `{REWORKABLE, SCRAP, HOLD_MRB}`; scrap/hold disposition owned by Quality. |
| BR-PROD-SCRAP-001 | Scrap control: qty/reason/authorization; reversal restriction. |
| BR-PROD-REWORK-001 / FR-PROD-ENTRY-002 | Rework qty ≤ authorized, sourced; rework op event linked to original + NCR + qty cap. |
| FRS §21.2 (DOC_07) | Number formats (not invented): Rejection `REJ-{PLANT}-{FY}-{SEQ}` (NUM-PROD-REJ), Scrap `SC-{PLANT}-{FY}-{SEQ}` (NUM-PROD-SCRAP), Rework Entry `PER-{PLANT}-{FY}-{SEQ}` (NUM-PROD-ENTRY-REWORK). |
| FRS §22 (DOC_07) | Global doc state machine subset: `DRAFT → SUBMITTED → APPROVED → POSTED → CLOSED`; lateral `CANCELLED`, `REVERSED`. |

## 3. Current Gaps (source-verified)

1. Rejection/rework/scrap are entry child rows, **not** first-class documents (ADR-003 un-met).
2. **No numbering registration** for REJ / SC / PER (ADR-004 un-met).
3. **No R1 disposition records** — `rejected` has no classification into REWORKABLE/SCRAP/HOLD_MRB.
4. **No scrap reason/disposition model** at all; scrap has no first-class record (BR-PROD-SCRAP-001,
   D-C1 un-met).
5. No rework document with source/target operation + NCR + authorization linkage (FR-PROD-ENTRY-002).
6. No reversal/audit/idempotency for any rejection/scrap/rework disposition record.
7. No frontend entry for first-class rejection/scrap/rework documents (report is read-only).

## 4. Target Behavior

Three first-class, number-controlled disposition documents — **Rejection/Defect Record** (`REJ`),
**Scrap** (`SC`), **Rework** (`PER`) — created against a POSTED Production Entry, recording
operational facts (quantity / reason / item / disposition / batch where controlled / source and
target operation for rework). Lifecycle `DRAFT → SUBMITTED → APPROVED → POSTED → CLOSED`
(± `CANCELLED`, `REVERSED`). Posting converts the entry's reported rejected/scrap/rework totals into
classified, auditable disposition records (R1). **The entry quantities, WIP, produced/pending,
subjob roll-ups, normalized events, and stock balances are NEVER modified by disposition documents.**

## 5. Lifecycle

| Transition | Rule | Audit event |
|---|---|---|
| CREATE (draft) | Number reserved `REJ/SC/PER-{P}-{FY}-{SEQ}`; lines must be internally valid | CREATE |
| SUBMIT | status `DRAFT → SUBMITTED`; backdated-guard not applicable (records reference a POSTED entry) | SUBMIT |
| APPROVE | status `SUBMITTED → APPROVED` | APPROVE |
| POST | only `DRAFT/**SUBMITTED/APPROVED** → POSTED`; full validation; X-Idempotency-Key; original facts immutable | POST |
| REVERSE | only `POSTED → REVERSED`; creates negated mirror doc (`is_reversal=true`, `reversed_from_doc_id`, status `POSTED`); original keeps number (BR-NUM-001) | REVERSE |
| CANCEL | only `DRAFT/SUBMITTED/APPROVED → CANCELLED` (never after POST) | CANCEL |
| CLOSE | `POSTED → CLOSED` (adminclose of completed disposition) | CLOSE |

Duplicate POST (same key) returns the already-processed document idempotently. POST after REVERSED and
REVERSE after REVERSED are rejected (validation error / no-op per existing guard pattern).

## 6. Quantity Rules

- Every line quantity must be `> 0`; negative or zero → validation error.
- **Rejection doc:** `Σ line.quantity ≤ entry.rejectedQuantity` (unclassified remainder stays
  `rejected`; WIP shows it — R1). Quantities are **facts about the already-reported rejected total**;
  entry `rejected_quantity` is NOT modified.
- **Scrap doc:** `Σ line.quantity ≤ entry.scrapQuantity` (facts about the reported scrap bucket;
  entry `scrap_quantity` NOT modified). No source multiplier; no acceptance of qty from the rejected
  bucket (the rejected→scrap linkage via a rejection line with disposition=SCRAP is recorded on the
  **rejection** document; converting it into an additional scrap-doc capacity is a documented gap —
  see §22 — not an invented rule).
- **Rework doc:** `Σ line.quantity ≤ entry.reworkQuantity` (+ optional per-line `qty cap` reference
  to authorization per FR-PROD-ENTRY-002); entry `rework_quantity` NOT modified.
- `resolvedInput`, `good`, `rejected`, `rework`, `scrap`, WIP and pending are untouched; the CLAR-002
  formula is preserved byte-for-byte (no reimplementation, no new derivation).

## 7. WIP Effect

**None.** Disposition documents classify already-committed entry totals; they never enter the WIP /
produced / pending derivation and never write `prod_execution_session.wip`, `prod_output_event`, or
any normalized-event table. Regression test asserts WIP row is byte-identical before/after POST of a
disposition document.

## 8. Rejection Semantics

- First-class Rejection/Defect Record (doc number `REJ-…`), linked to
  `production_entry` (verified POSTED, not REVERSED), subjob number + operation code (CLAR-005 1:1),
  candidate part. Lines carry `item_code`, `quantity`, `reason_code` (from `reject_reason_master`),
  `disposition ∈ {REWORKABLE, SCRAP, HOLD_MRB}` (BR-PROD-REJ-001), `batch_number` when the item is
  batch/lot-controlled (CLAR-011), quality linkage (`ncr_number`, `inspector`, `inspection_date`
  recorded as references — Quality owns their lifecycle).
- R1: a rejection line with `disposition=REWORKABLE` is the disposition that anchors a future rework
  entry; `SCRAP` anchors a future scrap record; `HOLD_MRB` anchors MRB/quarantine. The cross-document
  **auto-generation** is NOT implemented (Quality-owned / documented gap — see §22). Posting a
  rejection document only **classifies** the already-reported rejected total.

## 9. Scrap Semantics

- First-class Scrap document (`SC-…`) linked to the POSTED entry + subjob + operation.
- Lines: `item_code`, `quantity`, `reason_code`, `disposition ∈ {SCRAP, HOLD_MRB}` (subset of the
  approved BR-PROD-REJ-001 enum, never FREE), `batch_number` when controlled, `warehouse`/`location`
  for the physical record.
- **D-C1 enforced:** disposition is mandatory; unknown/unsupported disposition → validation error.
  `FREE` is not a scrapeable disposition.
- **Physical stock effect (STOP):** the approved decisions do not fully specify *Inventory* stock-status
  behavior for scrap (D-C1 requires "segregated countable status only via a separate Inventory ADR").
  P9 therefore **records the disposition only and performs NO stock movement** — no `StockService`,
  no `stock_ledger`, no `stock_balance`, no `qcHold`. The physical stock-status posting is reported as
  a blocking/inventory-owned gap (authorization §8 STOP rule).

## 10. Rework Semantics

- First-class Rework document (`PER-…`) linked to the POSTED entry + subjob + operation.
- Lines: `quantity` (≤ authorized cap ref), `reason_code`, `source_operation_code`
  (the operation that produced the defect), `target_operation_code` (the rework-route operation —
  CLAR-005 rework as rework-route subjobs, 1:1), `ncr_number` + `authorization_number` reference
  fields (FR-PROD-ENTRY-002 linkage), `batch_number` when controlled.
- No new rework-routing model; the existing route/subjob/operation architecture is referenced only.

## 11. Job Card / Subjob Relationship

- Disposition documents reference `jobCardNumber` + `subjobNumber` + `operationCode`; a matching
  subjob must exist (validated). No subjob mutation, no route mutation, nonumbering change. The
  1:1 Subjob↔Route-Operation contract and freeze-on-post are preserved untouched (V-22 governs the
  entry; disposition docs never re-open a route).

## 12. Quality Gate Interaction (CLAR-PROD-012)

- Implemented: the entry must be `POSTED` (its post-phase gate passed) and not `REVERSED` before any
  disposition document can be created/posted; disposition + NCR + inspector references are recorded as
  production-side operational facts (CLAR-012: Production = record output + disposition references).
- **Not implemented (STOP/gap):** blocking disposition POST based on a Quality inspection state
  machine (PENDING/FAIL/HELD) and Joint-override flows are Quality-module behaviors not specified for
  disposition documents in the approved set; Quality-side disposition *approval* remains Quality-owned.
  Reported in §22. No additional Quality roles invented.
- No existing Quality workflow is created or modified.

## 13. Inventory Boundary

- **Zero** inventory writes. No `StockService`, `stock_ledger`, `stock_balance`, `qcHold` call from
  any disposition-code path. P6 Model B-a (MR ISSUE = reservation Effect=NONE; Consumption POST =
  release + one physical OUT) untouched. No duplicate stock movements: disposition documents produce
  no stock movements at all (integration test asserts ledger/balance counts byte-identical).

## 14. Idempotency

- POST accepts `X-Idempotency-Key` (or `Idempotency-Key`); persisted in a new additive table
  `production_doc_posting_key` (unique key). Repeat with same key → returns the already-processed
  document (SUCCESS) with no side-effects. Guarded: re-POST of a POSTED doc is a no-op/validation
  error; REVERSE after reversal rejected; POST after reversal rejected. Frontend busy-guards and
  generates the key per post attempt (mirror of the entry screen pattern).

## 15. Transaction Boundary

Each action is `@Transactional` on the service; validation failure → zero partial persistence;
posting failure → atomic rollback; reversal failure → atomic rollback. No distributed transactions.

## 16. Concurrency

- `doc_sequence` reservation uses the existing pessimistic `findByKeyAndYearForUpdate` locking.
- Document `version` column (optimistic, `@Version`) on each header; `OptimisticLockException → 409`
  already mapped by `GlobalExceptionHandler`.
- Simultaneous POST on the same doc guarded by status transition + unique idempotency key.

## 17. Authorization

- REST endpoints sit under `/api/v1/production/**` (authenticated; existing `@RequirePermission`
  aspect pattern with module=PRODUCTION for the controller). No SecurityConfig change.

## 18. API

THREE resource groups (one controller, matching the existing `ProductionController`
single-controller convention):

```
GET    /api/v1/production/rejections                 list
GET    /api/v1/production/rejections/{id}            get (with lines)
POST   /api/v1/production/rejections                 create draft (body = doc + lines)
PUT    /api/v1/production/rejections/{id}            update draft
POST   /api/v1/production/rejections/{id}/actions/{action}   submit|approve|post|reverse|cancel|close
GET|POST|PUT.../scraps   ...   (same actions)
GET|POST|PUT.../reworks  ...   (same actions)
```

Body for rejection: `entryId`, `jobCardNumber`, `subjobNumber`, `operationCode`, `inspectionDate`,
`inspector`, `ncrNumber`, `lines[{itemCode,quantity,uom,reasonCode,disposition,batchNumber,
location,remarks}]`. Scrap: `lines[{itemCode,quantity,uom,reasonCode,disposition{SCRAP,HOLD_MRB},
batchNumber,warehouse,location,remarks}]`. Rework: `lines[{quantity,reasonCode,sourceOperationCode,
targetOperationCode,ncrNumber,authorizationNumber,batchNumber,remarks}]`. Reversal body:
`{"reversalReason":"..."}`. POST body optional; idempotency via header.

## 19. UI

Three screens registered in `screenRegistry.tsx` + `navigation.ts` (Production → Execution group):
`Rejection Records`, `Scrap Records`, `Rework Records`. Each: list (doc number/entry/status/qty
badge), create draft (lines editor with client validation mirroring §6), submit/approve/post buttons
(state-aware), reverse with mandatory reason modal, cancel for pre-post states, busy guards, safe
error toasts (RFC-7807 `detail`), no localStorage, no unrelated redesign. API client functions in
`src/services/productionDispositionApi.ts`.

## 20. Database (single additive migration V8)

`V8__production_disposition_documents.sql`:
- `production_rejection_doc`, `production_rejection_line`
- `production_scrap_doc`, `production_scrap_line`
- `production_rework_doc`, `production_rework_line`
- `production_doc_posting_key` (idempotency)
- numbering_config seeds: `rejection-document → REJ`, `scrap-document → SC`, `rework-document → PER`
  (ON CONFLICT DO NOTHING)
- all FKs `ON DELETE CASCADE` on lines, header `doc_number` UNIQUE, line qty `CHECK (quantity > 0)`,
  disposition columns with `CHECK` on strict enum where feasible, indexes on `(entry_id)` and line FKs.
- Additive only; no destructive change; no historical Production data touched.
  (dev/test create schema from entities — entities mirror DDL exactly.)

## 21. Tests

**Unit — `ProductionDispositionValidationServiceTest`**: three families × valid / zero qty / negative
qty / excessive qty (> entry bucket) / invalid disposition (incl. FREE→error, D-C1) / missing reason /
missing item / batch-controlled missing batch / rework missing target op / entry not POSTED / entry
REVERSED / duplicate lines.

**Unit lifecycle — `ProductionDispositionServiceTest`**: create(posted) numbers reserved once &
BR-NUM-001; submit/approve/post transitions; post idempotency (same key no side-effects); re-post
guard; reverse creates negated mirror (status/quantities negated) and original→REVERSED; reverse after
reverse rejected; rollback on validation failure (zero partial persistence); WIP/entry/subjob/stock
repos never invoked.

**Integration — `ProductionDispositionIntegrationTest`** (Testcontainer + MockMvc + adminToken): full
entry create→post → rejection doc create→approve→post (R1 classification, sum ≤ entry.rejected);
scrap doc post → disposition recorded, D-C1 400 on unknown disposition; rework doc post; WIP row
identical before/after; `stock_ledger`/`stock_balance` counts identical before/after; repeated POST
idempotent; reversal negates; entry reversal then new disposition rejected.

**Regression hurdles**: full `./gradlew test`; entry, multiple-output (P8), return, conversion,
consumption, job-card, idle-time, log-sheet, reports, backfill suites must stay green.

## 22. Out-of-Scope Items (explicit)

Batch Card, Production Return redesign, Product Conversion redesign, Quality module redesign and all
Quality-side disposition approval/NCR workflow, Consumption History, Costing, Planning, Maintenance,
P3.4 backfill, normalized-event redesign, Inventory stock-status / segregated-countable handling for
scrap, auto-generation of Scrap/Rework documents from Rejection disposition lines, batch/allotment UI,
additional rejection categories beyond BR-PROD-REJ-001, new numbering series beyond the three
documented in FRS §21.2.

## 23. Stop Conditions (all triggered conditions reported, none silent)

1. **Scrap physical stock movement** — STOP-implies not implemented: Inventory stock-status behavior
   not fully specified by approved decisions (needs separate Inventory ADR per D-C1/CLAR-003). Recorded
   only; reported in §22/§9.
2. **Quality-state-blocked disposition posting / joint override** — STOP: not covered for disposition
   documents by CLAR-012; Quality-side behavior remains Quality-owned.
3. **Rejection→scrap-doc capacity linkage** — STOP: converting R1-classified-SCRAP into additional
   scrap-doc quantity is not an approved quantity rule; recorded as a documented gap.
4. No other stop conditions triggered (no numbering invention — REJ/SC/PER are FRS §21.2 documented;
   no WIP/inventory/quality/route/freeze violation).

---

## 24. Post-Implementation Verification Record

### 24.1 Backend gates (all executed via Gradle in `zyger-erp-backend`)

| Gate | Result |
|---|---|
| `compileJava` / `compileTestJava` | PASS |
| `./gradlew build` | PASS |
| `./gradlew test` (full suite) | PASS — 77 classes, 366 tests, 0 skipped, 0 failures/errors |
| `ProductionDispositionServiceTest` (unit) | PASS — 17/17 |
| `ProductionDispositionIntegrationTest` (end-to-end, Testcontainers Postgres 16) | PASS — 7/7 |

### 24.2 Frontend gates (via `npm` in `zyger-erp-frontend`)

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run lint` | 31 errors / 762 warnings — errors unchanged vs 316-line baseline; P9 files add 1 warning (standard data-fetch-in-effect pattern present across existing screens), 0 errors |

### 24.3 Verification scope mapped to controls

| # | Control | Verified by |
|---|---|---|
| V-0 | REJ / SC / PER numbering via `DocNumberService` + `doc_sequence` + `numbering_config` (BR-NUM-001, no reuse) | Integration: full workflow creates `REJ-…`; scrap creates `SC-…`; rework creates `PER-…`; reversal mirrors `REJ-RV` / `SC-RV` / `PER-RV` |
| V-1 | `POSTED`, non-reversed entry required on CREATE and on POST; reversed entry rejected 400 | Integration: `disposition against a reversed entry is rejected with 400` |
| V-2 | Strict disposition sets (D-C1): rejection `{REWORKABLE, SCRAP, HOLD_MRB}`, scrap `{SCRAP, HOLD_MRB}`; unknown → validation error (message contains `D-C1`) | Integration + unit |
| V-3 | Batch identity mandatory only for batch/lot-controlled items (CLAR-PROD-011) | Integration: batch-controlled item without batch → 400 with `"Batch identity"` message |
| V-4 | Rework requires `targetOperationCode` (CLAR-PROD-005); caps at rework bucket | Integration: rework test |
| V-5 | Σ lines ≤ entry bucket (rejected / scrap / rework) | Integration: `exceeds the available … quantity` 400s |
| V-6 | Lifecycle `DRAFT→SUBMITTED→APPROVED→POSTED→CLOSED`, lateral `CANCELLED`/`REVERSED`, guarded transitions | Unit 17/17 + integration workflow test |
| V-7 | Posting idempotency: repeated POST with same key → no duplicate doc, one `production_doc_posting_key` row | Integration: `posts idempotently and writes posting key`; unit |
| V-8 | Reversal creates negated mirror (REJ-RV/SC-RV/PER-RV), original → `REVERSED` | Integration: `reversal creates SC-RV mirror with negated lines` |
| V-9 | Recording-only: zero WIP / entry-quantity / subjob / normalized-event / `stock_ledger` / `stock_balance` mutation | Integration: `recording only` invariants (session WIP, entry columns, `prod_output_event`, stock tables unchanged) |
| V-10 | Audit trail incl. `reversalReason`, no silent errors; docs require documented numbering | Unit + service audit save ordering test |
| V-11 | Security: `@RequirePermission(module="PRODUCTION", …)` on all endpoints | Controller annotation present |
| V-12 | Frontend: 3 lifecycle screens + typed API service, nav + registry entries | typecheck / build / lint gates |

### 24.4 Defects surfaced and fixed during verification

1. **Pre-existing alias-clear defect (not P9-authored):** `ProductionEntry` child setters
   (`setOperators/setRejectionReasons/setReworkReasons/setMaterials/setBatchAllocations`) call
   `clear()` on the list instance they are about to iterate, so `setX(getX())` in
   `ProductionController.create/update` silently dropped persisted child rows (validation ran first,
   so creation "passed"). Fixed in `ProductionController` via a `copyFresh(List)` helper wrapping all
   rebind calls; regression-anchored in the integration helper (child rows asserted present after
   entry create).
2. **Audit-before-save → `doc_id` NOT NULL violation:** create-time audit row was written before the
   document row, aborting the transaction with 500. Fixed by reordering save-before-audit in all
   three `createX` methods.
3. **Jackson 3 field-access binding bypasses setters:** the `setLines(...)` rebind (which assigns
   `lineNo` and the doc back-reference) is not invoked during `tools.jackson` deserialization, so
   `line_no` was NULL (NOT NULL → 500). Fixed by `doc.setLines(doc.getLines())` normalization in each
   `createX`; verified via integration (documents now persist `line_no`).

### 24.5 Final status

**IMPLEMENTED_AND_VERIFIED** — P9 rejection/scrap/rework first-class disposition documents are
implemented end-to-end (migration, entities/repos, service, controller, unit + integration tests,
frontend screens + API service, navigation/registry) and verified against controls V-0…V-12 through
green backend and frontend gates. Stop conditions in §23 remain documented as reported (no silent
triggering). No commits were created; repository state per §24 git rules (HEAD `0781e1a`, staged 0).

---

*End of DOCUMENT_59 — implementation contract with post-implementation verification (§24).*