# DOCUMENT_67 — P14-R3 REMAINING PRODUCTION INTEGRATION FINDINGS AUDIT

> **Chain:** DOCUMENT_64 (P14 audit) → DOCUMENT_65 (P14-R1 safe remediation: F1/F2/F6) → DOCUMENT_66 (P14-R2 decision gate: D-REV-01 `BUSINESS_DECISION_REQUIRED`) → DOCUMENT_67 (this P14-R3 READ-ONLY remaining-findings audit).
> **Mode:** READ-ONLY. Nothing implemented. Only this document is new.

## 1. Objective

Determine the exact remaining Production integration blockers after P14-R1 (V11/V12/V13 + Flyway integration test) and P14-R2 (D-REV-01 decision gate). Read-only: no application, migration, frontend, configuration, or data changes. F3 is reported only as an external dependency; D-REV-01/D-NUM-01 are never chosen here.

## 2. Baseline

- Git HEAD: `0781e1a30ca881614a7b573904caf6481adcbdc9`
- Review set: DOCUMENT_64, DOCUMENT_65, DOCUMENT_66, DOCUMENT_57, DECISION_REGISTER, CHANGELOG, plus live code under `zyger-erp-backend`.
- Working tree preserved untouched (291 status entries; staged 0; pre-existing 130-file diff intact).
- Live dataset (documented in DOCUMENT_33/40/64): exactly 1 production_entry (`PE/2026-27/00001`, CATEGORY_B, QUARANTINED, `process_qty = NULL`); zero reversal rows; no production-path FG_RECEIPT ledger rows reviewed.

## 3. F3 Dependency (external — not audited for decision)

- **Status (unchanged): `BUSINESS_DECISION_REQUIRED`.** D-REV-01 REMAINS OPEN (DOCUMENT_66 §§11–16; decision matrix A/B/C all NOT APPROVED).
- F3 entry reversal does not compensate the job-card-complete `FG_RECEIPT` credit (`ProductionController` reverse block, ProductionController.java:480–602 — zero stock calls; guard is entry-status only at :481–483). Reverse eligibility: entry `POSTED`/`COMPLETED`; no job-card-state or FG-receipt check.
- **Reported here as an external dependency only.** No compensation, prohibition, permission change, `FG_RECEIPT` change, stock-reversal, Job Card completion change, or `StockService` change was considered, sketched, or implemented in this phase.

## 4. F4 — Numbering / Configuration Inconsistency Audit

### 4.1 Where each prefix is defined

| Prefix | Doc type | Defined in | Runtime generator | Consumed sequence |
|---|---|---|---|---|
| `JCF` | job-card | hard-coded arg `ProductionJobCardService:91,126` | `numbers.next("job-card","JCF")` | `job-card/2026` (legacy `PREFIX-YEAR-0001`) |
| `JC` | job-card | `numbering_config` seed V2 (`'JC', 6-pad, FY+plant`) | config engine — UNUSED here | n/a (dormant) |
| `PLS` | production-log-sheet | hard-coded `ProductionController:797` | `numbers.next("production-log-sheet","PLS")` | `production-log-sheet/2026` |
| `PL` | production-log-sheet | V2 seed | UNUSED | n/a |
| `ITE` | idle-time-entry | hard-coded `ProductionController:897` | `numbers.next("idle-time-entry","ITE")` | `idle-time-entry/2026` |
| `ID` | idle-time-entry | V2 seed | UNUSED | n/a |
| `PE` / `PE-REV` | production-entry / reversal | hard-coded `ProductionController:171,488` (+ peek :158) | `numbers.next("production-entry","PE" / "PE-REV")` | `production-entry/2026` (same counter for PE and PE-REV) |
| `BC` / `BC-RV` | batch-card / reversal | hard-coded `ProductionBatchCardService:111,246` | `numbers.next("batch-card","BC" / "BC-RV")` (same counter) | `batch-card/2026` |
| `REJ` / `REJ-RV` | rejection document | hard-coded `ProductionDispositionService:116,306` | `numbers.next("rejection-document",…)` | `rejection-document/2026` |
| `SC` / `SC-RV` | scrap document | hard-coded `ProductionDispositionService:128,339` | `numbers.next("scrap-document",…)` | `scrap-document/2026` |
| `PER` / `PER-RV` | rework document | hard-coded `ProductionDispositionService:140,371` | `numbers.next("rework-document",…)` | `rework-document/2026` |
| `PR` | production-return | `numbering_config` V2 seed (`'PR'`) — honored | `numbers.next("production-return")` one-arg → `resolvePrefix` reads config → `PR-2026-0001` (legacy FORMAT) | `production-return/2026` |
| `PRR` | production-return fallback | `DocTypes.get("production-return")` (DocTypes.java:115) | fallback only (config is active) | — |
| `PM` | material-request | `DocTypes` (DocTypes.java:110) | `numbers.next("material-request")` → `PM-2026-0001` (no config row) | `material-request/2026` |
| `PC` | production-consumption | `DocTypes` (DocTypes.java:111) | `numbers.next("production-consumption")` → `PC-2026-0001` (no config row) | `production-consumption/2026` |
| `CV-{PLANT}-{FY}-{SEQ}` | product-conversion | `numbering_config` V2 seed (`'CV'`) — ONLY config-aware consumer | `ProductConversionService:50` `nextNumberFromConfig("product-conversion", plantId)` | `product-conversion/P{plant}/2026` |

