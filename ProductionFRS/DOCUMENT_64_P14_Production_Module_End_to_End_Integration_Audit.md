# DOCUMENT 64 — PRODUCTION MODULE END-TO-END INTEGRATION AUDIT (P14)

**Document ID:** DOCUMENT_64
**Phase:** P14 — Production Module End-to-End Integration Audit (READ-ONLY / AUDIT-FIRST)
**Author:** Audit Agent
**Date:** 2026-09-05
**Authorization:** P14 authorization issued by Product Team. This audit is READ-ONLY. NO application, migration, or configuration code was changed. The ONLY project artifact produced by this phase is this document.
**Git safety:** Commit NO / Push NO / Stage NO / Reset NO / Clean NO / Stash NO / Rebase NO — all apply.

---

## 1. Executive Summary

The Production module (P6–P13 capabilities) was audited end-to-end against the approved documentation base (DECISION_REGISTER, CHANGELOG, DOCUMENT_57–63). The audit was read-only; the only deliverable is this document.

**Result:** The module is **production-capable WITH LIMITATIONS**. Core flow, quantity calculations, stock conservation, and the P6–P13 command paths are verified consistent with the approved agreements. **3 HIGH, 5 MEDIUM, 5 LOW, and 3 DOCUMENTATION severity findings** were identified (no CRITICAL). All HIGH findings are **latent schema-runtime contradictions** that are masked in the development/test environment by a Flyway-disabled test profile and only surface at deployment time (staging/prod where Flyway is enabled with `ddl-auto: validate`).

The three HIGH findings must be resolved by the recommended fix sequence (§33) and two business decisions (§34) before the module is deployed to a Flyway-managed environment.

## 2. Audit Authorization

- P14 = **Production Module End-to-End Integration Audit**.
- Scope: P6 (Production Consumption + Inventory Boundary), P8 (Entry Multi-Output + Reversal), P9 (Disposition), P10 (Batch Card), P11 (Quality Gate), P12 (Production Return), P13 (Product Conversion), plus the integration spine (WIP/formula, inventory, numbering, workflow, reports, reversal, idempotency, concurrency, security, database, migration, API contract, frontend contract). P7 (Approval + Regate) remains approved as delivered in DOCUMENT_57 and is not re-audited.
- Constraint: **READ-ONLY / AUDIT-FIRST**. No code changes. No migration changes. No config changes. No frontend changes. No tests added unless absolutely required to reproduce an audit observation (none were required).
- Deliverable: `ProductionFRS/DOCUMENT_64_P14_Production_Module_End_to_End_Integration_Audit.md`.
- Do NOT fix findings. Classify findings (🔴/🟠/🟡/🔵/⚪), root-cause category, evidence, recommended safe fix, approval needed, and candidate regression tests. Do NOT continue past this phase. Stop and wait for human review.
- Severity legend: 🔴 CRITICAL · 🟠 HIGH · 🟡 MEDIUM · 🔵 LOW · ⚪ DOCUMENTATION/UX.
- Root-cause categories: DATABASE · MIGRATION · NUMBERING · WORKFLOW · INVENTORY · CONCURRENCY · IDEMPOTENCY · REVERSAL · API · ACCESS CONTROL · TEST COVERAGE · ARCHITECTURE · DOCUMENTATION · UX.

## 3. Baseline

| Item | Value |
|---|---|
| Working directory | `/home/sanjai/Desktop/ERP Updated/zyger-erp-staging` |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Last commit | `feat(production): add controlled P3.4 backfill operational control layer` |
| Working tree entries (`git status --short`) | 284 |
| Staged deltas (`git diff --cached --stat`) | 0 |
| Working-tree deltas (`git diff --stat`) | 131 (baseline; pre-existing) |
| Final HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged) |

## 4. Source Documents

Read (full): `DECISION_REGISTER.md` (113 lines), `CHANGELOG.md` (124 lines), `DOCUMENT_57_P7_Approval_Record_and_Regate.md` (145 lines).
Read (headings): `DOCUMENT_58_P8*`, `DOCUMENT_59_P9*`, `DOCUMENT_60_P10*`, `DOCUMENT_61_P11*`; full capability docs `DOCUMENT_62_P12*`, `DOCUMENT_63_P13*` (authored during P12/P13).
Reference capacity: earlier docs 05/06/07 (entry-line contract), 13 (API spec), 15 (RFC inventory), 17 (RFC quality), 18 (P1 API), 19 (RFC approval), 45/47/49/50/51/52/54/55/56.

## 5. Architecture Inventory

Backend (Spring Boot):

