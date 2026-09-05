# DOCUMENT_20 — P1: Database & Entity Foundation Report

| | |
|---|---|
| **Module** | Production |
| **Phase** | P1 — Database & Entity Foundation |
| **Report Date** | 2026-09-03 |
| **Author** | opencode (P1 executor) |
| **Predecessor** | DOCUMENT_19 (P0 report — APPROVED) |
| **Scope Source** | DOCUMENT_18 §126–147 |
| **Gate** | **P1 APPROVAL GATE** — awaits explicit user approval to proceed to P2 |

---

## 1. P1 GATE RESULT

**P1 GATE RESULT: PASS**

All eight pre-implementation verification gates were satisfied, the additive change set was built without modifying off-limits production logic, and every validation check passed. See DOCUMENT_19 (GATE 1–7) and GATE 8 below.

---

## 2. Scope Completion

The following P1 deliverables from DOCUMENT_18 §126–147 were completed.

### 2.1 Numbering configuration seed (V2 migration)
- **Deliverable:** `V2__numbering_config_production_seed.sql`
- **Status:** COMPLETE
- **Detail:** Idempotent, rows-only DML seeding six Production doc-types into `numbering_config` with FRS-canonical prefixes (DOC 07 §21.2). DORMANT in P1 (no Production code reads config yet, so no runtime behavior change).

| doc_type (key) | canonical prefix | legacy prefix |
|---|---|---|
| `job-card` | JC | JCF |
| `production-entry` | PE | PE / PE-REV |
| `product-conversion` | CV | PC |
| `production-return` | PR | PR |
| `production-log-sheet` | PL | PLS |
| `idle-time-entry` | ID | ITE |

- Keys match existing `ProductionController` / `DocNumberService` usage — invented keys were NOT introduced (Gate 3 mapping).

### 2.2 BamStockService integration wrapper
- **Deliverable:** `InventoryIntegrationService.java`
- **Status:** COMPLETE
- **Detail:** Additive, `@Service @Transactional` thin wrapper delegating to the controlled `StockService` inventory engine (ADR-PROD-005 named). Supplied semantic methods: `receiveFinishedGood`, `consumeConversionInput`, `receiveConversionOutput`, `receiveProductionReturn`; generic passthroughs `stockIn`, `stockOut`, `stockAdjustment`; constants for Production document-types (`PROD_JOB_CARD_COMPLETE`, `PROD_PRODUCT_CONVERSION`, `PROD_PRODUCTION_RETURN`), transaction types (`TX_FG_RECEIPT`, `TX_CONVERSION_OUT`, `TX_CONVERSION_IN`, `TX_RETURN_RECEIPT`), and stock status (`STOCK_FREE`).

### 2.3 Production FE foundation
- **Deliverable:** `types/production/production.types.ts`, `services/production-api.ts`, `hooks/useProduction.ts`
- **Status:** COMPLETE
- **Detail:** Typed API layer + TanStack Query hooks mirroring existing `inward` conventions. ADDITIVE — no screens are rewired to consume this in P1 (screen migration is P5+). No existing screens, registry, or components were modified.

### 2.4 WorkflowStateMachine extension
- **Deliverable:** (deferred)
- **Status:** DEFERRED to P2/P4 handoff — per explicit user decision (GATE 5 / GATE 8). Rationale: `ProductionController` never calls the state machine (0 call sites); existing Production doc-types are already registered; machine bypasses unknown doc-types; DOC 11 canonical vocabulary does not match code's simplified vocabulary. Adding would be inert and risk a prohibited second status vocabulary. **No change made.**

---

## 3. Files Created / Modified