### 4.2 Answers

- **Which prefixes are actually generated:** all of the above EXCEPT `JC`, `PL`, `ID` (config rows for those three are dormant; no Production code reads them yet). `PR`/`CV` config prefixes ARE honored (return via `resolvePrefix`; conversion via the config engine).
- **Hard-coded prefix list:** `JCF`, `PLS`, `ITE`, `PE`(+`PE-REV`), `BC`(+`BC-RV`), `REJ`/`SC`/`PER`(+`-RV`) — all passed as literal two-arg prefixes.
- **DocNumberService vs configuration agreement:** partial. Two-arg `next(docType, prefix)` (DocNumberService.java:60) uses the passed prefix and IGNORES `numbering_config`. One-arg `next(docType)` resolves the prefix from active config first, then `DocTypes`, then a sales hard-code fallback (:36–57), but still emits the LEGACY `PREFIX-YEAR-0001` format — config FORMAT (plant/FY segments, padding) is only used by `nextNumberFromConfig` (:120).
- **Production screens/APIs dependence:** `nextEntryNumber()` (ProductionController.java:158) peeks `PE`; frontend screens render these on form load. Changing numbering changes displayed next-numbers (a UX-visible change).
- **Historical document identity:** doc number strings are used as cross-table references (job_card_number, entry_number, return_number, conversion_number, doc numbers). Changing the format changes the identity string of NEW documents only; historical documents keep their legacy numbers (grand-fathered — DOCUMENT_64 §337 D-NUM-01; BR-NUM-001 never-reuse is preserved). Surrogate DB ids are unaffected.
- **Is D-NUM-01 still open:** **YES.** D-NUM-01 appears nowhere in DECISION_REGISTER/CHANGELOG/DOCUMENT_57 as a decision; DOCUMENT_64 §34 item 2 defines it (adopt config-aware engine, grand-father history, register reversal prefixes). DOCUMENT_66 re-confirmed the numbering divergence was left untouched. Status: `BUSINESS_DECISION_REQUIRED` (open).
- **Exact migration requirements IF D-NUM-01 is later approved (analysis only, NOT implemented):**
  1. Code adoption: switch job-card, log-sheet, idle-time, entry(+reversal), batch-card(+rev), disposition docs(+rev), MR, consumption to `nextNumberFromConfig(docType, plantId)`.
  2. Optional additive seed migration: insert `numbering_config` rows for `batch-card`, `rejection-document`, `scrap-document`, `rework-document`, `material-request`, `production-consumption`, and the reversal prefixes (new rows only — `ON CONFLICT (doc_type) DO NOTHING` pattern of V2; no DDL, no re-numbering).
  3. Sequence continuity: config engine creates new `doc_sequence` keys (`docType/P{plant}/year`) — counters restart at 000001 after adoption; a continuity migration (advancing `next` to the current legacy counter) should be considered so new-format numbers do not visually restart at `-000001`.
  4. No changes to existing rows anywhere; BR-NUM-001 unaffected; reversible via feature toggle (config rows cannot be "unapplied", so this is a one-way, approval-gated change).

## 5. F5 — WorkflowStateMachine Inconsistency Audit

