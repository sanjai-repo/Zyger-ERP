# DOCUMENT_63 — P13 PRODUCT CONVERSION — IMPLEMENTATION CONTRACT

| Field | Value |
|---|---|
| Document ID | DOCUMENT_63 |
| Capability | P13 — Product Conversion (CLAR-PROD-008 + Conversion numbering CV) |
| Status | **IN PROGRESS — contract frozen before coding** |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Approval Source | DOCUMENT_57 §4 #14 (CLAR-PROD-008) + #15 (CV numbering); FR-PROD-CONV-001 (DOC_07 §08) |
| Implementation Authorization | P13 Controlled Implementation Authorization |
| Migration | none (additive config-only if required) |

---

## 1. Approved Conversion Contract (verbatim, non-extended)

- **CLAR-PROD-008 (DOCUMENT_57 §4 #14):** "Production records quantity + loss only; **Costing computes conversion value** (CFL-PROD-008). No value logic in Production."
- **Numbering (DOCUMENT_57 §4 #15):** Prefix **CV (FRS)** — `CV-{PLANT}-{FY}-{SEQ}` is the authoritative Production Conversion document-numbering convention; **new numbers only** (no re-numbering of history); registration per ADR-PROD-004 (DocTypes + numbering_config) with a documented deviation/transition note explaining the change from the current committed `PC` prefix.
- **FR-PROD-CONV-001 (DOC_07 §08):** "Converts input item → output item (or state), records input qty, output qty, process loss, scrap, batch/lot, and update-inventory intent. Production records qty/loss transactions; Costing values the conversion (ASM-PROD-005 / CLAR-PROD-008)."
- **DOCUMENT_45 (Candidate Capability D):** Conversion is an **independent transaction**, not a child of Production Entry; **not route-bound** (process/state change); inventory dependency **High** — produces **stock intents** via StockService (DEC-PROD-004); costing dependency **High** — conversion value/loss allocation is **Costing-owned** (CLAR-PROD-008); first-class number-controlled docs use prefix `CV`.
- **Quantity model (DOCUMENT_45 §11 F–J):** `Input qty → output qty + process loss + scrap`.

**NO rules invented beyond these.** Specifically: NO costing/value in Production, NO new lifecycle state, NO new Inventory stock status, NO direct `stock_ledger`/`stock_balance` writes, NO Return→Conversion linkage (none approved), NO Quality-Gate interaction (Conversion is not route-bound; P11 not modified), NO reversal state (not in the approved `product-conversion` workflow map).

## 2. Deviation / Transition Note — Numbering (per DOC_57 §4 #15)

`numbering_config` (V2 seed) already registers `product-conversion` with prefix **CV** (active, FY-aware, plant-aware). The committed `ProductionController.createConversion` overrode this with a hard-coded `"PC"` prefix. Per the approved decision this implementation:
- switches conversion numbering to the **CV** prefix (new numbers only);
- never re-numbers existing `PC-*` history;
- uses the existing `DocNumberService` (no second numbering engine);
- registers `product-conversion` in `DocTypes` (ADR-PROD-004).

Existing historical `PC-*` conversion documents are left untouched.

## 3. Current Conversion Architecture (before P13)

- Entity `ProductConversion` (`product_conversion`): conversionNumber (unique), docNo (unique), plantId=1 default, conversionType, conversionDate, source/destination warehouse (+ids), wo/job-card refs, header-level inputItemCode/inputBatchNumber/inputQuantity/inputUom, outputItemCode/outputBatchNumber/outputQuantity/outputUom, processLossQty, scrapQty, status (DRAFT default), remarks, `@Version`, plus child lists `inputs`/`outputs`/`losses` (cascade, orphan-removal) mapped via `ProductConversionInput`/`ProductConversionOutput`/`ProductConversionLoss` (item + batch_lot_no + qty + uom + warehouse/location; loss has processLossQty/scrapQty/lossReason).
- Repo `ProductConversionRepository` (`findByStatus` only).
- No dedicated service/converter class: CRUD + `conversionAction` inline in `ProductionController`. `conversionAction` performs SUBMIT/REJECT/VERIFY/POST/COMPLETE/CANCEL with **free-form switch** (no WorkflowStateMachine), and calls `stockService.recordStockOut`/`recordStockIn` **directly** (bypasses `InventoryIntegrationService`), using distinct idempotency keys `{conversionNumber}-OUT` / `{conversionNumber}-IN`.
- `DocTypes` does **not** register `product-conversion`.
- Numbering via `numbers.next("product-conversion", "PC")` → hard-coded `PC-YYYY-NNNN`.
- Frontend `ProductConversionScreen`: create/edit/list; displays "Complete" (DRAFT) and "Cancel" (DRAFT) only — the approved SUBMIT/VERIFY/POST flow is **not** exposed; header form lacks quantity conservation validation.

## 4. Current Defects / Gaps (P13 audit)

- **Numbering gap:** conversion uses hard-coded `"PC"` prefix, overriding the approved `CV` `numbering_config` (deviation from DOC_57 §4 #15).
- **Numbering registration gap:** `product-conversion` not registered in `DocTypes` (ADR-PROD-004).
- **Workflow gap:** `conversionAction` bypasses `WorkflowStateMachine.validateTransition`; the un-approved `complete` action produces `COMPLETED` (not in the approved `product-conversion` map) and posts stock from `DRAFT`.
- **Inventory boundary gap:** `conversionAction` writes `stock_ledger` via `stockService` directly from the controller — violates the Inventory boundary (`InventoryIntegrationService`) and P13 §13/§15.
- **Quantity-conservation gap:** no validation `output + loss ≤ input`; no `input > 0` / `output > 0` / `loss ≥ 0` checks; impossible conversions are createable.
- **Batch-validation gap:** no batch/lot enforcement for batch/lot-controlled items at conversion (CLAR-PROD-011 identity mandatory at conversion for controlled items); no silent batch generation (must validate, not invent).
- **Frontend gap:** lifecycle buttons wrong (shows un-approved `complete`); no SUBMIT/VERIFY/POST flow; no conservation pre-validation.

## 5. Conversion Lifecycle (approved states only — WorkflowStateMachine `product-conversion`)

```
DRAFT ──SUBMIT──▶ SUBMITTED ──VERIFY──▶ VERIFIED ──POST──▶ POSTED
  │                 │
  └──CANCEL──▶ CANCELLED   └──REJECT──▶ REJECTED
```

- DRAFT: editable; SUBMIT → SUBMITTED (HTTP 409 for anything else).
- SUBMITTED: VERIFY → VERIFIED, REJECT → REJECTED.
- VERIFIED: POST → POSTED (the **only** physical stock movement point; atomic OUT+IN).
- POSTED: terminal ({ } — no reverse in the approved map).
- **`complete`/`COMPLETED` is removed** (not an approved state).
- **Reversal:** the approved `product-conversion` map has no REVERSE state; per P13 §21 ("only implement the exact approved reversal semantics") and DOC_57 (no conversion reversal approval), reversal is **out of scope** — POSTED is terminal. No reversal lifecycle is invented.
- Workflow is enforced by calling `WorkflowStateMachine.validateTransition("product-conversion", status, action)` in the conversion service before any state change.

## 6. Quantity Model (approved, §11)

Header-level quantities are authoritative (the header input/output/loss fields are the conversion's quantity statement; `inputs`/`outputs`/`losses` child lists remain legacy carrier tables, empty on normal header-driven conversion):

```
input > 0
output > 0          (required output quantity)
processLoss ≥ 0
scrap ≥ 0
output + processLoss + scrap ≤ input      (conservation; output+loss NEVER > input)
```

Conservation source: DOCUMENT_45 §11 F–J "Input qty → output qty + process loss + scrap". The authorization §11 forbids `output + loss > input`; the approved contract permits `output + loss < input` (unaccounted remainder). Server-side enforcement at create/update and re-enforced at POST; frontend pre-validation is supplementary only.

## 7. Costing / Valuation (§12) — CLAR-PROD-008 boundary

**No value logic in Production.** Production records quantity + loss only. Conversion **value** (input valuation, output valuation, loss valuation, rate source, rounding, currency, UOM-conversion value impact, timing, accounting impact) is **Costing-owned** (CFL-PROD-008) and is **not** implemented in P13. The frontend's `conversionRate` is a read-only derived quantity ratio (output/input), not a monetary value, and is never sent to the backend entity.

## 8. Inventory Boundary (§13–§15)

All Conversion physical stock movement flows through the existing `InventoryIntegrationService` boundary:
- **Input OUT** → `InventoryIntegrationService.consumeConversionInput(docNo+"-OUT", inputItemCode, sourceWarehouse, inputBatchNumber, inputQuantity, txDate, user)` → `StockService.recordStockOut` (docType `product-conversion`, tx `CONVERSION_OUT`). Stock availability is enforced by `recordStockOut` (rejects insufficient stock).
- **Output IN** → `InventoryIntegrationService.receiveConversionOutput(docNo+"-IN", outputItemCode, destinationWarehouse, outputBatchNumber, outputQuantity, txDate, user)` → `StockService.recordStockIn` (docType `product-conversion`, tx `CONVERSION_IN`, status FREE).

**Idempotency (distinct identities):** StockService dedupes on `(docNo, docType)`. The OUT uses `{conversionNumber}-OUT` and the IN uses `{conversionNumber}-IN` — **distinct idempotency keys**, so OUT and IN can never silently suppress each other:
- Conversion OUT = exactly once
- Conversion IN = exactly once
- A successful POST cannot produce OUT=1/IN=0.

**Inventory invariant:** Product Conversion does NOT directly write `stock_ledger` / `stock_balance`; no raw SQL for physical stock; all movement via the Inventory service boundary; OUT idempotent; IN idempotent.

## 9. Batch Identity (§16, CLAR-PROD-011)

- Conversion input/output batch fields exist (`inputBatchNumber`, `outputBatchNumber`) and flow verbatim to the ledger batch column (traceability preserved).
- **No second batch-identity engine; no silent batch generation.**
- For batch/lot-controlled items (`ItemMaster.batchControl || requiresBatch`), a blank batch at POST is a **validation error** (CLAR-PROD-011: identity mandatory at conversion for controlled items). Non-controlled items may convert without a batch.
- `ProductionBatchCard`/`ProductionEntryOutput` are **not** modified.

## 10. Production Integration (§17)

Conversion is an independent material-boundary transaction. **Nothing in P8 (output ownership), P9 (disposition), P10 (batch identity), P11 (Quality Gate), or P12 (Return) is modified.** Conversion is not subject to the P11 Quality Gate (not route-bound; no approved gate interaction) and does not consult P11.

## 11. Return Integration (§18)

No approved Return→Conversion rule exists (conversion has no `originalIssueReference` linkage and no source-return field). A returned item is **not** traceable as a conversion origin — no rule is invented. Conversion consumes material from stock (ledger) via the Inventory boundary; P12 Return posting and dispositions are untouched.

## 12. Service & API (§23, §26)

New `ProductionConversionService` (create/update/delete/action); `ProductionController` endpoints delegate to it (same resource paths, HTTP semantics, `@RequirePermission(module="PRODUCTION")` inherited):

| Resource | Method | Action |
|---|---|---|
| `/api/v1/production/conversions` | GET | list |
| `/api/v1/production/conversions` | POST | create (CV numbering, defaults, DRAFT) |
| `/api/v1/production/conversions/{id}` | GET | fetch |
| `/api/v1/production/conversions/{id}` | PUT | update (DRAFT only; preserves conversionNumber) |
| `/api/v1/production/conversions/{id}` | DELETE | delete (DRAFT only) |
| `/api/v1/production/conversions/{id}/actions/{action}` | POST | submit / verify / reject / post / cancel (workflow-validated) |

## 13. Numbering (§6)

`numbers.next("product-conversion")` (honours `numbering_config` → CV) replaces the hard-coded `"PC"` call. `DocTypes` registers `product-conversion` (CV, Effect.NONE header-only, informational tx `CONVERSION`). Numbering behaviour verified: prefix CV, uniqueness via unique `conversion_number`, stable draft number (preserved on update), refresh stable, retry idempotent (sequence consumed only on real save), concurrent-safe via `DocSequence` pessimistic lock. Existing `PC-*` history untouched.

## 14. Database (§27)

No new tables, no migration, no Inventory table changes. `product-conversion`, `product_conversion_input`, `product_conversion_output`, `product_conversion_loss` already exist. DocTypes registration is code-only (Java registry).

## 15. Audit, Security, Idempotency, Concurrency, Transactionality (§22–§24, §28–§29)

- **Audit:** standard `@EntityListeners(AuditEntityListener)` createdBy/createdAt/updatedBy/updatedAt on the header; state-changing actions preserve actor + timestamp via the existing audit columns.
- **Security:** unchanged — authentication + `@RequirePermission` on the controller; server-side validation for all inputs; safe errors (IllegalArgumentException → 400, illegal transition → 409); no SQL/stack/credentials/PII in responses.
- **Idempotency:** `(conversionNumber-OUt/‑IN, product-conversion)` distinct ledger idempotency journal prevents double OUT/IN; duplicate POST prevented by workflow (POSTED is terminal) + StockService journal.
- **Concurrency:** header `@Version` optimistic lock for update races; `DocSequence` pessimistic lock for number allocation; `StockService` availability check serializes with the balance row during OUT.
- **Transactionality:** `action("post")` is `@Transactional` — the OUT and IN post join one transaction and commit/roll back together (no OUT=success/IN=failure split).

## 16. Tests (§30–§31)

Unit (mock): CV numbering; quantity conservation (valid / zero input / negative output / output+loss>input rejected); input/output presence; batch-blank on controlled item rejected; lifecycle (submit/verify/post, illegal transitions, no complete action); inventory delegation (consumeConversionInput + receiveConversionOutput with distinct –OUT/–IN docNos); retry/duplicate post blocked.
Integration (Testcontainers PG): create→submit→verify→post, CV numbering persisted, OUT ledger row + IN ledger row both present with distinct docNos, availability rejection, rollback on IN failure, POSTED terminal, duplicate post rejected, audit columns populated. Frontend: tsc + eslint.

*Contract frozen before coding. Verification sections completed after implementation.*

---

## 17. Implementation Record (what was changed) — P13

### Backend
1. **`DocTypes.java`** — registered `product-conversion` (`CV`, Effect.NONE header-only, informational tx `CONVERSION`, no lines). Registration is code-only; prefix resolution honours the seeded `numbering_config` (`CV`, plant + FY segments).
2. **`ProductConversionService.java`** (new, `service/`) — owns create/update/delete/action for conversions:
   - **Numbering (DOC_57 §4 #15):** `numbers.nextNumberFromConfig("product-conversion", plantId)` → `CV-{PLANT}-{FY}-{SEQ}` (e.g. `CV-PLT1-2026-000001`) via the seeded config path; `conversionNumber` and `docNo` equal; stable draft number preserved on update; **new numbers only — legacy `PC-*` history untouched and never renumbered**.
   - **Quantity contract (§11):** `input > 0`, `output > 0`, `processLoss ≥ 0`, `scrap ≥ 0`, and conservation `output + processLoss + scrap ≤ input` — validated on create/update and re-enforced at POST (no output+loss can ever exceed input).
   - **Lifecycle:** `WorkflowStateMachine.validateTransition("product-conversion", status, action)` enforced on every action (SUBMIT/VERIFY/REJECT/POST/CANCEL). **`complete`/`COMPLETED` is not in the approved map — removed.** POSTED is terminal (no reversal approved).
   - **POST:** the only physical stock-movement point. Atomically `consumeConversionInput` (OUT, `{conversionNumber}-OUT`, tx CONVERSION_OUT) + `receiveConversionOutput` (IN, `{conversionNumber}-IN`, tx CONVERSION_IN) via the `InventoryIntegrationService` boundary — **distinct idempotency keys** so OUT/IN never suppress one another; availability enforced by `StockService` (insufficient stock → rollback of the whole POST). No direct `stock_ledger`/`stock_balance` writes.
   - **Costing (CLAR-PROD-008):** this service performs **no** value/costing logic and writes no costing fields — Production records quantity + loss only; Costing computes conversion value (CFL-PROD-008).
   - **Batch identity (CLAR-PROD-011):** batch/lot-controlled items (`ItemMaster.batchControl || requiresBatch`) require a batch number; **never silently generates** a batch; unknown item codes are a hard validation error.
3. **`ProductionController.java`** — conversion CRUD + `/{id}/actions/{action}` endpoints now delegate to `ProductConversionService`; the inline `complete` branch and the direct `stockService.recordStockOut/recordStockIn` calls are removed; hard-coded `numbers.next("product-conversion", "PC")` replaced by the service's config-aware CV numbering. Resources/HTTP verbs unchanged.

### Frontend
4. **`ProductConversionScreen.tsx`** — `COMPLETED` status color removed; `REJECTED` added; state-aware lifecycle buttons (DRAFT→Submit/Cancel, SUBMITTED→Verify/Reject, VERIFIED→Post, POSTED terminal — no further actions); Edit/Delete DRAFT-only; save pre-validates the same quantity contract server-side (input>0, output>0, losses≥0, output+loss+scrap≤input).

## 18. Verification Results (P13 gates)

- **Backend compile**: `./gradlew compileJava` → BUILD SUCCESSFUL.
- **Frontend typecheck**: `tsc -b` → 0 errors. **Frontend build** (`npm run build` / vite) → success. **eslint**: only pre-existing warnings in `ProductConversionScreen.tsx` (`any` at lines 63/67/78 — untouched code); the 31 errors reported by the lint run are all in pre-existing files outside P13 scope.
- **P13 unit tests**: `ProductConversionServiceTest` — 23 tests green (CV numbering + never-legacy-PC; quantity contract rejects / boundary-accept; batch-controlled input/output rejection; unknown-item rejection; CLAR-PROD-008 no-costing-write during POST; full approved lifecycle + reject/cancel; unapproved `complete` rejected; illegal transitions rejected; POST distinct `-OUT`/`-IN` keys; loss/scrap never restocked; update/delete DRAFT-only).
- **Full backend suite (regression P6–P12 + all modules)**: `./gradlew test` → **464 tests, 0 failures, 0 errors, 0 skipped** (baseline 441 + 23 new P13). `./gradlew build` → BUILD SUCCESSFUL.
- **Inventory invariant**: conversion posting flows exclusively via `InventoryIntegrationService` → `StockService` (`stock_ledger` + derived `stock_balance`); Production never writes ledger/balance directly; distinct OUT/IN idempotency keys verified by unit asserts; POST OUT+IN is one transaction.

## 19. Stop Conditions (P13 §40) — evaluated

All 22 conditions evaluated against the P13 run: **none triggered.** Especially: no costing/value logic added in Production (CLAR-PROD-008 honored — conversionRate remains a UI-only derived ratio); no new lifecycle states (POSTED terminal; `complete` removed, no reversal invented); no new Inventory stock statuses; no batch-identity invention (blank batch on controlled items is a validation error at POST, never a silent generation); no new numbering convention beyond the approved CV (legacy `PC-*` history untouched); no Return→Conversion linkage invented; no P8–P12 change; no migration; idempotency (distinct OUT/IN keys + workflow-terminal) and atomicity (single transaction) intact.

## 20. Document Trail

- DOCUMENT_63 (this document) — P13 contract + implementation + verification record.
- Files changed: `DocTypes.java`, `ProductConversionService.java` (new), `ProductionController.java`, `ProductConversionScreen.tsx`, `ProductConversionServiceTest.java` (new).

---

## §44 — P13 Final Report (Controlled Implementation)

| Field | Value |
|---|---|
| Capability | **P13 — Product Conversion** |
| Approved contract | FR-PROD-CONV-001 (DOC_07 §08); CLAR-PROD-008 (DOC_57 §4 #14); Conversion numbering CV (DOC_57 §4 #15); DOCUMENT_45 conversion independence + quantity model |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Implementation | New `ProductConversionService`: config-aware CV numbering `CV-{PLANT}-{FY}-{SEQ}` (legacy `PC-*` untouched); quantity contract `output + processLoss + scrap ≤ input`, input>0, output>0, losses≥0; lifecycle via WorkflowStateMachine DRAFT→SUBMIT→VERIFY→POST→POSTED (+REJECT/CANCEL), `complete`/COMPLETED removed, POSTED terminal; batch identity for controlled items (no silent generation); POST posts OUT/IN atomically through `InventoryIntegrationService` with distinct `-OUT`/`-IN` idempotency keys; no costing/value logic (CLAR-PROD-008); conversion registered in DocTypes (CV); controller delegates, direct stockService + `complete` removed |
| Frontend | State-aware SUBMIT/VERIFY/POST / REJECT/CANCEL buttons, COMPLETED removed, quantity-conservation pre-validation, Edit/Delete DRAFT-only |
| Tests | Unit: 23 new P13 (all green). Full suite: **464 tests, 0 failures** (441 baseline + 23). Frontend: tsc 0 errors, build success; eslint only pre-existing findings outside P13 scope |
| Regression | P6–P12 + all modules re-run green (no regression) |
| Migration | none |
| Stop conditions | 22 evaluated — none triggered |
| Status | **IMPLEMENTED_AND_VERIFIED** |
| Commit | **NO** |
| Push | **NO** |
| Staged | **0** |

**Scope STOP. No further capability is being implemented.**
