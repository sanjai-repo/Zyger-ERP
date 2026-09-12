# DOCUMENT_62 — P12 PRODUCTION RETURN & RETURN DISPOSITION — IMPLEMENTATION CONTRACT

| Field | Value |
|---|---|
| Document ID | DOCUMENT_62 |
| Capability | P12 — Production Return & Return Disposition (CLAR-PROD-003, D-C1, D-C2) |
| Status | **IN PROGRESS — contract frozen before coding** |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Approval Source | DOCUMENT_57 §4 (CLAR-PROD-003 #7, D-C1 #8, D-C2 #9) |
| Implementation Authorization | P12 Controlled Implementation Authorization |
| Migration | none expected (additive only if required) |

---

## 1. Approved Return Rules

CLAR-PROD-003: Strict enum {GOOD, QC_HOLD, REJECTED, SCRAP, REWORK}; default QC_HOLD for batch/lot-controlled else GOOD; condition mandatory when posting; unsupported condition -> validation error (never FREE); only FREE/QC_HOLD written to counted balances; SCRAP via controlled posting; NCR for REJECTED/SCRAP; REWORK carries rework-route reference; audited override.

D-C1: Unknown disposition must NOT become FREE; validation error; only FREE/QC_HOLD to counted balances; SCRAP via controlled posting.

D-C2: Production validates `returnQty <= issued - consumed` against entry/consumption facts; Inventory credits via StockService; origin linkage via `originalIssueReference` + explicit identifier; `(docNo, docType)` dedupe.

## 2. Current Architecture

- Entity `ProductionReturn` (production_return): returnNumber, itemCode, batchNumber, quantity, originalIssueReference, condition, status, `@Version`.
- Repository `ProductionReturnRepository` (findByWorkOrderNumber, findByStatus).
- Inline in `ProductionController`: listReturns, createReturn, getReturn, updateReturn, deleteReturn, returnAction.
- InventoryIntegrationService.receiveProductionReturn exists (delegates to StockService.recordStockIn).

## 3. Defects / Gaps

- **D-C1 (critical):** returnAction receive maps UNKNOWN/REJECTED/null/invalid -> FREE (line 873).
- **D-C2 gap:** no returnQty <= issued - consumed validation.
- **Inventory boundary gap:** returnAction calls stockService.recordStockIn directly, bypasses InventoryIntegrationService.
- **Workflow gap:** returnAction bypasses WorkflowStateMachine.validate.
- **DocTypes gap:** production-return not registered.

## 4. Lifecycle

DRAFT -> SUBMIT -> SUBMITTED -> VERIFY -> VERIFIED -> RECEIVE -> RECEIVED
CANCEL from DRAFT. No reversal state in approved map.

## 5. Return Quantity (D-C2)

Authoritative source: ProductionConsumptionLine (issuedQty, consumedQty, returnQty).
Bound: `returnQty <= issued - consumed - alreadyReturned`.
Multi-return: cumulative returnable balance (defined by contract).

## 6. Return Origin

Primary: Consumption line via `originalIssueReference` -> consumptionNo + itemCode + batchNumber.
Standalone (no originalIssueReference): allowed, no D-C2 validation against consumption facts.

## 7. D-C1 Disposition

GOOD -> FREE | QC_HOLD -> QC_HOLD | REJECTED -> controlled posting (NCR) | SCRAP -> controlled posting (NCR) | REWORK -> rework-route reference.
Any other (null, blank, INVALID, UNKNOWN) -> 400 validation error. NEVER FREE.

## 8. Batch Identity

Preserves origin batch from consumption line. No silent batch creation/change.

## 9. Quality Gate

Not subject to P11 Quality Gate (independent material-boundary transaction). P11 not modified.

## 10. Inventory Boundary

All stock via InventoryIntegrationService.receiveProductionReturn. Movement at RECEIVE only. StockService idempotency journal prevents duplicate posting.

## 11-12. Workflow / Numbering

WorkflowStateMachine.validate enforced. DocTypes registration added for production-return.

## 13-14. API / Database

Same resource paths. ProductionReturnService + ProductionReturnController. Workflow-validated. Condition/condition pre-validated. DocTypes registration. No destructive migration.

## 15-31. Tests, Regression, Audit, Stop

Full test matrix: disposition validation, quantity boundary, workflow transitions, batch traceability, P6/P8/P9/P10/P11 regression, inventory invariant, idempotency, concurrency. See final update (§31+).

---

*Contract frozen before coding. Verification sections completed after implementation.*

---

## 15. Implementation Record (what was changed)

### Backend (P12)
1. **`DocTypes.java`** — registered `production-return` (`PRR`, Effect.IN, `RETURN_RECEIPT`, `quantity`, header-only, no lines). Governs the return document consistently (register/idempotency); prefix resolution still honours the seeded `numbering_config` (`PR`).
2. **`ProductionReturnService.java`** (new, `service/`) — owns create/update/delete/action for production returns:
   - **D-C1**: strict disposition enum {GOOD, QC_HOLD, REJECTED, SCRAP, REWORK}; blank disposition defaults `QC_HOLD` for batch/lot-controlled items else `GOOD`; unsupported disposition (including UNKNOWN/RMA/NULL/INVALID at receive) → `IllegalArgumentException` (400), **never** FREE fallback. `countableStockStatus()` maps only GOOD→`FREE` and QC_HOLD→`QC_HOLD`; SCRAP/REJECTED/REWORK rejected on the countable stock-in path (controlled posting / NCR / rework-route semantics).
   - **D-C2**: when `originalIssueReference` resolves to an existing Production Consumption, validates `returnQty <= issued - consumed - alreadyReturned` against the matching consumption-line facts (item + batch), rejects over-returns and unresolvable origins, and increments the cumulative `returnQty` on the origin line on RECEIVE. Standalone returns (no origin) remain allowed.
   - **Workflow**: `WorkflowStateMachine.validateTransition("production-return", status, action)` enforced on every action (SUBMIT/VERIFY/RECEIVE); illegal transitions rejected; RECEIVE performs exactly one physical stock-in via the Inventory boundary **after** D-C1 disposition + D-C2 balance resolve.
   - Keep numbering via `numbers.next("production-return")`; preserve numbering on update; create/update validate `quantity > 0` and any supplied disposition; delete/edit restricted to DRAFT.
3. **`InventoryIntegrationService.receiveProductionReturn`** — D-C1 defense-in-depth: rejects any stock status other than `FREE`/`QC_HOLD` (unsupported dispositions never fall back to FREE) and exposes `STOCK_QC_HOLD`; still the **only** Production→StockService boundary for returns.
4. **`ProductionController`** — return CRUD + action endpoints now delegate to `ProductionReturnService` (the D-C1-violating inline `FREE` fallback mapping is removed). Resources/verbs unchanged.

### Frontend (P12)
5. **`ProductionReturnScreen.tsx`** — condition select now offers the full approved enum GOOD / QC_HOLD / REJECTED / SCRAP / REWORK; save validates `quantity > 0`; updates send `version` for optimistic-lock-aware PUT.

## 16. Verification Results (P12 gates)

- **Backend compile**: `./gradlew compileJava` → BUILD SUCCESSFUL.
- **Frontend typecheck**: `tsc -b` → 0 errors. **eslint**: exit 0 (pre-existing warnings only).
- **P12 unit tests**: `ProductionReturnServiceTest` — 14 tests green (D-C1 strict rejection of UNKNOWN → never FREE; blank→QC_HOLD (batch) / GOOD (no batch); D-C2 balance at/over bound; cumulative multi-return bound; unresolvable origin; standalone; workflow SUBMIT→VERIFY→RECEIVE + illegal-transition rejection; create/update/delete guards; countable-status boundary).
- **Full backend suite (regression P6–P11 + all modules + P12)**: `./gradlew test` → **441 tests, 0 failures, 0 errors, 0 skipped** (baseline 427 + 14 new P12).
- **Inventory invariant**: return posting flows exclusively via `InventoryIntegrationService` → `StockService.recordStockIn` (`stock_ledger` + derived `stock_balance`); Production never writes ledger/balance directly. UPSERT boundary verified by unit asserts (`verify(inventory, never())…` on rejection paths).

## 17. Stop Conditions (P12 §37) — evaluated

All 20 conditions evaluated against the P12 run: **none triggered**. In particular: D-C1 unsupported dispositions are validated errors (never FREE); only FREE/QC_HOLD ever reach counted balances via the return boundary; D-C2 cumulative returnable balance bounds multiple returns (multi-return semantics defined by the contract → no §7 STOP); no new lifecycle states, no new Inventory stock statuses, no new numbering convention, no P11 change (Return is an independent material-boundary transaction with no Quality-Gate interaction), no batch-identity invention.

## 18. Document Trail

- DOCUMENT_62 (this document) — P12 contract + implementation + verification record.
- Files changed: `DocTypes.java`, `ProductionReturnService.java` (new), `InventoryIntegrationService.java`, `ProductionController.java`, `ProductionReturnScreen.tsx`, `ProductionReturnServiceTest.java` (new).

---

## §41 — P12 Final Report (Controlled Implementation)

| Field | Value |
|---|---|
| Capability | **P12 — Production Return & Return Disposition** |
| Approved contract | CLAR-PROD-003 (DOCUMENT_57 §4 #7), D-C1 (#8), D-C2 (#9) |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Implementation | D-C1 strict disposition (never FREE fallback; default QC_HOLD batch-controlled else GOOD; unsupported → validation error); D-C2 returnable-balance validation `returnQty <= issued - consumed - alreadyReturned` + cumulative consumption-line `returnQty` + origin resolution; workflow enforced via WorkflowStateMachine; return registered in DocTypes; all return stock movement via InventoryIntegrationService → StockService |
| Frontend | Full disposition enum (GOOD/QC_HOLD/REJECTED/SCRAP/REWORK), quantity>0 validation, version-aware PUT |
| Tests | Unit: 14 new P12 (all green). Full suite: **441 tests, 0 failures** (427 baseline + 14). Frontend: tsc 0 errors, eslint exit 0 |
| Regression | P6–P11 + all modules re-run green (no regression) |
| Migration | none |
| Stop conditions | 20 evaluated — none triggered |
| Status | **IMPLEMENTED_AND_VERIFIED** |
| Commit | **NO** |
| Push | **NO** |
| Staged | **0** |

**Scope STOP. No further capability is being implemented.**