`WorkflowStateMachine.java` (135 lines) registers 11 doc types. **Only 6 `validateTransition` call sites exist in all of main code:** `batch-card` (ProductionBatchCardService:200), `product-conversion` (:107), `production-return` (:120), `production-consumption` (:112), `material-request` (:134); plus read-only `getAllowedActions` exposure in MasterDataController:469. That is the complete enforcement set.

| # | Finding | Evidence | Classification |
|---|---|---|---|
| W1 | `production-entry` map is **dead AND inconsistent** — registers `DRAFT→{SUBMIT,CANCEL}`, `SUBMITTED→{APPROVE,REJECT}`, `APPROVED→{}`; real lifecycle uses `submitted`, `post→POSTED` (:448), `reverse→REVERSED` (:578), `reject→REJECTED`, `cancel→CANCELLED`, `quality-pass/fail/hold` (:605–607). No caller uses it. Entry lifecycle is fully inline in `ProductionController` (submit/post/reverse/reject/cancel/quality switch). | WSM.java:48–52; ProductionController.java:388–448, 480–607 | **ARCHITECTURE ISSUE** (governance dead code + inconsistent contract; no runtime failure) |
| W2 | `job-card`, `subjob`, `work-order` registrations exist but **are never enforced** (no `validateTransition` callers). Transitions are direct inline mutation: `ProductionJobCardService` (release/start/hold/complete, setStatus list), `PlanningService` (work-order complete → COMPLETED), subjob adjustments inside reversal (§P8). | WSM.java:16–46; call-site scan | **ARCHITECTURE ISSUE** (approved engine FRS §6.3/§7.2/§7.3 not enforced; false sense of governance) |
| W3 | **Missing registrations**: `production-log-sheet`, `idle-time-entry`, `rejection-document`, `scrap-document`, `rework-document`, `quality gate` produce inline mutations with no WSM map (`validateTransition` silently no-ops for unknown types → inconsistent enforcement). | call-site scan; ProductionDispositionService (REJ/SC/PER); ProductionQualityGateService | **ARCHITECTURE ISSUE** (governance gap; runtime safe) |
| W4 | **Key mismatch/documentation**: ECR registered as `ecr` while numbering key is `engineering-change` (PlanningMasterController:530); `dispatch-plan`, `ecr` registrations unused by any enforcer. Planning-owned, production-adjacent. | WSM.java:54–60, 76–82 | **DOCUMENTATION ONLY** |
| W5 | **Consistent enforced registrations**: `material-request`, `production-consumption`, `production-return`, `product-conversion`, `batch-card` states match their services and are enforced (HTTP-409-style guard semantics). | call-site scan; service sources | **NO ISSUE** (5 doc types correctly governed) |
| W6 | Reversal/quality actions (`reverse`→REVERSED, `quality-pass/fail/hold`) exist only in the controller inline switch; `production-entry` map has neither the terminal `REVERSED` state nor QC sub-states → any future `validateTransition` integration would reject the real lifecycle. | ProductionController.java:388–607 | **ARCHITECTURE ISSUE** (integration blocker for WSM adoption) |

**Net:** 5 finding rows (W1, W2, W3, W6 ARCHITECTURE ISSUE; W4 DOCUMENTATION ONLY; W5 NO ISSUE). No `SAFE BUG` runtime fault arises (validateTransition is call-on-demand and never invoked on these paths). No production document reached a broken state because the six enforced docs are the P6/P10/P12/P13 flows which match their maps. DOCUMENT_64 F5 (MEDIUM) remains open; P14-R1/R2 did not touch it.

## 6. LOW-Severity Findings Audit (DOCUMENT_64 F8–F14; DOCUMENT_65 confirmed NOT IMPLEMENTED)

Documented LOW rows: F8, F9, F10, F11, F12, F14 (DOCUMENT_64 §30 table; header claim "5 LOW + 3 ⚪ DOCUMENTATION" is itself a minor counting inconsistency — 6 rows carry the 🔵 LOW tag; the 3 ⚪ documentation/UX items are only referenced ("incl. client-side-reporting observations", line 355) and are not enumerated). Field map per finding: current status / still reproducible / remediated / production-inventory-quality-data-security-concurrency impact / required decision? / safe implementation / priority / dependency.