- Entry controller: `controller/ProductionController.java` — `/api/v1/production/**` (entries, job-cards, log-sheets, idle-time, returns, conversions, reports, pending, dashboard). Batch cards are a separate controller (§20).
- Convenience/approval: `service/DocumentFacade.java`, `service/DocNumberService.java`, `service/WorkflowStateMachine.java`, `doc/DocTypes.java`.
- Production services: `ProductionEntryService`/`ProductionEntryQueryService`/`ProductionNormalizedEventService`, `ProductionJobCardService`, `ProductionMaterialRequestService`, `ProductionConsumptionService`, `ProductionReturnService`, `ProductionDispositionService`, `ProductionBatchCardService`, `ProductionQualityGateOverrideService`, `ProductConversionService`.
- Inventory boundary: `InventoryIntegrationService` + `StockService` (single stock-write authority, ledger + balance), `ProductionStockBoundary` for FG receipt.
- Reversal: inline lifecycle in `ProductionController` (entry/multi-output) and service-internal for return/conversion/disposition.
- Stub (Phase 1, isolated): `production/api/ProductionEntryController` → `/api/v1/production/entries-stub` (persists to isolated `prod_operation_execution_event` table, no StockService, no legacy tables).
- Frontend: `zyger-erp-frontend/src/pages/production/**` (ProductionEntryScreen, ProductionOrderScreen, JobCardScreen/JobCardKanban, ProductConversionScreen, ProductionReturnScreen, batch-card screens, reports, pending, dashboard), `src/services/production-api.ts` + `productionEntryApi.ts` + `batchCardApi.ts`.
- Tests: `service/Production*Test.java` (unit), `P6InventoryIntegrityIntegrationTest` (Testcontainers), `ProductionEntryMultipleOutputIntegrationTest` (Testcontainers), `ProductConversionServiceTest` (+23), `ProductionReturnServiceTest`.

## 6. Capability Matrix

| Capability | Doc | Audit status | Integration evidence |
|---|---|---|---|
| P6 Production Consumption + Inventory Boundary | DOC_57/58 (DC+DB) | Consistent | `ProductionConsumptionService` + `StockService` + `P6InventoryIntegrityIntegrationTest` (INTEGRATION) |
| P7 Approval + Regate | DOC_57 | Approved; not re-audited (read-only reference) | — |
| P8 Entry Multi-Output + Reversal | DOC_58 | Consistent at doc level; **F1** (schema CHECK) + **F3** (FG compensation) | `ProductionEntryMultipleOutputIntegrationTest` (JSON + projection only) |
| P9 Disposition | DOC_59 | Consistent (recording-only) | unit + source |
| P10 Batch Card + Batch Identity | DOC_60 | Consistent | `ProductionBatchCardService` + unit |
| P11 Quality Gate | DOC_61 | Consistent | `ProductionQualityGateOverrideService` + unit |
| P12 Production Return | DOC_62 | Consistent (unit-only) | `ProductionReturnServiceTest` (unit) |
| P13 Product Conversion | DOC_63 | Consistent (unit-only) | `ProductConversionServiceTest` (23 unit) |

## 7. End-to-End Workflow (as-is)

```text
Planning (work_order) → ProductionOrderScreen
  → material-request (PM, DRAFT→SUBMIT→APPROVE; ISSUE → stock-allotment reservation)
  → consumption (PC POST → recordStockOut per line; reservation released)
  → job card (JCF) RELEASE/START → production entry (PE) POST (quality gate recorded)
  → rejection/scrap/rework disposition docs (recording-only)
  → batch card (BC) allocation from entry output; exhaustion guarded
  → job card COMPLETE → FG_RECEIPT (recordStockIn)
  → WIP derived = max(input − (accepted+rejected+rework+scrap), 0)
  → cross-body: production return (PR receive → RETURN_RECEIPT IN) / conversion (CV −OUT/−IN)
```

Traceability verified across controllers/services/boundaries for scenarios A–F in §30.

## 8. Quantity Audit

- WIP formula (approved, unchanged): `deriveWip(resolvedInput, accepted, rejected, rework, scrap) = max(resolvedInput − (accepted + rejected + rework + scrap), 0)` — confirmed in `ProductionNormalizedEventService.deriveWip` (≈ line 351). `resolvedInput` from `InputResolutionResolver` (never raw `process_qty`). Multi-output (P8) rows are co/by-product recording-only and are correctly excluded from the WIP denominator. **PASS.**
- Partial consumption, low-stock failure, `stock_balance` decrement and returned-stock balance, back-dated receive: verified via `P6InventoryIntegrityIntegrationTest` (Testcontainers). **PASS.**
- P9 disposition docs classify quantities (REJ/SC/PER) already present on the entry; WIP uses the entry fields, so disposition docs do not double-count WIP. **PASS.**
- P12 return movements reduce returned stock; returns do not interact with WIP (session-based from entries). **PASS.**
- P13 conversion is a pure material movement (input OUT, output IN); it does not change WIP. **PASS.**
- Batch-level WIP is derived (CLAR-011), not stored as a column. **PASS.**

## 9. Inventory Audit (Conservation)

Inventory movements owned by Production all flow through `StockService` (`recordStockIn`/`recordStockOut` → `stock_ledger` + `stock_balance`). Volume-verified movements:

