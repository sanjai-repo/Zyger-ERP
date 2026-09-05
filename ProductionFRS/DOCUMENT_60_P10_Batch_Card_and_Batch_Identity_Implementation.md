# DOCUMENT_60 — P10 — BATCH CARD & BATCH IDENTITY — IMPLEMENTATION CONTRACT

| Field | Value |
|---|---|
| Document ID | DOCUMENT_60 |
| Title | P10 Batch Card & Batch Identity — Implementation Contract |
| Module | Production (P10) |
| Capability | Batch Card (DOCUMENT) + Batch Identity + Manual Allocation |
| Status | IMPLEMENTED_AND_VERIFIED (per §24 verification) |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Authorization | 26-section controlled-implementation prompt (P10) |
| Approved Decisions | CLAR-PROD-011, Batch Card DOCUMENT (DOC_57 §4 #12), ADR-PROD-004 (numbering) |

---

## 1. Approved Business Decisions

| ID | Decision | Adopted Rule |
|---|---|---|
| CLAR-PROD-011 | Batch/Lot policy | Batch + lot distinct dimensions where the business tracks both; heat number captured; identity mandatory at output/rejection/rework/scrap/return/conversion for batch/lot-controlled items only; allocation rule = manual select / FIFO / FEFO (selected at design); multi-batch consumption decomposed per batch; per-batch WIP/rejection/rework/scrap for controlled items |
| Batch Card (DOC_57 §4 #12) | Architecture | DOCUMENT (execution + traceability); number BC-{PLANT}-{FY}-{SEQ} (NUM-PROD-BATCH); DocTypes + numbering_config registration (ADR-004); lifecycle: OPEN/HELD/CLOSED; audit trail; links to Production Entry / Job Card / Route Operation / Inventory batches; BC number = document number; physical batch number separate |
| ADR-PROD-004 | Numbering registration | REUSE DocNumberService + doc_sequence + numbering_config; register BC in numbering_config |
| ADR-PROD-005 | Inventory posting | Production never writes stock_ledger/stock_balance; Batch Card does not bypass this boundary |

**Design Selection (within CLAR-PROD-011 authorized range):**
Allocation rule = **MANUAL SELECT** — user manually selects physical batches and allocates quantities. Chosen at design time per CLAR-011; the simplest allocation rule that avoids needing FIFO/FEFO inventory-position ordering (which would require Inventory history queries beyond the approved boundary). Manual allocation is fully consistent with CLAR-PROD-011's approved policy.

## 2. Current Architecture

The P9 disposition documents (Rejection/Scrap/Rework, DOCUMENT_59) provide the proven building blocks that P10 mirrors:

- `ProductionDispositionDocBase` (MappedSuperclass) → header fields; LAZY `@OneToMany` lines; `setLines()` aliasing-safe rebind
- `DocNumberService.next(docType, prefix)` with `numbering_config` seed
- `WorkflowStateMachine.validateTransition(docType, status, action)`
- `ProductionDocPostingKey` (reuse for idempotency)
- `@RequirePermission(module = "PRODUCTION", ...)` + `GlobalExceptionHandler`
- P9 audit-log pattern (`try/catch` around audit save, `production_disposition_audit_log`)
- P9 integration test pattern (Testcontainers PostgreSQL, MockMvc, child-row assertions)

**Numbering:** P9 uses `numbers.next("rejection-document", "REJ")` → format `REJ-YYYY-0001`. P10 follows the identical path: `numbers.next("batch-card", "BC")` → `BC-YYYY-0001`. The plant segment per FRS BC-{PLANT}-{FY}-{SEQ} is a committed deviation across all production docs (plant segment present in `numbering_config` but unused by the production `next()` overload) — documented identically in P8/P9.

## 3. Current Batch Limitations

Before P10, batch tracking exists only as:
- `ProductionEntryBatch` entity (table `production_entry_batch`) — a child list on ProductionEntry capturing output batch allocations (batch_number, allocated_qty, warehouse_code, batch_type OUTPUT); validated by `ProductionEntryValidationService` V-20 (`Σ allocatedQty = goodQuantity or processQty`); never read beyond validation.
- `ItemMaster.batchControl` / `requiresBatch` boolean flags (item is batch/lot-controlled).
- `StockBalance.batch_no` / `heat_no` fields (Inventory carries batch identity for stock, not production-traced).
- **No first-class Batch Card document exists in code** — `prod_batch_card`/`prod_batch_move` mentioned in FRS §25/§26 only as planned tables.

**P10 resolves this gap** by creating the Batch Card as a first-class DOCUMENT that formalizes batch identity and allocation for production output, without modifying any existing tables.

## 4. Batch Card Lifecycle

**States (approved — DOC_56 §7.6, FR-PROD-BATCH-001):** `OPEN` → `HELD` ↔ `OPEN`; `OPEN/HELD` → `CLOSED` (final).

**No other states.** Lifecycle does NOT include DRAFT/SUBMITTED/APPROVED/POSTED/REVERSED — those are not approved for Batch Card.

**Reversal (compensating mirror):** Not a state change on the original card. A reversal creates a new mirror Batch Card (is_reversal=true, status CLOSED, allocations negated). Original card remains CLOSED. This preserves the approved lifecycle while providing an auditable reversal record.

**WorkflowStateMachine registration:**

```java
Map.entry("batch-card", Map.of(
    "OPEN", Set.of("HOLD", "CLOSE"),
    "HELD", Set.of("REOPEN", "CLOSE")
))
```

## 5. Batch Identity Model

| Dimension | Field | Status | Notes |
|---|---|---|---|
| Physical batch number | `physical_batch_number` | **Mandatory** for batch/lot-controlled items | User-entered identity; separate from BC doc number |
| Lot number | `lot_number` | Optional | "distinct dimensions where the business tracks both" (CLAR-011) |
| Heat number | `heat_number` | Optional (captured) | CLAR-011: "heat number captured" |
| Item | `item_code` + `item_name` + `uom` | Mandatory | From Production Entry output; **card creation restricted to batch/lot-controlled items** (`batchControl || requiresBatch` on ItemMaster, per CLAR-011) |
| Card quantity | `quantity` | Mandatory > 0 | The production run quantity attributed to this card |
| Entry link | `entry_id` + `entry_number` | Mandatory FK | Snapshot from Production Entry |
| Job card | `job_card_number` | Snapshot | From Production Entry |
| Subjob | `subjob_number` | Snapshot | From Production Entry |
| Route operation | `operation_code` | Snapshot | From Production Entry (CLAR-005 1:1 verified) |
| Status | `status` | OPEN / HELD / CLOSED | Approved lifecycle |
| Reversal fields | `is_reversal`, `reversed_from_doc_id`, `reversal_reason` | Per mirror docs | Same pattern as P9 |

## 6. Numbering

**Registration:** `numbering_config` seed row (V9):
```sql
(true, 'batch-card', 4, 'BC', true, '-', true, true, 6)
```

**Number generation:** `numbers.next("batch-card", "BC")` → format `BC-YYYY-0001`.
Reserve on first successful draft save (CREATE = first save); stable thereafter; no renumber on update or transitions. BR-NUM-001 (never-reuse) respected.

**Reversal mirrors:** `numbers.next("batch-card", "BC-RV")` → `BC-RV-YYYY-NNNN`.

**DocTypes registration:** `reg("batch-card", "BC", Effect.NONE, "BATCH_CARD", null, true)` — recording-only, no stock effect. Satisfies ADR-PROD-004 explicit Batch Card registration requirement.

## 7. Allocation Rule (Manual Select)

### 7.1 Structure

Allocation lines (table `production_batch_card_allocation`) decompose the card's total quantity into physical batch runs.

| Line field | Description | Constraint |
|---|---|---|
| `batch_number` | Physical batch identity | NOT NULL; **unique per card** (anti-duplicate allocation) |
| `lot_number` | Lot (optional) | NULL allowed |
| `heat_number` | Heat (optional) | NULL allowed |
| `quantity` | Allocated to this batch | `CHECK (quantity <> 0)` — sign enforced by service |
| `location` | Storage location | Default 'STORE' |

### 7.2 Validation Rules

- **line quantity ≠ 0** (DB CHECK); service enforces **> 0** for non-reversal cards, **< 0** for reversal mirrors.
- **Duplicate allocation:** same `batch_number` on same card → validation error `"Batch {X} is already allocated on this card."` (DB UNIQUE index `uq_batch_alloc_batch` also enforces this).
- **Partial allocation allowed:** `Σ allocated ≤ card.quantity`. Remaining = `card.quantity − Σ allocated ≥ 0`. Full allocation not required at any point.
- **Exhaustion:** `Σ qty of all non-reversal cards for (entryId, itemCode) + new card qty ≤ entry output bucket` (goodQuantity for primary item; output quantity for co/by items). Prevents double-counting.
- **Card quantity > 0** (service); `CHECK (quantity <> 0)` in DB header.

### 7.3 Allocation Behavioral Tests

| Test | Scenario | Expected |
|---|---|---|
| One batch | One line, full qty | PASS |
| Multiple batches | Multiple lines, sum ≤ card qty | PASS |
| Partial allocation | Lines sum < card qty | PASS (remaining = card − Σ) |
| Remaining allocation | Add lines in separate updates until sum = card qty | PASS |
| Duplicate allocation | Same batch_number twice | 400 error |
| Duplicate creation | Same entry + physical batch (non-reversal) | Returns the existing card (idempotent, 200) — service pre-check throws `DuplicateBatchCardException`, controller returns the original |
| Idempotent create | Concurrent create, DB-level uniqueness collision | Loser degrades to the existing card via `safeSave` fallback |
| Reversal mirror | Negated allocations, original stays CLOSED | PASS |
| Reversed entry rejected | Create card against reversed entry | 400 error |

## 8. Production Entry Relationship

- **Entry must be POSTED and non-reversed** at: CREATE, UPDATE (of open card), CLOSE, REVERSE-mirror build. Mirrors P9's `requirePostedEntry` pattern.
- **Controlled-item scope:** the card's `itemCode` must identify a batch/lot-controlled item (`batchControl || requiresBatch` in ItemMaster) AND be an output of the referenced entry (`entry.partCode` OR `additionalOutputs[].itemCode`, P8 multi-output). Non-controlled item, or item that is not an entry output → 400.
- **Quantity bucket:**
  - For primary item (`partCode`): bucket = `entry.goodQuantity`
  - For co/by additional output item: bucket = `additionalOutput.quantity` for matching `itemCode`
- **Exhaustion check:** cumulative non-reversal card qty for (entryId, itemCode) ≤ bucket (prevents double-counting across multiple cards per entry).
- **Entry regression:** batch card create/update/close does NOT modify `production_entry` quantities, `production_entry_batch`, `prod_execution_session`, `prod_output_event`, or any Inventory table. Recording-only.

## 9. Job Card / Subjob

- Snapshot from Production Entry: `jobCardNumber`, `subjobNumber`, `operationCode`.
- **CLAR-PROD-005 verification:** `verifySubjobMapping(card)` — if both `jobCardNumber` and `operationCode` are present, confirm an operation-code match exists on the job card's subjobs. Same service helper as P9.
- No batch card interaction with JobCard or Subjob tables.

## 10. Route Operation Relationship

- `operationCode` and `subjobNumber` captured as snapshot fields for traceability.
- **CLAR-PROD-005:** route binding frozen once entry posted; batch card records the binding. No mutation.

## 11. Rejection / Scrap / Rework Relationship

- P9 disposition documents capture batch identity at line level (`batchNumber` field on rejection/scrap/rework lines). Batch Card does NOT write to or read from disposition docs.
- The Batch Card links to the same Production Entry referenced by disposition docs. Both are recording-only; no mutual dependency.
- **Batch reconciliation** (per-batch WIP, CLAR-011) is a separate, unimplemented capability — out of P10 scope.

## 12. Consumption Relationship

- Batch Card does NOT modify consumption events (`prod_consumption_event`), Material Request, or Consumption History.
- `StockService` is never called by Batch Card code.
- P6 Model B-a (Material Request = reservation; Consumption POST = exactly one physical OUT) is unchanged.
- The card's physical batch number will be available for future consumption integration (recording traceability link only).

## 13. Inventory Relationship

- **Production code does NOT directly write `stock_ledger` or `stock_balance`** (ADR-PROD-005). Batch Card follows this boundary.
- **No physical stock movement** is created or authorized by the Batch Card.
- `StockService.postIn/Out/Adjustment` are never invoked.
- P6 Model B-a invariant holds: no batch-card-initiated physical stock movement.
- Batch identity (batch_no, heat_no) is recorded on the card for traceability; `StockBalance` batch/lot fields remain a separate Inventory concern.

## 14. Traceability

Batch Card provides:
- **Forward trace:** Card → Production Entry → Job Card → Subjob → Route Operation.
- **Backward trace:** Production Entry → Card(s) → Physical batch allocations.
- **Allocation trace:** Card allocation lines → physical batch numbers → (future) consumption/stock.
- **Audit trail:** `production_batch_card_audit_log` with doc_id/doc_number, event_type, user, timestamp, metadata (reversalDocId for reversals).
- **Reversal trace:** original card CLOSED + audit entry; mirror card `reversedFromDocId` → original; `isReversal` flag on mirror.

## 15. Idempotency

| Scenario | Mechanism |
|---|---|
| Duplicate Batch Card creation | Pre-check: `repo.findByEntryIdAndPhysicalBatchNumberAndIsReversalFalse` → return existing. DB unique index as backstop. |
| Refresh (F5) | Card already returned from list/get; no action. |
| Retry after timeout | Same entry+batch → pre-check returns existing card (no new number consumed). |
| Duplicate allocation | Service check + DB unique index `uq_batch_alloc_batch` on `(batch_card_id, batch_number)`. |
| Repeated POST (close) | Close on CLOSED card → returns same doc (idempotent, no state change). |
| Repeated reversal | Pre-check `findByReversedFromDocId` → reject 400 "already reversed". |
| Concurrent creation (same entry+batch) | One wins DB insert; other hits unique index → DataIntegrityViolation → safe 409; client retries → returns original. |

## 16. Concurrency

- **Unique doc number:** `doc_number` UNIQUE + `doc_sequence` with `PESSIMISTIC_WRITE` lock (via `DocNumberService.next`).
- **Unique batch per card:** `UNIQUE(batch_card_id, batch_number)` — prevents concurrent or duplicate batch allocations.
- **Unique card per entry+batch:** `UNIQUE(entry_id, physical_batch_number) WHERE NOT is_reversal` — prevents concurrent duplicate cards.
- **Optimistic locking:** `@Version version` on `production_batch_card` header → `OptimisticLockException` → HTTP 409 (existing `GlobalExceptionHandler`).
- **No pessimistic locks on card operations** — optimistic versioning is sufficient for low-contention ERP workflows.

## 17. Workflow

Use `WorkflowStateMachine.validateTransition("batch-card", status, action)` for state guards. Actions:

| Action | From Status | To Status |
|---|---|---|
| HOLD | OPEN | HELD |
| REOPEN | HELD | OPEN |
| CLOSE | OPEN or HELD | CLOSED |

Reversal: not a workflow transition — creates a new mirror card (status CLOSED directly, bypassing state machine for the mirror; workflow guard applies only to action on the original).

## 18. Security

- Controller: `@RequirePermission(module = "PRODUCTION", screen = "*", action = "VIEW")` — identical to P9 `ProductionDispositionController`.
- POST/PUT/ACTION: `can('production', 'Edit')` on frontend; backend validates via `@RequirePermission` + service-level validation.
- Safe errors: `IllegalArgumentException` → HTTP 400 RFC-7807 (title "Validation Error", message in `detail`).
- Authentication: `principalName(p)` fallback "system".
- Idempotency headers: `X-Idempotency-Key` / `Idempotency-Key` read from request (controller helper).

## 19. UI

### Batch Card Screen

- **Screen ID:** `batch-card`
- **File:** `src/pages/production/batch-card/BatchCardScreen.tsx`
- **API service:** `src/services/batchCardApi.ts`

**Features:**
- List view: docNumber, physicalBatchNumber, item, quantity, allocated, status, actions
- Form: entry select → snapshot fields (job card, subjob, route op, part code); physicalBatchNumber, lotNumber, heatNumber, quantity (card total); allocations lines editor (batch, lot, heat, qty, location)
- Actions by status: HOLD (OPEN), REOPEN (HELD), CLOSE (OPEN/HELD), REVERSE (CLOSED → mirror)
- State-aware: action buttons appear/disappear per WorkflowStateMachine; reverse requires reversalReason via ConfirmActionModal
- Busy guards, server validation, stable doc number, safe error handling

## 20. API

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/batch-cards` | GET | List all batch cards |
| `/api/v1/batch-cards/{id}` | GET | Get batch card with allocations |
| `/api/v1/batch-cards` | POST | Create batch card (becomes OPEN immediately; BC number reserved) |
| `/api/v1/batch-cards/{id}` | PUT | Update batch card (OPEN only, no renumber) |
| `/api/v1/batch-cards/{id}/actions/{action}` | POST | Actions: hold, reopen, close, reverse |

**Action body:** `Map<String, String>` with optional `reversalReason` key (for reverse).

**Response:** Entity with allocations (LAZY touched inside `@Transactional(readOnly = true)` read methods).

## 21. Database

### Tables (V9, additive, no destructive changes)

| Table | Purpose |
|---|---|
| `production_batch_card` | Header (doc, physical batch identity, item, quantity, entry link, status, audit fields, version) |
| `production_batch_card_allocation` | Lines (batch number, lot, heat, qty, location); unique per (card, batch) |
| `production_batch_card_audit_log` | Audit trail (doc_id NOT NULL, event_type, user, timestamp, metadata_json) |

**No modification** to `production_entry`, `production_entry_batch`, `prod_output_event`, `prod_execution_session`, `stock_ledger`, `stock_balance`, `prod_batch_move` (not yet created), or any existing table.

## 22. Migration

**V9__batch_card.sql** — Flyway, additive only:
- `CREATE TABLE production_batch_card` (with `CHECK (quantity <> 0)`, FK to `production_entry`)
- `CREATE TABLE production_batch_card_allocation` (with `CHECK (quantity <> 0)`, FK CASCADE to card)
- `CREATE TABLE production_batch_card_audit_log`
- Indexes: entry, status, (entry_id, item_code) for exhaustion query; `uq_batch_card_entry_batch` unique index
- `numbering_config` seed for `batch-card`
- `DocTypes.java` static registration for `batch-card`

**No historical data deletion. No schema alteration to existing tables. Production-safe.**

## 23. Tests

### Unit Tests (`ProductionBatchCardServiceTest` — 27/27, Mockito)

| Test | Scenario |
|---|---|
| rejectsNonControlledItem | Non-batch/lot-controlled item → 400 |
| rejectsMissingPhysicalBatch | Controlled item without physical batch → 400 |
| rejectsItemNotAnOutput | Item not an entry output → 400 |
| acceptsAdditionalOutputItem | Co/by item from `additionalOutputs` → PASS (P8) |
| rejectsNonPostedEntry | Card against draft entry → 400 |
| rejectsReversalEntry | Card against reversed entry → 400 |
| createLoadsSnapshot | Doc number `BC-YYYY-…`, status OPEN, header snapshot from entry |
| duplicateCreateReturnsExisting | Same entry + physical batch → returns existing card |
| rejectsZeroQuantity | Header quantity 0 → 400 |
| rejectsExceedingBucket | Cumulative card qty exceeds entry output bucket → 400 |
| acceptsPartialAllocation | Σ lines < card qty → PASS |
| rejectsOverAllocation | Σ lines > card qty → 400 |
| rejectsDuplicateAllocationBatch | Same batch_number twice on card → 400 |
| rejectsAllocationWithoutBatch | Allocation line missing batch → 400 |
| rejectsNonPositiveAllocation | Allocation qty ≤ 0 → 400 |
| capturesLotAndHeat | Lot/heat stored on header and lines |
| lifecycleTransitions | OPEN→HOLD→REOPEN→CLOSE via WorkflowStateMachine |
| rejectsUnknownAction | Unknown action → 400 |
| rejectsHoldFromClosed | HOLD from CLOSED → 400 |
| closeIdempotentAtStatus | CLOSE on CLOSED card → returns doc (no state change) |
| updatePreservesNumber | Update keeps `BC-…` number, re-allocates |
| rejectsUpdateClosed | Update of CLOSED card → 400 |
| rejectsUpdateCollision | Update lands on another card's unique batch → 400 |
| reversalMirror | Negated allocations, original stays CLOSED, mirror `BC-RV-…` |
| rejectsReverseOpen | REVERSE on non-CLOSED card → 400 |
| rejectsDoubleReverse | Already-reversed card → 400 |
| postOnClosedParity | POSTED-state + numbering rules mirror P9 document service flow |

### Integration Tests (`ProductionBatchCardIntegrationTest` — 6/6, Testcontainers Postgres 16)

| Test | Scenario |
|---|---|
| Full lifecycle | Create → Hold → Reopen → Close |
| Create + allocate + close | Two allocation lines, partial allocation |
| Exhaustion across cards | Two cards per entry, total ≤ goodQuantity |
| Duplicate creation idempotent | Return existing doc, no new number |
| Reversal mirror creation | Mirror created, allocations negated, original CLOSED; double reverse rejected |
| Recording-only invariant | Zero mutations to entry, WIP, output events, stock across all ops; reversed-entry create rejected |

## 24. Out of Scope

- Batch reconciliation (per-batch WIP tracking) — separate capability.
- FIFO/FEFO allocation — manual select chosen; FIFO/FEFO reserved for future authorized capability.
- Quality Gate integration for batch cards — CLAR-PROD-012 scoped to operation/entry level.
- `prod_batch_move` table — FRS §25/§26 planned table; not implemented in P10 (no approved movement semantics).
- Inventory stock posting for batch cards — ADR-PROD-005 boundary.
- Batch Card print/PDF — not specified in approved decisions.
- Batch Card reversal as a workflow state — not an approved lifecycle state (OPEN/HELD/CLOSED only).

## 25. Stop Conditions

1. Approved Batch Card rules insufficient to implement required behavior → STOP (document exact blocker).
2. Inventory boundary violated (stock_ledger/stock_balance direct write required) → STOP.
3. Quality changes beyond CLAR-PROD-012 required → STOP.
4. New business rule needed (not in CLAR-PROD-011 / Batch Card decision) → STOP.
5. New lifecycle state required (not OPEN/HELD/CLOSED) → STOP.
6. New numbering convention required → STOP.
7. Existing P6/P8/P9 behavior needs to change unexpectedly → STOP (document).
8. Destructive migration required → STOP.
9. Safe idempotency/concurrency guarantee cannot be established → STOP.

## 26. Known Limitations

1. **P9 latent CHECK(quantity > 0) on reversal mirrors:** P9 V8 declares `CHECK (quantity > 0)` on rejection/scrap/rework line tables, but P9 reversal mirrors store negated (negative) quantities — a latent constraint violation in Flyway-managed databases. P10 does NOT fix this (out of scope; V8 is immutable after apply). P10's allocation table uses `CHECK (quantity <> 0)` + service sign enforcement to avoid the same defect. **Documented as finding, not a blocker for P10.**
2. **Plant segment not wired in production numbering:** FRS format `BC-{PLANT}-{FY}-{SEQ}` uses plant segment, but production numbering via `DocNumberService.next()` uses `{PREFIX}-{YYYY}-{SEQ}` (consistent across all production docs REJ/SC/PER/PE). Plant segment exists in `numbering_config.use_plant_segment = true` but unused by the legacy `next()` path. Documented deviation identical to P9 treatment. Plant-aware numbering (`nextNumberFromConfig`) exists but is not wired into any production doc. No change in P10.
3. **Batch reconciliation not implemented:** Per-batch WIP/rejection/rework/scrap (CLAR-011) is approved but listed as a separate capability (DOC_57 §7 table). P10 provides batch identity and allocation only.
4. **`prod_batch_move` table not implemented:** FRS §25/§26 planned table for batch movements; no approved movement semantics exist. P10 records batch identity without movement tracking.

---

## 27. Post-Implementation Verification Record

### 27.1 Backend gates (all executed via Gradle in `zyger-erp-backend`)

| Gate | Result |
|---|---|
| `compileJava` / `compileTestJava` | PASS |
| `./gradlew build` | PASS |
| `./gradlew test` (full suite) | PASS — **399 tests**, 0 failures (P9 baseline 366; P10 adds 27 unit + 6 integration) |
| `ProductionBatchCardServiceTest` (unit, Mockito) | PASS — 27/27 |
| `ProductionBatchCardIntegrationTest` (end-to-end, Testcontainers Postgres 16) | PASS — 6/6 |

### 27.2 Frontend gates

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run lint` | 31 errors / 764 warnings — errors unchanged vs the 31-error baseline (warnings baseline 762; P10 adds 2 from the new screen, the standard fetch-on-mount pattern) |

### 27.3 Inventory Invariant Verification

```
Production code does NOT directly write stock_ledger.          [VERIFIED — no StockService calls in BatchCardService/Controller]
Production code does NOT directly write stock_balance.         [VERIFIED]
Batch Card does NOT create unauthorized physical stock movement. [VERIFIED — recording-only; no stock effects]
P6 Model B-a remains unchanged.                                 [VERIFIED — regression tests pass; no modification to P6/P8/P9 paths]
Batch Card ops mutate zero inventory/WIP/entry/normalized-event state. [VERIFIED — integration recording-only test]
```

### 27.4 Final status

**IMPLEMENTED_AND_VERIFIED**

---

*End of DOCUMENT_60 — implementation contract with post-implementation verification.*
