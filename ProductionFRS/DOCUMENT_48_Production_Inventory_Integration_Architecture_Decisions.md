# DOCUMENT_48 — Production ⇄ Inventory Integration Architecture Decisions

## 1. Document Control

| Field | Value |
|---|---|
| Document ID | DOCUMENT_48 |
| Title | Production ⇄ Inventory Integration Architecture Decisions (ADR-001, ADR-002, Integration Contract) |
| Document Type | Architecture Decision Record + Integration Contract Resolution (Decision/Preparation — READ-ONLY) |
| Module | Production ⇄ Inventory integration boundary |
| Status | P5 PREPARATION — DECISIONS DRAFTED, PENDING HUMAN APPROVAL (NOT enacted) |
| Baseline Branch | `main` |
| Baseline HEAD | `0781e1a` |
| Staged Files at Baseline | 0 |
| Phase Type | PHASE 5 (P5) — Architecture Decision + Integration Contract Resolution (NO IMPLEMENTATION) |
| Predecessor | DOCUMENT_47 (clause 3/14/15/16/17), DEC-PROD-004, DEC-PROD-005 |
| Author | Senior ERP Solution Architect / Senior Full-Stack Engineer |
| Last Reviewed | P5 evidence collection complete |

## 2. Purpose

This document is the authoritative **decision-preparation** record for how the Production module shall
integrate with the Inventory module. It resolves the integration-architecture decision (ADR-001) and the
inventory-posting decision (ADR-002) that P5 was mandated to address.

It answers, with committed-code evidence:

1. **By what mechanism** does Production hand material-consumption and finished-good information to Inventory?
2. **What is the transaction/integration contract** (payload, identity, idempotency, failure, retry, partial-issue, reversal, audit)?
3. **How is the DEC-PROD-004 boundary** (Production never writes stock directly; Inventory owns StockLedger/StockBalance/availability/posting/reversal) honored?

IMPORTANT SCOPE GUARD:

- This document is READ-ONLY preparation. It does **not** enact any change.
- Every PROPOSED DECISION is grounded in committed-code evidence (FACT FROM COMMITTED CODE) and is
  marked **PROPOSED — HUMAN APPROVAL REQUIRED**. No decision here is DECIDED.
- Untracked in-flight restructuring is cited strictly as `UNTRACKED DESIGN EVIDENCE ONLY` and is **not**
  absorbed into, nor used to redefine, the committed architecture.
- No Material Request entities/APIs/UI, no stock posting, no StockLedger/StockBalance writes, no feature
  flags, no application.yaml/SecurityConfig/P3.3/P3.4/migration changes are introduced in this phase.

## 3. Baseline Verification

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD | `0781e1a` |
| Staged file count | 0 |
| DOCUMENT_48 / DOCUMENT_49 present before this phase | No |
| Committed `StockService.java` | Present at HEAD |
| Committed `ProductionController.java` | Present at HEAD (conversion + return inventory delegation) |
| Committed production quantity model | Present at HEAD (ProductionEntry / Material / Batch) |
| Working-tree modified `ProductionController.java`, `JobCard.java`, `JobCardSubjob.java` | Present (traceability-only, endpoints/formulas/quantity fields unchanged) |
| Untracked `production/` package, `ProductionStockBoundary`, `InventoryIntegrationService` | Present (`UNTRACKED DESIGN EVIDENCE ONLY`) |

Method: read-only audit. No file was modified, created, staged, or committed during evidence collection.

## 4. Evidence Source Map (FACT vs INFERENCE vs PROPOSED)

To obey the "be honest about unknown information" rule, every statement below is tagged with a label:

| Label | Meaning |
|---|---|
| **FACT FROM COMMITTED CODE** | Directly verified against committed files at HEAD `0781e1a` |
| **FACT FROM FRS** | Stated in an authoritative `ProductionFRS/DOCUMENT_*` source |
| **UNTRACKED DESIGN EVIDENCE** | Present only in untracked in-flight restructuring files (informational, NOT authoritative, NOT absorbed) |
| **PROPOSED DECISION** | Drafted here by the architecture, pending HUMAN approval |
| **HUMAN DECISION REQUIRED** | Cannot be resolved from evidence; must be answered by the business/owner |

## 5. The Integration Boundary (DEC-PROD-004 applied)

### 5.1 Fact: Production never writes stock directly (FACT FROM FRS + COMMITTED CODE)