1. Consumption POST → `recordStockOut` per line, key `{consumptionNo}-{lineId}`, txType production-consumption. **PASS.**
2. Job-card COMPLETE → `ProductionStockBoundary.recordJobCardCompleteGood` → `recordStockIn(jobCardNumber, "job-card-complete", FG_RECEIPT, …)`. **PASS** (with F3 reversal-compensation limitation, §23).
3. Production return receive → `RETURN_RECEIPT` IN under the return doc. **PASS.**
4. Conversion POST → `consumeConversionInput` OUT (`{no}-OUT`) + `receiveConversionOutput` IN (`{no}-IN`). **PASS** (distinct keys verified by unit tests).
5. Material-request ISSUE → stock-allotment is a reservation (Effect.NONE), no physical movement. **PASS** (P6 B-a invariant).
6. No direct `stock_ledger`/`stock_balance` writes exist in the Production module (scanned). **PASS.**

**Limitation (F3):** reversing a POSTED production entry after the parent job card COMPLETED does not compensate the FG_RECEIPT credit. See §23.
**Cross-module anomaly (F15):** Maintenance `SpareRequestService` (~line 249) writes `stock_ledger` directly without updating `stock_balance`. Out of Production scope but affects cross-module conservation and reports.

## 10. P6 Audit (Consumption + Inventory Boundary)

- Lifecycle DRAFT→SUBMITTED→APPROVED→POSTED with inline checks; WSM `validateTransition` called (`ProductionConsumptionService:112`). **PASS.**
- Consumption POST: server-side availability check, per-line OUT rows, `stock_balance` decrement, reservation release, low-stock failure → rollback. Verified by `P6InventoryIntegrityIntegrationTest`. **PASS.**
- Reservation lifecycle: ISSUE creates+approves `stock-allotment` (Effect.NONE); CANCEL/CLOSE release remaining APPROVED reservation; duplicate ISSUE guarded by `reservationExists` (idempotent no-op). **PASS** (B-a invariant verified).
- **Finding F6 (MEDIUM):** OUT dedupe = `existsByDocNoAndDocType` check-then-insert with no DB unique constraint. See §24/§25.

## 11. P8 Audit (Entry Multi-Output + Reversal)

- Entry POST persists primary output + additional outputs (`ProductionEntry.additionalOutputs`, cascade ALL + orphanRemoval). **PASS.**
- Additional outputs recorded as item/location/output-type/quantity; WIP unchanged (using primary accepted only for the WIP denominator). **PASS.**
- Reversal creates a reversed entry (`PE-REV`) and negates additional-output rows (`quantity.negate()`); JSON + projection mirror verified by `ProductionEntryMultipleOutputIntegrationTest` (4 tests). **PASS at document level.**
- **Finding F1 (HIGH):** V7 migration declares `CHECK (quantity > 0)` on `production_entry_output`; the reversal INSERT violates it. Green in tests only because the Testcontainers schema is Hibernate-created without the CHECK. Reversing any co/by-product entry on a Flyway-managed DB → CHECK violation → 500. See §23 and §27.
- **Finding F3 (HIGH):** reversal does not compensate the job-card-complete FG_RECEIPT. See §23.

## 12. P9 Audit (Disposition)

- Disposition docs (REJ/SC/PER) are RECORDING-ONLY — no stock movement; lifecycle (DRAFT→SUBMITTED→APPROVED→POSTED→REVERSED) enforced in `ProductionDispositionService` inline; reversible. **PASS.**
- No double-count into WIP (WIP driven from entry fields). **PASS.**
- **Finding F5 (MEDIUM):** disposition lifecycle is inline switch, not WSM (`validateTransition` not called). See §19.

## 13. P10 Audit (Batch Card + Batch Identity)

- Batch card allocation from POSTED entry remaining output; exhaustion/over-allocation/release-with-reissue guarded and unit-tested (`ProductionBatchCardService`; `validateTransition` at `:200`). **PASS.**
- Batch identity persisted for controlled items across consumption/return/conversion where applicable; batch-qty consistency validated. **PASS.**
- Batch-level WIP not materialized as a column (per CLAR-011). **PASS.**

## 14. P11 Audit (Quality Gate)

- Quality gate is recording-only: entry POST records gate status/history; overrides expose a recording path with **one-time consumption** enforced in `ProductionQualityGateOverrideService` (verified by unit tests). **PASS.**
- Gate does not block POST; completion with pending quality only warns (per P7). **PASS.**
- **Finding F5 (MEDIUM):** gate actions mutate state inline (no WSM call). See §19.

## 15. P12 Audit (Production Return)

- DRAFT→SUBMITTED→APPROVED→POSTED→RECEIVED; `validateTransition` called (`ProductionReturnService:120`). **PASS.**
- Condition-mandatory-when-posting (D-C1) verified in service + unit tests. **PASS.**
- Return balance + on-hand cap; receive posts a single `RETURN_RECEIPT` IN; RECEIVED is terminal (re-receipt blocked). **PASS.**
- **Finding F13 (MEDIUM):** coverage is unit-only; no Spring/Testcontainers integration test for receive → stock / rejected-receive → no stock.

