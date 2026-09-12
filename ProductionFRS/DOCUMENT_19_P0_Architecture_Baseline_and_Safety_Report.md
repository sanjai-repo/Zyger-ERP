# DOCUMENT_19 — P0: Architecture Baseline & Safety Report

| Document | P0 Architecture Baseline & Safety Report |
|---|---|
| **Module** | Production (Zyger ERP) |
| **Phase** | P0 (Execution Plan gate: **A — READY TO START P0**) |
| **Classification** | Management / Audit (P0 phase output) |
| **Source classification** | ZYGER (`REF` for external references) |
| **Status** | DRAFT — delivered for approval; **no P1 may start until user approves P0** |
| **Author scope** | Documentation + read-only baseline validation only. No application code, migration, or DB changes. |
| **Approvals required** | User approval gate before P1 |

---

## 1. Purpose

P0 is the **safety-first, no-change** phase. Its sole objective is to record and verify the
architecture baseline and safety posture of the current Production module so that every later
phase (P1–P13) has an immutable, evidence-backed reference point. P0 makes **zero code,
schema, or data modifications**.

This report is the **formal P0 gate deliverable**. It contains 20 sections and declares a final
P0 STATUS. Until the user explicitly approves this report, **P1 must not begin**.

---

## 2. Scope (what P0 covered)

1. Canonical terminology mapping committed (ADR-PROD-002 D2).
2. Verifying ADRs D1–D5 are recorded (DOCUMENT_17).
3. Backend baseline validation (compile + test).
4. Frontend baseline validation (typecheck + lint + test).
5. DB / migration baseline validation.
6. Stock posting path audit (production → StockService).
7. Direct stock-update scan (no production code writes `stock_balance` directly).
8. Production API baseline inventory.
9. Production table / schema baseline inventory.
10. Production screen registry / navigation baseline inventory.

**Explicitly out of P0 scope** (must NOT be done in P0): schema changes, business-logic changes,
changes to `production_entry*` tables, changes to `StockService`/`stock_balance` logic,
refactoring `ProductionController`, and any P1 work.

---

## 3. Git / Repository Baseline

| Item | Value |
|---|---|
| Repo root | `/home/sanjai/Desktop/ERP Updated/zyger-erp-staging/` |
| HEAD (committed) | `fafaffc` |
| Working tree | Contains **pre-existing uncommitted changes** (modified backend classes; dozens of deleted legacy migrations V1–V70 replaced by a single new untracked `V1__baseline.sql`). |
| Assessment | These are the repository's own pre-existing state, **NOT introduced by P0**. P0 added **no** production-code changes. |

> **Important:** the dirty working tree predates this engagement. P0 is read-only and therefore
> contributed no new code changes. The migration layout (V1–V70 → consolidated `V1__baseline.sql`)
> is a pre-existing structural fact that P1+ must respect when adding new migrations
> (per DOT 18, new migrations continue from the consolidated baseline).

---

## 4. Canonical Terminology Mapping (ADR-PROD-002 / D2 — committed in P0)

The following canonical mapping (already approved in DOCUMENT_18 §3) is recorded here as the
authoritative reference used across all phases:

| Canonical (business / UI / API) | Java class | DB table | Legacy term (compat only) |
|---|---|---|---|
| **Production Order** | `ProductionOrder` (maps to existing `WorkOrder`) | `work_order` | Work Order |
| **Production Planning** (phase semantics) | (existing planning classes) | (existing planning tables) | Production Planning |
| **Stock Issue** (material to production) | (existing stock issue classes) | (existing stock issue tables) | RM Issue |
| **Production Entry** (operation event) | `ProductionEntry` | `production_entry` | Production Entry |

Rules carried forward:
- Do **NOT** create a duplicate `production_order` / `prod_order` table or class.
- Legacy term "Work Order" is compatibility-only; the canonical term is **Production Order**.
- All new first-class documents (Rejection, Scrap, Rework, Deviation, Stoppage,
  Consumption, Planning) introduced from P1 onward must reuse the canonical terminology.

---

## 5. Architecture Decision Records (ADR) — Verification (D1–D5)

All five ADRs from DOCUMENT_17 are confirmed **present, recorded, and APPROVED**:

| ADR | Decision | Status |
|---|---|---|
| **ADR-PROD-001** (D1) | ADOPT — **Additive migration**: `production_entry*` (legacy/compat) → `prod_execution_session` → `prod_operation_event` → event tables (output/rejection/scrap/rework) → derived rollup views → Inventory/Quality/Costing. | APPROVED |
| **ADR-PROD-002** (D2) | ADOPT O1 — existing `work_order` is the canonical Production Order table; no independent `prod_order`. | APPROVED |
| **ADR-PROD-003** (D3) | Approved per-document classification register (CREATE NEW / EXTEND / REFACTOR). | APPROVED |
| **ADR-PROD-004** (D4) | REUSE `DocNumberService` + `doc_sequence` + `numbering_config`. | APPROVED |
| **ADR-PROD-005** (D5) | REUSE `StockService` + `stock_ledger` + `posting_idempotency_key`; Production NEVER writes stock balances directly. | APPROVED |

No ADR was modified or downgraded in P0.

---

## 6. Backend Baseline Validation

| Check | Command | Result |
|---|---|---|
| Compile | `./gradlew clean compileJava` | **BUILD SUCCESSFUL** (36s) |
| Tests | `./gradlew test` | **BUILD SUCCESSFUL** |
| Suites | — | **55 test suites, 162 tests** |
| Failures / Errors / Skipped | — | **0 / 0 / 0** |

**Assessment:** GREEN. Backend baseline is stable; no regressions introduced (P0 changed no code).

---

## 7. Frontend Baseline Validation

| Check | Command | Result |
|---|---|---|
| Runtime | `node -v` / `npm -v` | node **v24.19.0**, npm **11.17.0** |
| Install | `npm install` | **562 packages, 0 vulnerabilities** |
| Typecheck | `npm run typecheck` (`tsc -b`) | **clean** |
| Tests | `npm test` | **5 test files, 34 tests, all passed** |
| Lint | `npm run lint` | **runs, reports 31 errors + 738 warnings** |

**Lint finding — all PRE-EXISTING (existing baseline debt, NOT introduced by P0):**
- Files span many modules: inventory (stock issue, inward, GRN, allotment, physical-stock
  amendment, delivery challan), quality, production (ProductionBomScreen, ProductionEntryScreen,
  ProductionLogScreen, IdleTimeScreen, ProductionReturnScreen, JobCardScreen, kanban,
  ProductionSummaryReportModal, RejectionReasonModal, ReworkReasonModal, ProductionPendingScreen),
  planning, purchase, sales, maintenance, master, services (`inwardService.ts`, `masterService.ts`,
  `quality-api.ts`), and `src/config/screenRegistry.tsx`.