### 3.1 Created (this P1 session)
| File | Layer | Purpose |
|---|---|---|
| `zyger-erp-backend/src/main/resources/db/migration/V2__numbering_config_production_seed.sql` | BE | P1 numbering seed (6 doc-types, idempotent) |
| `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/InventoryIntegrationService.java` | BE | Additive StockService wrapper (ADR-PROD-005) |
| `zyger-erp-backend/src/test/java/in/zygertechnology/zygererp/service/InventoryIntegrationServiceTest.java` | BE | Delegation test for the wrapper |
| `zyger-erp-backend/src/test/java/in/zygertechnology/zygererp/service/DocNumberServiceProductionSeedTest.java` | BE | Numbering continuity test (TC-19 analog) |
| `zyger-erp-frontend/src/types/production/production.types.ts` | FE | Typed production document contracts |
| `zyger-erp-frontend/src/services/production-api.ts` | FE | Centralized endpoint layer |
| `zyger-erp-frontend/src/hooks/useProduction.ts` | FE | TanStack Query hooks |

### 3.2 Modified (this P1 session)
- **None.** No existing production logic, controllers, entities, registry, or screens were modified.

> Note: pre-existing `git status` modifications (e.g. `ProductionEntryScreen.tsx`, `application.yaml`, deleted legacy migrations, consolidated `V1__baseline.sql`) are from earlier phases and were NOT introduced by P1.

---

## 4. Database Changes

### 4.1 New migration
- **`V2__numbering_config_production_seed.sql`** — rows-only DML into `numbering_config`; no DDL, no drops, no column changes, no data deletion.
- **Misc:** idempotent via `ON CONFLICT (doc_type) DO NOTHING`; safe for re-run and for forward compatibility.

### 4.2 Safe-validation of migration (GATE 4)
- Disposable `postgres:16-alpine` container + `flyway/flyway:10` image.
- Sequence validated: `V1__baseline.sql` → `V2__numbering_config_production_seed.sql` applied cleanly; exactly 6 rows seeded; re-run reports "up-to-date" (idempotent confirmed).
- Disposable container removed — no persistence.

### 4.3 No destructive SQL
- No `DROP`, `ALTER ... DROP COLUMN`, `DELETE`, `TRUNCATE`, or row mutations of existing domain tables. Additive only.

---

## 5. Architecture Compliance (ADR-PROD-001..005)

| ADR | Requirement | P1 Compliance | Evidence |
|---|---|---|---|
| ADR-PROD-001 | Domain/namespace + additive structure | PASS | `InventoryIntegrationService` in `service.*`; FE `types/production/`, `services/production-api.ts`, `hooks/useProduction.ts` |
| ADR-PROD-002 | Canonical Production Order = `work_order`; no independent `prod_order` | PASS | P1 introduces no order entity or schema; FE type `ProductionOrder` is *view-only* named per canonical term (TERM-PROD-001) with no backend entity |
| ADR-PROD-003 | Reuse `DocNumberService` / `doc_sequence` / `numbering_config` | PASS | Seed writes `numbering_config`; numbering continuity test exercises `nextNumberFromConfig` |
| ADR-PROD-004 | Forward-compatible, idempotency-safe migration sequencing (V2+) | PASS | `V2__` versioned after consolidated `V1__baseline.sql`; `ON CONFLICT DO NOTHING`; validated on fresh container |
| ADR-PROD-005 | Inventory protection: never direct `stock_balance`/`StockBalance` writes; route via `StockService`/`stock_ledger`/idempotency key | PASS | `InventoryIntegrationService` depends ONLY on `StockService`; static scan confirms NO `StockBalanceRepository`/`stock_balance` usage; all enrollment via `recordStockIn/Out/Adjustment` |

---

## 6. Reuse Verification

| Reused component | How used in P1 | Evidence |
|---|---|---|
| `StockService` / `StockService.recordStockIn/Out/Adjustment` | Sole inventory path through `InventoryIntegrationService` | code; test mocks `StockService` |
| `DocNumberService.nextNumberFromConfig` | Exercise path for seeded configs | `DocNumberServiceProductionSeedTest` |
| `numbering_config` table | Seeding target | `V2` migration |
| `doc_sequence` | Numbering continuity (via DocNumberService) | test mocks `DocSequenceRepository` |
| `axiosClient` (JWT + `{data,meta}` envelope unwrap + 401/403) | FE API layer base | `production-api.ts` imports `apiClient` |
| `PageDto` | FE pagination typing | `production.types.ts` |
| TanStack Query conventions (`useInward`) | `useProduction` hooks | hook file |