## 16. P13 Audit (Product Conversion)

- Lifecycle DRAFT→SUBMITTED→VERIFY→POSTED via `validateTransition` (`ProductConversionService:107`). **PASS.**
- Quantity contract validated server-side (input>0, output>0, losses≥0, output+loss+scrap≤input). **PASS.**
- POST is atomic: OUT (`{no}-OUT`) + IN (`{no}-IN`) + `stock_balance` sync in one transaction; rollback tested. **PASS.**
- Numbering full config-aware: `nextNumberFromConfig("product-conversion", plantId)` → `CV-{PLANT}-{FY}-{SEQ}`. **PASS** — the only production doc type using the config-aware engine (see F4).
- Lifecycle `complete`/`COMPLETED` removed from conversion UI/API per DOC_63. **PASS.**
- **Finding F13 (MEDIUM):** coverage is unit-only; no integration test of OUT/IN ledger rows.

## 17. Numbering Audit

- Uniqueness: all doc types sequence via `doc_sequence` rows under pessimistic lock (`findByKeyAndYearForUpdate`) — uniqueness is preserved regardless of prefix. **PASS.**
- **Finding F4 (MEDIUM):** configured prefixes vs runtime prefixes diverge for THREE doc types because two-arg `DocNumberService.next(docType, prefix)` uses the passed prefix and IGNORES `numbering_config`:

| Doc type | numbering_config seed | Runtime prefix (source) | Runtime example |
|---|---|---|---|
| job-card | JC | `JCF` (`ProductionJobCardService:91,126`) | JCF-2026-0001 |
| production-log-sheet | PL | `PLS` (`ProductionController:797`) | PLS-… |
| idle-time-entry | ID | `ITE` (`ProductionController:897`) | ITE-… |
| production-return | PR | single-arg (config) | PR-… |
| product-conversion | CV | `nextNumberFromConfig` | CV-{PLANT}-{FY}-{SEQ} |

- Reversal prefixes are ad-hoc and NOT registered in `numbering_config`: `PE-REV`, `BC-RV`, `REJ-RV`, `SC-RV`, `PER-RV` (all fit `doc_no` varchar(60)). **PASS on capacity; documentation gap.**
- Only P13 uses the config-aware `-{PLANT}-{FY}-{SEQ}` path; the legacy two-arg path yields `PREFIX-YEAR-SEQ` (no plant/FY segments) → parallel numbering engines.

## 18. Workflow Audit

- `validateTransition` callers (audited): `ProductionBatchCardService:200`, `ProductConversionService:107`, `ProductionReturnService:120`, `ProductionConsumptionService:112`, `ProductionMaterialRequestService:134`.
- Entry/log-sheet/idle-time/disposition/job-card/quality-gate actions mutate status **inline**:
  - `ProductionController` entry action (~387), reverse (~480–602), log-sheet (~797/833), idle-time (~897/933).
  - `ProductionJobCardService` release/start/hold/complete/close/reopen (~340–370).
  - `ProductionQualityGateOverrideService`, `ProductionDispositionService` inline transitions.
- **Finding F5 (MEDIUM):** the `production-entry` map in `WorkflowStateMachine` is dead code AND inconsistent with the implemented lifecycle — it maps `DRAFT→{SUBMIT,CANCEL}`, `SUBMITTED→{APPROVE,REJECT}`, `APPROVED→{}` and omits POST/REVERSE. No callers use it. `production-log-sheet` and `idle-time-entry` have no WSM maps at all.

## 19. API Audit

- Base envelope + pagination via `apiClient`; endpoints centralized in `production-api.ts` (`/v1/production/...`). **PASS.**
- Backend base `/api/v1/production` — matches frontend `/v1/production` (strip `/api`). **PASS.**
- Batch cards: `ProductionBatchCardController` at `/api/v1/batch-cards` (NOT under `/v1/production`); frontend `batchCardApi.ts` matches. **Functional PASS; naming parity LOW (F12).**
- **Finding F10 (LOW):** Phase-1 stub `/v1/production/entries-stub` (POST → `prod_operation_execution_event`) is still live and wired to `productionEntryApi.ts`/`useProductionEntry.ts`. Safe (isolated, no StockService/legacy), but should be gated/removed.
- **Finding F14 (LOW):** entry lifecycle business logic lives in the controller (subjob qty mutation ~420–446, `numbers.next` calls) rather than in a service; legacy inline pattern.

## 20. Frontend Contract