| ID | Finding | Current status | Repro? | Remediated? | Impact (P/I/Q/D/S/C) | Decision? | Safe impl? | Prio | Dependency |
|---|---|---|---|---|---|---|---|---|---|
| F8 | Optimistic-lock version handshake inconsistent (only `ProductionReturnScreen` sends `version` on PUT; conversion/consumption/entry PUTs do not) | OPEN | YES (frontend sources) | NO | D: stale-overwrite risk (UI); C: concurrent editor overwrite | No | YES (add `version` to PUTs; additive) | LOW | Frontend API layer |
| F9 | `ProductionOrderScreen` gates with `can('planning',…)` vs `can('production',…)` rest of module | OPEN | YES | NO | D/none; UX/RBAC inconsistency | No | YES (align per ADR-002) | LOW | Frontend |
| F10 | `/v1/production/entries-stub` still live and wired (`production/api/ProductionEntryController` + `productionEntryApi.ts`) | OPEN — verified live this phase both sides | YES | NO | D:none; isolated (no StockService/legacy writes) | No | YES (gate by profile or disconnect `useProductionEntry`) | LOW | Backend + frontend |
| F11 | Two sources of truth for return prefix: config `PR` vs DocTypes `PRR` fallback | OPEN — verified (DocTypes.java:115 PRR; V2 seed PR active) | YES | NO | N; numbering/doc consistency | No | YES (single source = config) | LOW | D-NUM-01 alignment |
| F12 | Batch-card endpoint `/v1/batch-cards` not under `/v1/production` | OPEN | YES | NO | UX/API parity only | No | YES (optional parity) | LOW | — |
| F14 | Entry lifecycle logic embedded in `ProductionController` (subjob qty mutation, `numbers.next`, status transitions) | OPEN — verified (create :171, submit :388, post :448, reverse :480–602) | YES | NO | P/I/Q/D: correctness exposure; maintenance risk | No | YES (incremental move to service + WSM) | LOW | W5–W6 (F5 remediation sequence) |
| F13 (MEDIUM, listed as coverage) | P12/P13 unit-only, no ledger integration tests; 0 frontend production tests | OPEN — verified (5 frontend test files total, 0 production-related; return/conversion unit-only) | YES | NO | P/I: latent regression; Q: none; D: none | No | YES (add integration tests; additive) | MED | — |
| F15 (MEDIUM, cross-module) | Maintenance `SpareRequestService:249` writes `stock_ledger` directly without `stock_balance` update; `SparePartStockService:53,90` same pattern | OPEN (external owner: Maintenance) | YES | NO | I/D: maintenance stock movement; P: none | No (Maintenance-owned) | External fix | MED (external) | Maintenance release |

Verdict: all LOW items are safe-to-implement, decision-free, low-priority incremental items; none blocks Production capability; none was touched this phase.

## 7. Inventory Boundary Audit (Production physical movement)

Verified source paths (read-only):

| Movement | Path | Conformance |
|---|---|---|
| Job-card complete FG receipt | `ProductionJobCardService` complete (`:363–368`) → `ProductionStockBoundary.recordJobCardCompleteGood` (:42–47) → `StockService.recordStockIn` | ✅ Boundary (approved) |
| Product conversion in/out | `ProductConversionService` → `InventoryIntegrationService.consumeConversionInput` / `receiveConversionOutput` (:66–87) → `StockService` | ✅ Wrapper |
| Production return receive | `ProductionReturnService` → `InventoryIntegrationService.receiveProductionReturn` (stock-status guard FREE/QC_HOLD per D-C1) → `StockService` | ✅ Wrapper |
| Consumption POST | `ProductionConsumptionService:168` → `StockService.recordStockOut` directly | ✅ StockService (DOC 18 P1 deferred call-sites to wrapper; consistent with the boundary contract that all movement flows through StockService) |
| Material request | reservation only (`Effect.NONE` via DocumentFacade stock-allotment; no physical movement on release) | ✅ No write |
| Disposition (rejection/scrap/rework) | orchestration/NCR links; no `stock_ledger`/`stock_balance` write | ✅ No write |
| Backfill / dry-run | `ProductionBackfillDryRunService` reads `COUNT(*)` only (:524–527); backfill flags inert | ✅ Read-only |