---

## 7. Inventory Safety Scan

Static scan confirms **no Production code path writes `stock_balance` / `StockBalance` directly**:

- `InventoryIntegrationService.java`: only javadoc mentions of the guard; no repo dependency.
- Only legitimate direct-balance writers in the codebase are `StockService` (the engine) — untouched — and the pre-existing `SpareRequestService` (non-Production).
- New tests (`InventoryIntegrationServiceTest`, `DocNumberServiceProductionSeedTest`) reference `StockBalanceRepository` only in a javadoc guard statement; no direct balance access.

**Result: PASS — inventory protection absolute.**

---

## 8. Tests

### 8.1 New tests added
| Test | Method count | Purpose |
|---|---|---|
| `InventoryIntegrationServiceTest` | 5 | Verifies FE wrapper delegates every movement to `StockService` with correct doc-type/tx-type constants; verifies no direct balance access |
| `DocNumberServiceProductionSeedTest` | 8 (6 seeded + 2 fallback) | Verifies each seeded Production doc-type resolves to FRS format `PREFIX-PLANT-YEAR-SEQ` via `nextNumberFromConfig` (DOC 14 TC-19 numbering continuity analog); verifies unseeded fallback |

### 8.2 Backend full suite
- **`./gradlew test`: BUILD SUCCESSFUL**
- **Result:** 175 tests, 0 failures, 0 errors, 0 skipped (up from 162 at P0 baseline; +13 from new tests).

### 8.3 Frontend
- **`npm run typecheck`: PASS** (tsc -b clean)
- **`npm test`: 34 passed** (5 files) — unchanged from baseline
- **`npm run lint`: 769 problems (31 errors, 738 warnings)** — identical to P0 baseline; all pre-existing, none introduced by the new production files

---

## 9. Regression Check

- No Controller/entity/service logic modified → no behavior regression possible from P1 changes.
- **Backend:** full test suite green (175/175). Confirmed `ProductionController.java` and `StockService.java` unmodified this session.
- **Frontend:** `typecheck` clean and `test` suite unchanged; new files are additive and not wired into screens (no registry/screen change).
- Verdict: **No regression introduced (REGRESSION: NONE).**

---

## 10. Deferred Work (Explicit)

Work is intentionally deferred OUT of P1 (not part of Database & Entity Foundation):

- **WorkflowStateMachine extension** — deferred by explicit user decision to P2/P4 handoff (see §2.4).
- **Entity/domain class foundations** (`ProductionEntry` entity refactor etc.) — deferred; P1 delivered schema + seed + wrapper + FE type foundation only. Entities, execution, consumption, rejection, scrap, rework, idle-time, conversion, planning, OEE, and reports remain in later phases (P2+).
- **`production_entry*` table/entity changes** — P1 OFF-LIMITS per directive; untouched.
- **StockService / `ProductionController` logic changes** — untouchable in P1; untouched.

---

## 11. P1 GATE RESULT

**P1 GATE RESULT: PASS**

- All 8 pre-implementation gates satisfied (DOCUMENT_19 for GATE 1–7; GATE 8 change set verified, user decision recorded).
- Scope-limited to Database & Entity Foundation; no P2/P3 scope creep.
- Additive-only database change, validated on a disposable Postgres 16 + Flyway 10 environment.
- Inventory-safety static scan clean.
- Backend 175/175 tests green; FE typecheck clean, 34 tests pass, lint at baseline.
- Zero modifications to off-limits components (`StockService`, `ProductionController`, legacy `production_entry*`, `numbering_config` DDL, `V1__baseline.sql`, profiles, FRS docs, WorkflowStateMachine).

### Ready for P2
Execution halts here pending explicit approval. **Awaiting P1 gate approval before P2 (Work Order / PO / Job Card) begins.**

> Review note (documentation): No FRS contradiction was encountered in P1. No ADR change is proposed. No editing of approved documents was performed.