- Screens map cleanly to backend endpoints: `ProductionEntryScreen` → `/v1/production/entries` + offline enqueue; reports → `/v1/production/reports/*`; `JobCardKanban` columns PENDING/RELEASED/IN_PROGRESS/ON_HOLD/COMPLETED/CLOSED with ACTION_LABELS RELEASE/START/HOLD/CANCEL/COMPLETE/QUALITY_HOLD/CLOSE/REOPEN. **PASS.**
- Stale-reference scan: no `COMPLETED`, `PC-`, `PRR`, `CV-`, or `complete` action references remain on conversion/return screens. **PASS.**
- **Finding F8 (LOW):** optimistic-lock version handshake inconsistent — only `ProductionReturnScreen` sends `version` on PUT; conversion/consumption/entry PUTs do not, so `@Version` on entities is not leveraged from the UI (stale-overwrite risk on concurrent editors).
- **Finding F9 (LOW):** `ProductionOrderScreen` gates approve/cancel with `can('planning', …)` while the rest of the module uses `can('production', …)` (work_order is planning-owned per ADR-002; wiring is inconsistent RBAC/UX).
- **Finding F13 (MEDIUM):** 34 frontend tests total; 0 for the 23 production pages/services.

## 21. Reporting Audit

- Rejection/rework/idle/machine/operator summaries are server-side aggregates sourced from POSTED entries (`ProductionController:617–699`); dashboard KPIs at `:1128`; pending queue at `:1078`. **PASS** (BR-12 semantics hold).
- **Observation:** `ProductionRejectionScreen` and `ProductionOutputScreen` fetch raw `/v1/production/entries` and aggregate client-side (output list is not a server aggregate). Not a calculation defect; a parity observation.
- WIP is derived (not reportable as stored column); batch WIP derived per CLAR-011. **PASS.**

## 22. Reversal Audit

- Entry reversal: `PE-REV` doc + subjob decrement of completed/rejected/rework/scrap + negated additional-output rows; verified in JSON + projection integration tests. **PASS at document level.**
- **Finding F1 (HIGH):** V7 `CHECK (quantity > 0)` on `production_entry_output` (§11) is violated by the negated additional-output row. Masked in tests (Hibernate-created schema, no CHECK). REVERSAL/DATABASE.
  - Evidence: `db/migration/V7*.sql` constraint `ck_production_entry_output_qty_positive`; `ProductionController` reverse block persisting `quantity().negate()` rows; `ProductionEntryMultipleOutputIntegrationTest` never queries the table row.
  - Safe fix: V11 migration to drop the CHECK and add a signed-`direction`-aware column (or persist positive adjustment rows with a record type), plus regression tests asserting the reversal row and projection sign.
- **Finding F3 (HIGH):** reversing an entry under an already-COMPLETED job card does NOT re-issue or compensate the FG inventory credit posted at job-card complete (`recordStockIn(jobCardNumber, "job-card-complete", FG_RECEIPT)`). Inventory stays over-credited vs the reversed document. REVERSAL/INVENTORY.
  - Evidence: `ProductionStockBoundary` FG receipt; `ProductionController` reverse (~550–576) has no stock call.
  - Business decision required (D-REV-01, §34).
  - Safe fix (once decided): on entry reversal under COMPLETED job card, post compensating FG credit reversal with signed key; add integration test.
- Return/conversion reversal: terminal-state guarded (POSTED→RECEIVED/REVERSED); no double movement. **PASS (subject to §25 race).**

## 23. Idempotency Audit

- Entry POST uses X-Idempotency-Key via `posting_idempotency_key` (V8). **PASS.**
- Conversion/return/consumption POSTs run in single `@Transactional` with terminal-state guards (POSTED/RECEIVED terminal); retries of an already-terminal doc are rejected by state. **PASS.**
- Duplicate ISSUE on material request guarded by `reservationExists`. **PASS.**
- **Finding F6 (MEDIUM):** `StockService.recordStockIn/Out` dedupe is `ledger.existsByDocNoAndDocType(...)` check-then-insert; `posting_idempotency_key` is NOT consulted by StockService (only by entry POST/disposition). ADR-PROD-005 claimed "REUSE StockService + stock_ledger + posting_idempotency_key" — only partially honored. IDEMPOTENCY.
  - Safe fix: fold an explicit idempotency-key column into `stock_ledger` movement rows and enforce at the DB (see §25 unique index).

## 24. Concurrency Audit

- Doc-number allocation: `doc_sequence` pessimistic lock (`findByKeyAndYearForUpdate`). **PASS.**
- Server-side stock availability checked under the same transaction as the OUT write. **PASS.**
- **Finding F6 (MEDIUM):** `stock_ledger` has **no unique constraint** on `(doc_no, doc_type)` (V1: PK only + non-unique `idx_ledger_doc`, `idx_ledger_item_loc`) → two concurrent duplicate postings (consumption/return/conversion/job-card-complete) can both pass the exists-check and double-post stock. CONCURRENCY/IDEMPOTENCY.
  - Safe fix: V11 partial unique index on `stock_ledger(doc_no, doc_type)` + predicate-safe insert; regression test with two concurrent transactions.
- Optimistic-lock `@Version` present on entities but not exercised from the majority of the UI (see F8, §20) → concurrent editors can silently overwrite.