**Direct-write scan (any module writing ledger/balance outside StockService):**
- `StockService` ledger.save :165,:201,:234,:266,:320 — the engine (authorized).
- `SparePartStockService:53,:90` and `SpareRequestService:249` — **MAINTENANCE module writes `stock_ledger` directly** (F15, external; NOT production; reported not repaired).
- `PlanningMasterController` uses `stockBalances.sumAvailableByItem` (read-only :169,:281) — ✅.
- **No Production code writes `stock_ledger` / `stock_balance` directly.** All Production physical movements flow through `StockService` (optionally via `ProductionStockBoundary`/`InventoryIntegrationService` facades). ✅ conformance.
- `StockService.verifyStockAvailability` **not modified** (constraint honored).

## 8. Numbering Audit (P8/P9/P10/P12/P13)

| Doc type | Prefix (generated) | Generator | Config source | Idempotency identity | Historical compatibility | Duplicate risk |
|---|---|---|---|---|---|---|
| Production Entry (+ PE-REV) | PE (record :171; reversal PE-REV :488) | `next("production-entry","PE"/"PE-REV")` | config `PE` seeded but format ignored; share seq `production-entry/2026` | `doc_sequence.key = production-entry/2026` | legacy format; changing shape alters NEW only | none today; reversal shares the entry counter (no collision) |
| Disposition — rejection | REJ (REJ-RV) | `next("rejection-document","REJ")` | none/DocTypes absent | `rejection-document/2026` | legacy | none (distinct keys) |
| Disposition — scrap | SC (SC-RV) | `next("scrap-document","SC")` | none/DocTypes absent | `scrap-document/2026` | legacy | none |
| Disposition — rework | PER (PER-RV) | `next("rework-document","PER")` | none/DocTypes absent | `rework-document/2026` | legacy | none |
| Batch Card (BC) | BC (BC-RV) | `next("batch-card","BC"/"BC-RV")` | DocTypes BC; config row absent | `batch-card/2026` | legacy | none (rev shares counter) |
| Production Return | PR | `next("production-return")` (config prefix) | config PR (honored); DocTypes PRR fallback unused | `production-return/2026` | legacy format | none; F11 two-source note |
| Product Conversion | CV-{PLANT}-{FY}-{SEQ} | `nextNumberFromConfig` | config CV (P7 approval; supersedes legacy PC) | `doc_sequence.key = product-conversion/P{plant}/2026` | approved change was already made; history grand-fathered | none; per-plant per-FY isolated |
| Material Request | PM | `next("material-request")` (DocTypes PM) | DocTypes fallback; FRS P6 `MR`-style deviated (documented) | `material-request/2026` | legacy | none |
| Production Consumption | PC | `next("production-consumption")` (DocTypes PC) | DocTypes fallback | `production-consumption/2026` | legacy; historical prefix overlap `PC` vs conversion's old `PC` (conversion now CV — resolved) | none |