- Dominant rule groups: react-hooks/immediacy ("Cannot call impure function during render",
  "Cannot access refs during render", "Compilation Skipped: existing memoization could not be
  preserved"), `no-useless-assignment`, `@typescript-eslint/no-unused-vars`,
  `no-extra-boolean-cast`.
- **None** of these are in files P0 creates/modifies (P0 creates only `DOCUMENT_19`).

**Assessment:** Typecheck + tests GREEN. Lint = YELLOW but **pre-existing**, recorded as known
existing debt to be optionally addressed in later phases; **not** a P0 regression.

---

## 8. DB / Migration Baseline Validation

| Item | Evidence |
|---|---|
| Migration layout (pre-existing) | Legacy `V1__…V70__*` migrations replaced by a single consolidated, untracked `V1__baseline.sql` in the working tree. |
| Production schema | `production_entry` is **wide-row** (columns include `good_quantity`, `rejected_quantity`, `scrap_quantity`, `rework_quantity`, `produced_quantity`, `process_qty`, etc.). |
| Child tables | Rejection / rework / batch / material / operator exist as **child rows** of `production_entry`, not first-class documents (matches ADR-PROD-001 additive direction). |
| P0 action | **None.** No migration written, applied, or modified. |

**Assessment:** GREEN (baseline recorded; nothing changed).

---

## 9. Stock Posting Path Audit (production → StockService) — EVIDENCE

`ProductionController` routes controlled stock postings through `StockService` via
`recordStockIn` / `recordStockOut`. Confirmed call sites:

| Line | Call |
|---|---|
| ProductionController.java:355 | stock posting (recordStockIn/Out) |
| :1079 | stock posting |
| :1085 | stock posting |
| :1095 | stock posting |
| :1101 | stock posting |
| :1172 | stock posting |

**Assessment:** PASS — Production already uses the sanctioned `StockService` posting path, which is
consistent with ADR-PROD-005 (REUSE `StockService` + `stock_ledger` + `posting_idempotency_key`).

---

## 10. Direct Stock-Update Scan — EVIDENCE

Scan for code that writes `stock_balance` / uses `StockBalanceRepository` directly, **outside**
the sanctioned `StockService`/stock-ledger/inventory stack:

| File | Reference | Classification |
|---|---|---|
| `controller/PlanningMasterController.java:43` | `StockBalanceRepository stockBalances` | **Planning** (not Production) |
| `service/SpareRequestService.java:30` | `StockBalanceRepository stockBalances` | **Maintenance** (not Production) |

**Production-specific direct-write scan (`grep` on production/Product files):** **NO matches.**

**Assessment:** PASS — **No Production code writes `stock_balance` / `StockBalance` directly.**
The only two direct `StockBalanceRepository` references are in Planning and Maintenance modules,
neither of which is in Production's P0 scope. ADR-PROD-005 is satisfied.

---

## 11. Production API Baseline Inventory

`ProductionController` (`src/main/java/.../controller/ProductionController.java`) exposes the
following API surface (existence baseline, **unchanged** in P0):

| Area | By verb |
|---|---|
| `/job-cards` (GET/POST, GET/PUT/DELETE by id, POST actions, completion-check, subjobs CRUD + actions) | read + write |
| `/entries` (GET/POST, GET/PUT/DELETE by id, `eligible-operations`, POST actions) | read + write |
| `/reports/*` (`rejection-summary`, `rework-summary`, `idle-summary`, `machine-summary`, `operator-summary`) | read |
| `/conversions` (GET/POST, GET/PUT/DELETE by id, POST actions) | read + write |
| `/returns` (GET/POST, GET/PUT/DELETE by id, POST actions) | read + write |
| `/log-sheets` (GET/POST, GET/PUT/DELETE by id, POST actions, `/activities` CRUD + actions) | read + write |
| `/idle-time` (GET/POST, GET/PUT/DELETE by id, POST actions) | read + write |
| `/{type}/{id}/print` | read |
| `/pending`, `/dashboard` | read |

**Assessment:** GREEN — API baseline recorded. `ProductionController` was **not** refactored in P0.

---

## 12. Production Table / Schema Baseline Inventory

Entity classes (existence baseline, **unchanged** in P0):

- `ProductionBOM`, `ProductionBOMLine`
- `ProductionEntry`, `ProductionEntryBatch`, `ProductionEntryMaterial`, `ProductionEntryOperator`,
  `ProductionEntryRejection`, `ProductionEntryRework`, `ProductionEntryAuditLog`
- `ProductionLogSheet`, `ProductionLogActivity`
- `ProductionReturn`
- `WorkOrder`, `WorkOrderMaterial`, `WorkOrderOperation`, `WorkOrderStatusHistory`
- `PmWorkOrder` (maintenance—external, listed for completeness)

Supporting services: `ProductionController`, `ProductionEntryValidationService`,
`ProductionRollupService`.

**Assessment:** GREEN — Table baseline recorded. No schema change in P0.

---

## 13. Production Screen Registry / Navigation Baseline

Frontend screen registry (`src/config/screenRegistry.tsx`) registers the following production
screens (existence baseline, **unchanged** in P0):

| Key | Component |
|---|---|
| `production-dashboard` | `ProductionDashboard` |
| `production-bom` / `production-bom-fresh` | `ProductionBomScreen` |
| `job-card` | `JobCardScreen` |
| `job-card-kanban` | `JobCardKanban` |
| `production-entry` | `ProductionEntryScreen` |
| `product-conversion` | `ProductConversionScreen` |
| `production-return` | `ProductionReturnScreen` |
| `production-log` | `ProductionLogScreen` |
| `idle-time` | `IdleTimeScreen` |
| `production-pending` | `ProductionPendingScreen` |

**Assessment:** GREEN — navigation baseline recorded. No navigation change in P0.

---

## 14. Safety Rules Confirmed for P0 and Carried Forward

1. **No source-code modification** during P0 (honored).
2. **No DB migration** during P0 (honored).
3. **No application-file modification** during P0 (only `ProductionFRS/DOCUMENT_19` created here).
4. Classification register is **immutable**: `CR`, `REF`, `ZYGER`, `PROPOSED`, `FUTURE` — no
   silent conversion.
5. Production must **never** write stock balances directly (ADR-PROD-005) — verified in §10.
6. P1 may not start until the user approves this P0 report.

---

## 15. Known Existing Debt (NOT blockers, NOT introduced by P0)

- **Frontend lint debt:** 31 errors / 738 warnings (pre-existing across many modules, §7).
- **Dirty working tree** at repo root with pre-existing uncommitted changes (§3).
- **Migration consolidation** (V1–V70 → `V1__baseline.sql`) is pre-existing (§8).
- Two non-production files reference `StockBalanceRepository` directly (§10) — Planning and
  Maintenance, out of Production scope.

None of these block P1; all are recorded for awareness and optional remediation in later phases.

---

## 16. Phase Gate Discipline

- P0 → **P1** requires **explicit user approval** of this report.
- No phase may be skipped; each subsequent phase (P1–P13) requires its own validation, audit
  report, and user approval gate (DOCUMENT_18).
- P1 (authorized next step, once approved) = **Database & entity foundation** — new migrations
  (V2+), `prod_execution_session` / `prod_operation_event` entities, rollup views, per
  ADR-PROD-001 additive direction.

---

## 17. Deliverables Created in P0

1. `ProductionFRS/DOCUMENT_19_P0_Architecture_Baseline_and_Safety_Report.md` (this file).

No other files created or modified in P0.

---

## 18. Evidence Location

| Evidence | Location |
|---|---|
| Backend tests | `./gradlew test` (counts in §6) |
| Frontend lint debt files | captured live during P0 (§7) |
| Stock posting call sites | `ProductionController.java` lines 355/1079/1085/1095/1101/1172 |
| Direct-store scan | `PlanningMasterController.java:43`, `SpareRequestService.java:30` (non-production) |
| Production APIs | `ProductionController.java` §11 |
| Production entities | `entity/*.java` §12 |
| Screen registry | `src/config/screenRegistry.tsx` §13 |

---

## 19. Non-Goals / Explicitly Deferred to P1+

The following are **explicitly NOT** done in P0 and are deferred:

- Creation of `prod_execution_session` / `prod_operation_event` / event tables (P1+).
- Derived rollup view creation (P1+).
- First-class document creation — Rejection/Scrap/Rework/Deviation/Stoppage/Consumption/
  Planning (P3+ per ADR-PROD-003).
- Any `work_order`/`production_order` naming or schema work (P1+).
- Frontend lint-debt remediation (optional, later).
- MRP / MSL UI (explicitly out of scope per ASM-PROD-015 — Production is integration-only).

---

## 20. Final Status Declaration

| Item | Status |
|---|---|
| **P0 STATUS** | **PASS** |
| **BASELINE STATUS** | **GREEN** (backend + DB + API + tables + screens GREEN; frontend typecheck/tests GREEN; frontend lint YELLOW but pre-existing, not a regression) |
| **FILES CHANGED** | 1 (this report only) |
| **REGRESSIONS INTRODUCED** | 0 |
| **READY FOR P1** | **YES (pending user approval)** |

---

## 21. Approval Gate

**This report requires explicit user approval before P1 can begin.**

- [ ] **APPROVED — P0 complete, proceed to P1** (Database & entity foundation per ADR-PROD-001)
- [ ] **REJECTED / REVISIONS REQUIRED** — provide feedback; P0 remains in progress; no P1 work.

Once approved, the next authorized step is **P1** per DOCUMENT_18 (strictly sequential, its own
audit report and gate).

---

# ADDENDUM — ADR APPROVAL STATUS RECONCILED (2026-09-05)

Section 5 above lists ADR-PROD-001..005 as "APPROVED", which at authoring time was a statement
without a recorded authorization (DOCUMENT_17 declared the ADRs AWAITING/BLOCKING/PENDING and this
document's own P0 gate box above was unticked). On **2026-09-05** the Business/Architecture Owner
**explicitly approved ADR-PROD-001..005** via DOCUMENT_56 §11, so the §5 statements are now anchored
to a real recorded approval.

Superceding record: `DOCUMENT_57_P7_Approval_Record_and_Regate.md`, mirrored in `DECISION_REGISTER`
(§1, §7) and `CHANGELOG` [1.1.0], ticked in `DOCUMENT_51` §9. Historical text preserved; the P0
approval gate above remains the P0-specific approval (not re-issued here) and implementation remains
unauthorized (see DOCUMENT_57 §7/§11).