- **DEC-PROD-004 (FACT FROM FRS, DOCUMENT_47):** Production must never write stock directly; Inventory
  owns StockLedger/StockBalance/availability/posting/reversal. Production = execution facts, material
  requirement/consumption facts, transaction intent.
- **FACT FROM COMMITTED CODE:** `StockService` (committed) owns all ledger writes via `recordStockIn(...)` /
  `recordStockOut(...)`, which write `StockLedger` and `StockBalance`. No committed production class writes
  `StockLedger`/`StockBalance` directly.

### 5.2 Fact: The committed mechanism is synchronous same-transaction delegation (FACT FROM COMMITTED CODE)

The committed `ProductionController` already performs inventory hand-off by **calling `StockService`
directly, in the same transaction**, for two flows:

1. **Conversion flow** (`~l.682-716`): delegates an out-movement (consumption) and an in-movement (finished
   good) to `StockService` using `recordStockOut` / `recordStockIn`.
2. **Return flow** (`~l.775-787`): delegates a returned-material in-movement to `StockService`.

Committed call shape (field-level, from code):
`(docNo = documentNumber, docType = "product-conversion" / "production-return", txType = "CONVERSION_OUT" / "CONVERSION_IN" / "RETURN_RECEIPT", itemCode, location, batchNo, heatNo, qty, txDate, user, stockStatus)`.

### 5.3 Fact: No committed outbox exists (FACT FROM COMMITTED CODE)

- **FACT FROM FRS (DOCUMENT_47 / DOCUMENT_15 roadmap):** DEC-PROD-004 prescribed eventual posting via a
  `stock_tx_intent` outbox (`tinventory_stock_tx_intent`-style remittance).
- **FACT FROM COMMITTED CODE:** No committed outbox/`stock_tx_intent` table, carrier, or dispatcher exists in
  the committed production/stock flows. The committed mechanism is direct synchronous `StockService` call.

**Consequence (evidence judgment, not invention):** The FRS-prescribed outbox is a **FUTURE/decoupled**
pattern. It is NOT the committed mechanism. Any PROPOSED DECISION for the fit-now contract must be grounded
in the committed synchronous-delegation mechanism — otherwise P5 would be inventing a contract the system
does not implement, which is explicitly forbidden.

### 5.4 UNTRACKED DESIGN EVIDENCE (informational, NOT authoritative)

Untracked `ProductionStockBoundary` / `InventoryIntegrationService` propose a **thin synchronous facade**
over `StockService` (same-transaction, explicitly **NOT** outbox) with methods such as
`receiveFinishedGood`, `consumeConversionInput`, `receiveConversionOutput`, `receiveProductionReturn`.
They corroborate that the **committed synchronous-delegation pattern is the project's actual direction**,
but they are UNTRACKED and MUST NOT be absorbed or used to redefine the committed architecture.

---

## 6. ADR-001 — Integration Mechanism (Material Request → Inventory Issue)

### 6.1 Decision framework

| Aspect | Evidence |
|---|---|
| What is being decided | The mechanism by which Production requests material issuance from Inventory and the mechanism by which Inventory issues it. |
| Committed precedent | Synchronous same-transaction direct `StockService` delegation (5.2) |
| FRS-prescribed | `stock_tx_intent` outbox (5.3) — FUTURE pattern |
| Untracked proposal | Thin synchronous facade over `StockService` (5.4) — evidence only |

### 6.2 Options considered

| Option | Mechanism | Pros | Cons |
|---|---|---|---|
| **D. Committed-architecture mechanism (synchronous same-tx StockService delegation)** | Direct call, same DB transaction | Matches committed code today; strong consistency; simple; no new infrastructure; no outbox; idempotency via `(docNo, docType)` | Couples Production→Inventory latency & failure into one tx; not decoupled |
| A. Outbox `stock_tx_intent` | Persist intent row, async carrier posts | Decoupled; retryable; FRS-prescribed | No committed implementation; async eventual consistency; more infrastructure; larger change surface; NOT compatible with committed code as-is |
| B. Event bus / messaging | Pub-sub between services | Fully decoupled | No committed messaging infra; highest complexity; not fit-now |
| C. Shared facade DTO + mapper only | Introduce boundary layer (comms) that may or may not write stock | Clean seams | Would wrap a mechanism that does not currently exist; large surface |

### 6.3 PROPOSED DECISION — ADR-001