## 25. Security Audit

- No secrets/keys in production code; controller logs sanitized (stub logs work-order/operation id only, never payload). **PASS.**
- Audit fields (createdBy/At, updatedBy/At, version) on entities. **PASS.**
- RBAC via `can('production', …)`; `ProductionOrderScreen` uses planning permission (F9, §20). **PASS with LOW note.**
- No SQL injection surface beyond standard JPA queries; DTO validation server-side on quantity contracts. **PASS.**

## 26. Database Audit

- Entities `prod_consumption`/`prod_consumption_line` referenced by `ProductionConsumption(Line)` entities but **absent from all Flyway migrations** (grep across `db/migration/`). MIGRATION/DATABASE — see F2.
- `production_entry_output` CHECK/uniqueness per V7 (F1). **PASS in dev; fails in staging.**
- Reversal prefixes (`PE-REV`, `BC-RV`, …) fit `doc_no` varchar(60); `doc_type` varchar(60) fits `job-card-complete`. **PASS.**
- No direct `stock_ledger` writes from Production module. **PASS** (Maintenance exception F15).

## 27. Migration Audit (Flyway)

- Default/dev profile (`application.yaml`): `spring.flyway.enabled: false` + `jpa.hibernate.ddl-auto: update` → schema is Hibernate-derived in dev/test.
- Staging/prod (`application-staging.yaml`, `application-prod.yaml`): Flyway enabled (`baseline-on-start: true`, baseline-version 0) + `ddl-auto: validate`.
- Consequences:
  - **F2 (HIGH):** `prod_consumption`/`prod_consumption_line` exist only via Hibernate auto-DDL; a fresh Flyway-managed DB fails `validate` at boot (missing tables).
  - **F1 (HIGH):** DB-level CHECK constraints (V7 qty>0, V8 caps, V10 NOT NULL) exist only where Flyway runs; dev/test have none, so the reversal-negation path never fails in CI but WILL fail in staging/prod.
  - **F7 (MEDIUM):** dev/test and staging/prod schemas structurally diverge (Hibernate-derived vs Flyway-managed); all DB-level invariants are effectively untested in CI.
  - Safe fixes: V11 creating `prod_consumption`/`prod_consumption_line` (mirroring Hibernate DDL) + drop `production_entry_output` qty CHECK (superseded by F1 signed-column fix); add an integration test that boots with Flyway enabled to enforce migration truth.

## 28. Test Coverage

| Area | Coverage | Verdict |
|---|---|---|
| Backend total | 464 tests, 0 failures (83 XML result files) | PASS |
| Production backend tests | 289 tests / 29 classes | PASS |
| P6 inventory boundary | `P6InventoryIntegrityIntegrationTest` + unit (conservation, rollback, low stock) | PASS (integration) |
| P8 multi-output/reversal | `ProductionEntryMultipleOutputIntegrationTest` (4 tests; JSON + projection only) | PASS at doc level; **GAP:** no DB-row CHECK assertion (feeds F1) |
| P9 disposition / P10 batch / P11 quality | unit tests | PASS |
| P12 return | `ProductionReturnServiceTest` (unit only) | **GAP (F13):** no Spring/DB receive integration test |
| P13 conversion | `ProductConversionServiceTest` (+23, unit only) | **GAP (F13):** no OUT/IN ledger-row integration test |
| Frontend | 34 tests, **0 production** | **GAP (F13):** 23 production pages/services uncovered |

## 29. End-to-End Scenarios

- **A (Full production path):** work_order → MR (allotment reservation) → consumption POST (OUT rows + balance) → entry POST (quality gate) → batch-card allocation → job-card COMPLETE → FG_RECEIPT. **Traced; PASS.**
- **B (WIP + disposition):** entry POST with remaining output → REJ/SC/PER disposition docs (recording-only) → WIP = max(input − (accepted+rejected+rework+scrap), 0) unchanged by disposition docs. **Traced; PASS.**
- **C (Cross-body return):** consumption OUT → production return PR → receive (RETURN_RECEIPT IN) → inventory restored; cap enforced. **Traced; PASS.**
- **D (Conversion):** CV POST OUT `{no}-OUT` + IN `{no}-IN` atomic, distinct keys. **Traced; PASS** (unit-level).
- **E (Failure/rollback):** low-stock consumption POST fails → no ledger/balance/reservation change (P6 integration); conversion POST failure → rollback (P13 unit). **Traced; PASS.**
- **F (Reversal):** entry reverse → PE-REV doc, subjob decrement, negated output rows. **Document level PASS; schema/inventory caveats F1/F3.**

## 30. Defect Register