Consistent with approved decisions: P8/P9/P10/P12/P13 run on BR-NUM-001 never-reuse via `doc_sequence`; only conversion adopts the config/plant/FY engine (CLAR-008 + CV per DOCUMENT_57 §4 #15). No normalization performed (constraint honored).

## 9. Migration Audit

| Version | Title | Phase / resolution |
|---|---|---|
| V1 | `baseline.sql` (PostgreSQL dump) | P1 Foundation |
| V2 | numbering_config production seed (JC/PE/CV/PR/PL/ID) | P1 ADR-PROD-004 |
| V3 | work_order/PO discriminator | P2 canonical Production Order/Job Card |
| V4 | prod_normalized_events | P3 additive projection (approved subset) |
| V5 | prod_backfill_infrastructure | P3 RC-2 |
| V6 | prod_operation_execution_event | P3 (isolated table) |
| V7 | production_entry_outputs | P8 Multiple Output |
| V8 | production_disposition_documents | P9 Rejection/Scrap/Rework |
| V9 | batch_card | P10 Batch Card |
| V10 | production_quality_gate | P11 Quality Gate |
| V11 | production_consumption_and_material_request_tables | P14-R1 / F2 |
| V12 | production_entry_output_reversal_check (CHECK qty <> 0) | P14-R1 / F1 |
| V13 | stock_ledger_doc_identity_unique | P14-R1 / F6 |

- **Continuity:** V1→V13 sequential, version-unique in the working tree (13 files, no duplicates).
- **P6/P8/P9/P10/P11/P12/P13/P14-R1 migrations present:** P6 tables (V11), P8 (V7+V12), P9 (V8), P10 (V9), P11 (V10), P12 (baseline tables; numbering via V2), P13 (tables in baseline; CV numbering via V2), P14-R1 (V11/V12/V13). ✅
- **Clean-database viability:** verified by `ProductionSchemaFlywayIntegrationTest` (PostgreSQL 16-alpine Testcontainer, full V1→V13 apply; 3/3 PASS in P14-R1; not re-run this phase).
- **Flyway validation implications:** staging/prod run `flyway.enabled=true` + `ddl-auto: validate` + `baseline-on-start: true`/`baseline-version: 0` (DOCUMENT_65 §3). Default/dev remains `flyway.enabled=false` + `ddl-auto: update` (F7 nuance — dev/test schema structurally diverge; mitigated for CI by the Flyway-enabled integration test).
- **Historical V11/V12/V13 working-tree conflict:** **STILL PRESENT.** Git HEAD still tracks historical `V11__customer_fields.sql`, `V12__sample_customers.sql`, `V13__add_item_type_to_item_group.sql` (deleted in the working tree, pre-existing diff). Per the mandate: NOT restored, NOT deleted, NOT renamed; neither set may be mixed (duplicate-version rejection). Reported, not resolved.

## 10. Test Coverage Audit

Last verified suite state (P14-R1 full run): **467 tests / 84 classes — 0 failures, 0 errors; `./gradlew build` SUCCESS.** Not re-run in this read-only phase.

| Capability | Unit | Integration (Spring/TC) | Migration | Concurrency/Idempotency | Negative | Current state | Missing critical coverage |
|---|---|---|---|---|---|---|---|
| Production Entry | ProductionEntryValidationServiceTest 22 | ProductionEntryMultipleOutputIntegrationTest 4 | — | — | validation negatives | ✅ PASS | controller-level reverse E2E (see Reversal) |
| Multiple Output | (covered by multi-output IT) | 4 | — | — | — | ✅ PASS | none |
| Rejection | ProductionDispositionServiceTest 17 | ProductionDispositionIntegrationTest 7 | — | — | yes | ✅ PASS | disposition-flow WSM negative |
| Scrap | (disposition) | 7 | — | — | — | ✅ PASS | none |
| Rework | (disposition) | 7 | — | — | — | ✅ PASS | none |
| Batch Card | ProductionBatchCardServiceTest 27 | ProductionBatchCardIntegrationTest 6 | V9 | WSM enforced | yes | ✅ PASS | none |
| Quality Gate | ProductionQualityGateServiceTest 23 | ProductionQualityGateIntegrationTest 5 | V10 | — | yes | ✅ PASS | WSM gate-action negative (inline) |
| Production Return | ProductionReturnServiceTest 14 | **none (F13)** | — | — | yes | ✅ PASS (unit only) | receive→stock ledger IT; rejected-receive→no stock IT |
| Product Conversion | ProductConversionServiceTest 23 | **none (F13)** | — | — | yes | ✅ PASS (unit only) | OUT/IN ledger integration test |
| Material Request | ProductionMaterialRequestServiceTest 21 | P6InventoryIntegrityIntegrationTest 5 | V11 | — | yes | ✅ PASS | none |
| Consumption | ProductionConsumptionServiceTest 10 | P6InventoryIntegrityIntegrationTest 5 | V11 | — | yes | ✅ PASS | none |
| Reversal | — (schema-level) | ProductionSchemaFlywayIntegrationTest 3 (validates negated row persists, zero-qty rejected, repeated reversal alternates sign, V13/dedupe) | V12/V13 | dup-insert rejection test | zero-qty negative | ✅ PASS (schema-level) | NO controller-level reversal E2E with co/by-product outputs on Flyway schema; FG-receipt+reversal E2E (blocked by D-REV-01) |
| Numbering | DocNumberServiceTest 6; DocNumberServiceProductionSeedTest 2 (@ParameterizedTest) | — | V2 | lock-based | — | ✅ PASS | config-engine E2E for all production doc types (D-NUM-01) |
| Workflow | WorkflowStateMachineTest 6 | — | — | — | illegal-transition negatives | ✅ PASS (unit) | integration enforcement test for the 6 enforced docs only; none for unenforced |
| Inventory integration | StockServiceTest 4; InventoryIntegrationServiceTest 5 | P6InventoryIntegrityIntegrationTest 5; ProductionResolverProgressIntegrationTest | V13 | V13 dup-reject | — | ✅ PASS | endpoint-level stock movement for consumption/return/conversion |

## 11. Cross-Module Dependencies

| Module | Classification | Basis |
|---|---|---|
| Inventory | **READY_WITH_LIMITATION** | StockService + ProductionStockBoundary + InventoryIntegrationService all in place; V13 unique index; `verifyStockAvailability` untouched. Limitation: F15 maintenance direct ledger writes (external), F3 FG-reversal compensation pending decision |
| Quality | **READY_WITH_LIMITATION** | Quality gate (V10), IPQC creation at job-card complete, QC statuses integrated. Limitation: QC gate/entry states mutated inline (F5 W1/W6) |
| Maintenance | **READY** (for Production) | No runtime Production dependency; F15 is a Maintenance-owned defect (external) |
| Planning | **READY** | P7-approved work order → job card flow; PlanningService inline statuses (F5 W2 note); no Production blocker |
| Purchase | **READY** | Production uses shared StockService for OUT; no direct Purchase coupling in production flows |
| Sales | **READY** (no production coupling) | FG consumption downstream of sales DC is a shared-Inventory consumer, not a Production integration point |
| Costing | **READY_WITH_LIMITATION** | Conversion costing approved (CLAR-008 + CV); CostRollupService present; E2E costing not exercised in this audit |
| Engineering/BOM | **READY** | BOM/route references in baseline (V1), DOC 18 foundation phase |
| Route Sheet | **READY** | Subjob/route-op links confirmed in P14 audit |
| Cross-module E2E | **FUTURE_ROADMAP** | No full E2E execution across Inventory/Quality/Maintenance/Planning/Costing in this phase |

## 12. Production Completion Matrix

| Capability | Status | Blocking reason | Next action |
| --- | --- | --- | --- |
| P6 Material Request / Consumption | ✅ READY | none (V11 tables + WSM enforced + tests) | none required |
| P8 Multiple Output | ✅ READY | none (V12 allows signed rows) | none required |
| P9 Rejection / Scrap / Rework | ✅ READY_WITH_LIMITATION | F5 WG3 (no WSM maps); unit-only reversal of dispositions | optional WSM + IT hardening |
| P10 Batch Card | ✅ READY | none | none required |
| P11 Quality Gate | ✅ READY_WITH_LIMITATION | F5 W1/W6 (inline gate states) | optional WSM hardening |
| P12 Production Return | ✅ READY_WITH_LIMITATION | F13 (no ledger IT); F8 version; F11 prefix | add ITs (decision-free) |
| P13 Product Conversion | ✅ READY_WITH_LIMITATION | F13 (no OUT/IN IT) | add ITs (decision-free) |
| F3 Entry Reversal | 🔴 BLOCKED_BY_BUSINESS_DECISION | D-REV-01 open (DOCUMENT_66) | obtain business decision A/B/C, then implement |
| F4 Numbering | 🔴 BLOCKED_BY_BUSINESS_DECISION | D-NUM-01 open (§4.2) | obtain business decision, then migrate to config engine |
| F5 Workflow | ⏸ PENDING (architecture remediation; not a runtime blocker) | not authorized; dead/inconsistent registrations (§5) | subsequent hardening authorization |
| Remaining LOW findings | 🟢 OPEN (safe incremental) | none | F8–F12, F14 incremental fixes (decision-free) |

<!-- APPEND-2 -->

## 13. Risk Ranking

| Rank | Item | Type | Why |
|---|---|---|---|
| 1 | F3 — D-REV-01 (FG-receipt compensation on reversal) | BLOCKING (business decision) | Only open HIGH; latent inventory asymmetry on Flyway-managed deployments; decision required |
| 2 | F4 — D-NUM-01 (numbering config adoption) | BLOCKING (business decision) | JCF/PLS/ITE vs JC/PL/ID divergence; reversal prefixes unregistered; format change is one-way |
| 3 | F5 — WorkflowStateMachine governance (W1/W2/W3/W6) | MEDIUM (architecture) | dead/inconsistent registrations + inline mutation; no runtime fault today, but any WSM enforcement change will break the real lifecycle as currently mapped |
| 4 | F13 — test coverage gaps (return/conversion ledger IT; frontend production tests) | LOW | risk of regression in stock movements |
| 5 | LOW findings F8–F12, F14 | LOW | safe incremental, no decision |
| 6 | F15 — Maintenance direct `stock_ledger` writes | MEDIUM (external) | outside Production; Maintenance-owned |
| 7 | Migration-set collision (historical HEAD V11/V12/V13 vs working-tree V11/V12/V13) | OPS (deployment risk) | must not mix sets; do not restore/delete (mandate) |

## 14. Business Decisions Required

| Decision | Scope | Current record | Status |
|---|---|---|---|
| **D-REV-01** | FG inventory treatment on entry reversal under COMPLETED job cards (A compensate / B leave / C forbid) | DOCUMENT_64 §34 options; no approval anywhere (checked DOCUMENT_66 §5) | `BUSINESS_DECISION_REQUIRED` — OPEN |
| **D-NUM-01** | Adopt config-aware `-{PLANT}-{FY}-{SEQ}` engine for job-card/log-sheet/idle-time/reversals etc.; grand-father history; register reversal prefixes (§4.2) | DOCUMENT_64 §34 item 2; no approval anywhere | `BUSINESS_DECISION_REQUIRED` — OPEN |

No conflicting approval records exist for either decision.

## 15. Recommended Next Phase (dependency-ordered; NOT executed)

**Recommended: D — Low-risk Production hardening** (F5 workflow-registration remediation + decision-free LOW findings F8–F12/F14 + F13 coverage additions), because it is the only option with **no prerequisite business decision** and no deployment-model change.

Dependency order and prerequisites:
1. **D (hardening)** — no prerequisites; safe to sequence now. Must NOT alter numbering or reversal semantics; WSM updates must make maps match the real (intended) lifecycle, not the other way round.
2. **A (D-REV-01 decision + F3)** — PREREQUISITE: business approval of A/B/C. Best sequenced after D so the reversal path and WSM are coherent first.
3. **B (D-NUM-01 decision + numbering)** — PREREQUISITE: business approval; one-way format change. Best sequenced after A (both touch reversal doc numbering).
4. **E (Production→Inventory integration audit)** — PREREQUISITE: A (F3 blocks stock-level E2E reconciliation of reversal) plus D.
5. **F (Production→Quality), G (Maintenance)** — PREREQUISITE: D (workflow coherence) + A for any reversal-involved quality paths.
6. **H (Planning integration), I (Cross-module E2E)** — AFTER A, B, E, F resolve.
Do not execute any of the above now.

## 16. Explicit Exclusions

Not performed, by mandate: F3 implementation; D-REV-01 choice; D-NUM-01 choice; any WorkflowStateMachine change; any numbering/normalization change; any migration create/restore/rename/delete (incl. historical V11/V12/V13 conflict); any `StockService.verifyStockAvailability` change; any stock-reversal / FG_RECEIPT / Job Card completion / reversal-permission change; any frontend change; any test creation; any database or data alteration (incl. dedupe deletion / historical repair); any other-module implementation; any git commit/push/stage/reset/clean/stash; no claim of Production or ERP completion.

## 17. Git Verification

Snapshot (pre/post identical):

```text
git rev-parse HEAD                      → 0781e1a30ca881614a7b573904caf6481adcbdc9 (unchanged)
git status --short                      → 292 entries (291 pre-existing + DOCUMENT_67 untracked)
git diff --stat                         → 130 files changed, 1575 insertions(+), 6549 deletions(-) (pre-existing only)
git diff --cached --stat                → 0 (nothing staged)
```

Only new file: `ProductionFRS/DOCUMENT_67_P14_R3_Remaining_Integration_Findings_Audit.md` (untracked).

## 18. Final Verdict

```
AUDIT_COMPLETE — F3 BUSINESS DECISION STILL REQUIRED
```

Supporting findings: D-REV-01 remains open and required (unchanged from P14-R2; DOCUMENT_66). D-NUM-01 is the second open business decision (already documented in DOCUMENT_64 — not a new blocker). No NEW blocker introduced by this audit; the only live integration blockers are the two business-decision gates plus the (non-blocking, unelected) workflow-governance remediation. Production remains **READY_WITH_LIMITATIONS** — do not claim completion.

**STOP.** No F3/F4/F5 implementation. No P15 start. Await the next explicit authorization.

---
**END OF DOCUMENT 67**