> **Status: PROPOSED — HUMAN APPROVAL REQUIRED (this is decision preparation, not enactment).**
>
> **D. For the fit-now contract, Production ⇄ Inventory issuance is executed by synchronous,
> same-transaction delegation to the Inventory-owned `StockService` (the committed mechanism), following
> the exact committed pattern at `ProductionController` conversion/return flows.** The FRS-prescribed
> `stock_tx_intent` outbox is **deferred** and recorded as a FUTURE decoupling consideration requiring a
> separate ADR and explicit approval before introduction. No Material Request entities/APIs/UI are created
> in this phase.

Rationale (grounded in evidence):

1. The committed mechanism already exists and is the authoritative evidence of the intended integration
   contract (5.2). Introducing an outbox that has no committed implementation would require P6 to build
   features beyond the evidenced architecture — forbidden in P5 and not yet approved for P6.
2. DEC-PROD-004 is still honored: production delegates **intent/execution facts** to `StockService`, which
   owns the ledger/balance writes (5.1). Production does not write stock.
3. Same-transaction execution gives immediate, strongly-consistent ledger/balance adjustments and a single
   unit of work (atomicity) — matching what the committed flows already do.

### 6.4 HUMAN DECISION REQUIRED (ADR-001)

1. Confirm **fit-now = synchronous delegation (Option D)** rather than mandating the FRS outbox now.
2. If the business later requires decoupling/high-volume async issuance, that becomes a **separate ADR** for
   outbox introduction — to be requisitioned explicitly, NOT initiated here.

---

## 7. ADR-002 — Inventory Posting Mechanism (Production Consumption → Inventory Posting)

### 7.1 Decision framework

| Aspect | Evidence |
|---|---|
| What is being decided | Who writes StockLedger/StockBalance for production consumption and finished-good receipts, and by what call shape. |
| Committed precedent | ProductionController → `stockService.recordStockOut/recordStockIn` (same-tx) |
| Ledger owner | `StockService` methods `balances()`, `available()`, `onHand()`, `qcHold()`, `recordStockIn()`, `recordStockOut()` |
| Stock query facility | `available(item, loc)` and `onHand(item, loc, batch)` exist and are committed |

### 7.2 PROPOSED DECISION — ADR-002

> **Status: PROPOSED — HUMAN APPROVAL REQUIRED.**
>
> **All production-originated stock adjustments (raw/consumable consumption OUT; finished-good / returned
> material IN) are posted by the Inventory-owned `StockService` via `recordStockOut(...)` / `recordStockIn(...)`
> invoked synchronously and within the production transaction.** Production does not write ledger/balance
> directly. This is exactly the committed contract (5.2, 7.1) and the DEC-PROD-004 boundary.

### 7.3 Posting contract (call-shape contract, grounded in committed shape)

| Field (committed param) | Meaning |
|---|---|
| `docNo` | Production document number (business unique via `DocNumberService` / `BaseDoc.docNo`) |
| `docType` | `product-conversion` / `production-return` (committed values) — extend only if evidence supports |
| `txType` | `CONVERSION_OUT` / `CONVERSION_IN` / `RETURN_RECEIPT` (committed values) |
| `itemCode`, `location`, `batchNo`, `heatNo` | Identity of the stock movement |
| `inQty` / `outQty` | Signed quantity direction |
| `txDate`, `user` | Audit fields |
| `stockStatus` | Status applied to the stock (committed set) |

### 7.4 HUMAN DECISION REQUIRED (ADR-002)

1. Confirm the **txType vocabulary** is sufficient or needs additive production-specific values (e.g. a
   dedicated consumption `txType` distinct from `CONVERSION_OUT`). Evidence shows `CONVERSION_OUT` is the
   current committed consumption alias.
2. Confirm `stockStatus` values that production receipts may write (finished-good status, return status).

---

## 8. Cross-Module Integration Contract (Material Consumption → Inventory Posting)

### 8.1 Fact: Inventory owns availability and on-hand (FACT FROM COMMITTED CODE)

Committed `StockService.available(item, loc)` and `onHand(item, loc, batch)` are Inventory-owned. Production
material validation (V-19 `consumed ≤ available`) reads availability through the inventory lens.

### 8.2 Fact: Production material capture is field-persisted (FACT FROM COMMITTED CODE)

`ProductionEntryMaterial` (committed) persists capture fields: `reqQty`, `totalIssuedQty`, `availableQty`,
`consumedQty`, `deviationQty`, `returnQty`, `scrapQty`, `rate`, `batch`.

### 8.3 Inventory guard / dedupe (FACT FROM COMMITTED CODE)