| ID | Sev | Category | Finding | Evidence | Recommended safe fix | Approval |
|---|---|---|---|---|---|---|
| F1 | 🟠 HIGH | DATABASE / REVERSAL | V7 `CHECK (quantity > 0)` on `production_entry_output` violated by P8 reversal's negated rows; fails on Flyway-managed envs, masked in dev/test | `V7*.sql` ck constraint; `ProductionController` reverse `quantity().negate()` (~528–547); `ProductionEntryMultipleOutputIntegrationTest` never queries the row | V11: drop CHECK + signed/direction column (or positive adjustment rows); regression tests on reversal row + projection | FCN + P8 owner |
| F2 | 🟠 HIGH | MIGRATION / DATABASE | `prod_consumption`/`prod_consumption_line` not in any migration (Hibernate-only); staging/prod `validate` boot fails on fresh DB | grep `db/migration/*` = no table; `@Table` names; `application-staging.yaml` `validate` | V11: create tables mirroring Hibernate DDL; Flyway-enabled boot test | FCN |
| F3 | 🟠 HIGH | REVERSAL / INVENTORY | Entry reversal under COMPLETED job card does not reverse the job-card-complete FG_RECEIPT credit → inventory over-credited | `ProductionStockBoundary` FG receipt at complete; reverse block (~550–576) has no stock call | Compensating FG OUT on reversed entry (after §34 D-REV-01); integration test | FCN + D-REV-01 |
| F4 | 🟡 MEDIUM | NUMBERING | Runtime prefixes JCF/PLS/ITE diverge from config JC/PL/ID; reversal prefixes PE-REV/BC-RV/REJ-RV/SC-RV/PER-RV unregistered; only conversion uses config-aware engine | `DocNumberService.next(docType,prefix)` ignores config; `JobCardService:91,126` JCF; `ProductionController:797` PLS / `:897` ITE; V2 seed | Migrate job-card/log-sheet/idle-time + reversals to `nextNumberFromConfig`; register reversal prefixes in config | FCN + D-NUM-01 |
| F5 | 🟡 MEDIUM | WORKFLOW | WSM not uniformly enforced; `production-entry` map dead & inconsistent (no POST/REVERSE); log-sheet/idle-time no maps; entry/job-card/disposition/quality mutate inline | `grep validateTransition` callers; `WorkflowStateMachine` production-entry map; `ProductionController:387` inline switch | Consolidate lifecycle to WSM maps + `validateTransition`; update map to POST/REVERSE | FCN |
| F6 | 🟡 MEDIUM | CONCURRENCY / IDEMPOTENCY | StockService dedupe is check-then-insert; `posting_idempotency_key` not used by StockService; no unique index on `stock_ledger(doc_no, doc_type)` → race on concurrent duplicate postings | `StockService.recordStockIn/Out` `existsByDocNoAndDocType`; V1 `stock_ledger` DDL (PK only) | V11 partial unique index + predicate-safe insert; concurrent-duplicate test | FCN |
| F7 | 🟡 MEDIUM | MIGRATION | Flyway disabled in default/dev (`update`); dev/test and staging/prod schemas diverge; DB-level invariants untested in CI | `application.yaml` `flyway.enabled: false` + `ddl-auto: update`; staging/prod enable+validate | Enable Flyway in test profile or add migration-integrity boot test | FCN |
| F8 | 🔵 LOW | IDEMPOTENCY / CONCURRENCY | Optimistic-lock version handshake inconsistent (only return screen sends `version` on PUT) | `ProductionReturnScreen` PUT version; conversion/consumption/entry PUTs none | Centralize version in production API layer + PUTs | — |
| F9 | 🔵 LOW | ACCESS CONTROL / UX | `ProductionOrderScreen` gates with `can('planning', …)` vs `can('production', …)` rest of module | Frontend source | Confirm planning permission mapping per ADR-002; unify | — |
| F10 | 🔵 LOW | API / DOCUMENTATION | Phase-1 stub `/v1/production/entries-stub` still live and wired in frontend | `production/api/ProductionEntryController`; `productionEntryApi.ts` BASE | Gate by profile or remove; disconnect `useProductionEntry` | — |
| F11 | 🔵 LOW | NUMBERING / DOCUMENTATION | Two sources of truth for return prefix (config `PR` vs DocTypes `PRR` fallback) | V2 seed; `DocTypes` production-return PRR | Keep config as single source of truth | — |
| F12 | 🔵 LOW | API / UX | Batch-card endpoint `/v1/batch-cards` not under `/v1/production` (functional OK) | `ProductionBatchCardController`; `batchCardApi.ts` | Optional parity alignment | — |
| F13 | 🟡 MEDIUM | TEST COVERAGE | No frontend production tests; P12/P13 unit-only (no integration) | 34 frontend tests / 0 production; `ProductionReturnServiceTest`, `ProductConversionServiceTest` mock-only | Return receive + conversion OUT/IN ledger integration tests; frontend spot checks | FCN |
| F14 | 🔵 LOW | ARCHITECTURE / WORKFLOW | Entry lifecycle business logic embedded in `ProductionController` (subjob qty mutation ~420–446) | `ProductionController` source | Incrementally move to service + WSM | — |
| F15 | 🟡 MEDIUM (cross-module) | INVENTORY (Maintenance) | Maintenance `SpareRequestService` (~249) writes `stock_ledger` directly without `stock_balance` update | source scan | Outside Production scope; separate Maintenance fix | Owner: Maintenance |

## 31. Cross-Module Boundary Audit

- Production → Inventory: **SAFE_WITH_LIMITATION** (all movements through StockService; F3 reversal-compensation gap).
- Production → Costing: **SAFE** (no value/variance logic in Production per CLAR-008; conversion cost computation deferred).
- Production → Engineering: **SAFE** (BOM/routing referenced read-only from planning/engineering).
- Production → Planning: **SAFE_WITH_LIMITATION** (work_order canonical; frontend uses planning permissions — F9).
- Production → Quality: **SAFE_WITH_LIMITATION** (P11 recording-only; override one-time consumption).
- Production → Maintenance: **SAFE** (no production-owned writes); Maintenance → Inventory anomaly F15 noted (not a Production defect).

## 32. Production Readiness

**READY_WITH_LIMITATIONS.**

- No CRITICAL (🔴) findings. Core approved flows (P6–P13), WIP formula, inventory conservation discipline, numbering uniqueness, atomicity, and security posture all verified.
- Three HIGH (🟠) findings are deployment-model contradictions (Flyway schema vs Hibernate-derived dev/test schema, and reversal FG compensation). They do not affect the currently-running dev/test behavior but will surface at the next Flyway-managed staging/prod boot or the first entry reversal with co/by-product outputs.
- FCN approval required for F1, F2, F3, F4, F5, F6, F7, F13; two business decisions listed in §34.

## 33. Recommended Fix Order

1. **F2 → F1 → F6** (migration + database layer — highest deployment risk): V11 creating `prod_consumption`/`prod_consumption_line`, replacing the `production_entry_output` qty CHECK with a signed/direction-aware column, adding the partial unique index for `stock_ledger(doc_no, doc_type)`. Add a Flyway-enabled boot/integration test to prevent regression.
2. **F3** (reversal/inventory) — depends on §34 D-REV-01; implement compensating FG reversal with integration tests.
3. **F4** (numbering) — migrate JCF/PLS/ITE + reversal prefixes to the config-aware engine.
4. **F5** (workflow) — consolidate lifecycle to WSM; fix production-entry map (POST/REVERSE).
5. **F13** (test coverage) — add return/conversion integration tests; spot frontend tests.
6. **F7** (migration profile) — enable Flyway in test/dev or add migration-integrity test.
7. **F8–F12, F14** (LOW) — incremental; do not gate release.
8. **F15** (Maintenance, cross-module) — hand off to Maintenance module owner.

## 34. Business Decisions Required

1. **D-REV-01 (F3):** When a POSTED production entry that belongs to an already-COMPLETED job card is reversed, what is the intended inventory semantics?
   - Option A: post a compensating FG credit reversal (recommended; restores conservation).
   - Option B: leave inventory as-is and record the deviation on the reversal doc (simpler; keeps "job card complete = authoritative FG signal").
   - Option C: forbid reversal of entries under COMPLETED job cards (no inventory impact, reduces correction capability).
2. **D-NUM-01 (F4):** Confirm migration of job-card / log-sheet / idle-time / reversal prefixes to the config-aware `-{PLANT}-{FY}-{SEQ}` engine, accepting that historically issued numbers (JCF/PLS/ITE, PE-REV etc.) are grand-fathered and new numbers change format.

## 35. Audit Limitations

- Read-only audit of a single snapshot; concurrency claims (F6) reasoned from code + DDL, not from a live race reproduction (running it would require code/test changes, out of scope).
- Staging/prod runtime behavior (F1/F2) not executed here (profile inactive); verified by static analysis of migration DDL + profile config.
- Some frontend paths verified via targeted greps/source reads rather than running the UI.
- F15 is outside Production module scope; referenced for completeness only.

## 36. Git Safety

- `git status --short` → 284 working-tree entries (baseline). Only new addition: `ProductionFRS/DOCUMENT_64_P14_Production_Module_End_to_End_Integration_Audit.md`.
- `git diff --cached --stat` → staged 0.
- `git rev-parse HEAD` → `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged).
- Commit NO · Push NO · Stage NO · Reset NO · Clean NO · Stash NO · Rebase NO.

## 37. Final Verdict

Status: **READY_WITH_LIMITATIONS** (no 🔴; 3 🟠 HIGH latent deployment/reversal contradictions; 5 🟡; 5 🔵; 3 ⚪ incl. the client-side-reporting observations).

Resolved by this phase: audit complete; defect register, fix sequence, business decisions, and regression-test plan delivered in this document.

Follow-up required before the next implementation phase: §34 decisions (D-REV-01, D-NUM-01) and approval of the F1/F2/F6 migration batch (V11) and F3 compensation per the sequence in §33.

**End of DOCUMENT_64.**