Committed inventory guard is `(docNo, docType)` via `LedgerRepository.existsByDocNoAndDocType` → silent
no-op on duplicate. `StockBalance` has a DB unique key on `(item, location, batch, heat, stock_status)`.

### 8.4 Same-transaction semantics (FACT FROM COMMITTED CODE)

`StockService` is class-level `@Transactional`; production delegation occurs in the same transaction as the
production write. On any downstream failure the whole unit of work rolls back (atomic).

### 8.5 Contract conclusion (PROPOSED)

The integration contract is fully evidenced by the committed code:

- **Identity:** business `docNo` + `docType` = authoritative transaction id for the ledger guard.
- **Mechanism:** synchronous same-transaction delegation.
- **Atomicity:** ledger/balance and production entity update succeed or fail together.
- **Dedup/idempotency:** `(docNo, docType)` guard + `StockBalance` unique key.
- **Audit:** `txDate`, `user`, `stockStatus` passed through.

---

## 9. Identity & Idempotency Analysis

| Concern | Evidence / proposed handling |
|---|---|
| Business txn identity | `docNo` (unique via `DocNumberService` / `BaseDoc.docNo`) (FACT) |
| Ledger duplicate guard | `existsByDocNoAndDocType` → silent no-op (FACT) |
| Balance unique key | `(item, location, batch, heat, stock_status)` (FACT) |
| HTTP-level idempotency | Committed `PostingIdempotencyKey` used by Production Entry `post` (HTTP header); generic `@Idempotent` AOP exists but is unused for posting (FACT) |
| PROPOSED rule | Every stock movement SHALL be reproducible by the same `(docNo, docType)` guard; re-posting a completed transaction is a no-op, not an error |

## 10. Failure, Retry, Partial-Issue, Reversal, Audit

| Concern | Evidence / proposed handling |
|---|---|
| Failure/rollback | Same-tx atomicity → rollback on any failure (FACT, 8.4) |
| Retry | Re-call guarded by `(docNo, docType)` → idempotent no-op; safe to retry (FACT, 9) |
| Partial issue | Material `totalIssuedQty ≤ reqQty`; V-19 `consumed ≤ available`; availability checked per line (FACT) |
| Reversal | DEC-PROD-004: Inventory owns reversal. Production return flow (`~l.775-787`) delegates IN movement via `stockService.recordStockIn` — evidence that reversal/return is an Inventory-owned IN movement (FACT) |
| Audit | `txDate`, `user`, `stockStatus` captured on every movement (FACT) |

## 11. Open Clarifications Register (unchanged — no silent resolution)

Per P5 guard, these remain OPEN / HUMAN DECISION REQUIRED. P5 does not resolve them.

| ID | Topic | Status |
|---|---|---|
| CLAR-PROD-002 | Quantity reconciliation formula (see DOCUMENT_49) | OPEN — see DOCUMENT_49 |
| CLAR-PROD-003 | Return disposition (reworkable vs scrap vs hold) | OPEN |
| CLAR-PROD-005 | Subjob ↔ route linkage | OPEN |
| CLAR-PROD-006 | Idle reasons | OPEN |
| CLAR-PROD-008 | Conversion costing | OPEN |
| CLAR-PROD-011 | Batch/lot handling | OPEN |
| CLAR-PROD-012 | Quality gate | OPEN |
| CLAR-PROD-013 | Sampling/PPM | OPEN |

## 12. P6 Entry Gate Classification

The integration ADRs above are prerequisites to P6 (Material Request → Inventory Issue and Consumption →
Inventory Posting implementation).

- **Gate for this integration contract (from DOCUMENT_48):** 
  **C = BLOCKED BY REQUIRED DECISIONS** — the ADR-001/ADR-002 PROPOSED DECISIONS require explicit HUMAN
  approval (6.4, 7.4) before P6 implementation can treat the contract as fixed.
- P6 itself is **NOT** started by this phase (STOP at end of P5).

## 13. File Modification Summary

| File | Action |
|---|---|
| `ProductionFRS/DOCUMENT_48_Production_Inventory_Integration_Architecture_Decisions.md` | CREATED (this document) |
| All other files | Not modified by P5 |

## 14. Git Safety Confirmation

| Check | Result |
|---|---|
| Staged file count after P5 | 0 |
| Commit created | No |
| Push performed | No |
| Existing working-tree / untracked state | Unchanged |
| Stock ledger / balance / material-request writes | None performed |
