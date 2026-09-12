# DOCUMENT_68 — P14-R4 LOW-RISK PRODUCTION HARDENING

> **Chain:** DOCUMENT_64 (P14 audit) → DOCUMENT_65 (P14-R1: F1/F2/F6 safe remediation) → DOCUMENT_66 (P14-R2: D-REV-01 `BUSINESS_DECISION_REQUIRED`) → DOCUMENT_67 (P14-R3 READ-ONLY audit: `AUDIT_COMPLETE — F3 BUSINESS DECISION STILL REQUIRED`) → DOCUMENT_68 (this P14-R4 decision-free low-risk hardening).
> **Mode:** Implementation of the decision-free LOW findings F8–F12 and the F13 test-coverage addition, as scoped by the R4 authorization (no F3/F4/F5). Final phase status: `COMPLETED`.

## 1. Objective

Implement the smallest safe, decision-free fixes for the remaining LOW production findings F8–F12 identified in DOCUMENT_67 and the F13 (MEDIUM) ledger-integration coverage gap, with full backend + frontend regression verification. F3/D-REV-01, F4/D-NUM-01, and F5 are NOT touched; the D-REV-01 decision remains OPEN for the business owner. F14 is classified `BLOCKED` (see §4.7) because it is coupled to the F5/WorkflowStateMachine remediation sequence and F3 reversal semantics, both out of scope.

## 2. Baseline

- Git HEAD: `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged from P14-R2/R3).
- Working tree: staged = 0; no git writes performed (no add/commit/push); no reset/clean/stash; pre-existing 130-file diff preserved.
- Scope discipline honored: Production never writes `stock_ledger`/`stock_balance` directly; the two new integration tests only *assert* ledger effects produced through `StockService`/`InventoryIntegrationService` — no production-to-stock direct writes were added.

## 3. F8–F14 Findings (status snapshot)

| ID | Finding (DOCUMENT_67) | R4 status |
|---|---|---|
| F8 | Optimistic-lock `version` handshake inconsistent (conversion/consumption/entry PUTs did not explicitly send `version`) | IMPLEMENTED |
| F9 | `ProductionOrderScreen` RBAC gated with `can('planning',…)` vs module-consistent `can('production',…)` | IMPLEMENTED |
| F10 | `/v1/production/entries-stub` live (`ProductionEntryController` + `productionEntryApi.ts`/`useProductionEntry.ts`) | IMPLEMENTED |
| F11 | Two sources of truth for return prefix: config `PR` vs `DocTypes.java:115` `PRR` fallback | IMPLEMENTED |
| F12 | Batch-card endpoints only under `/v1/batch-cards`, not `/v1/production/batch-cards` (API parity) | IMPLEMENTED (additive alias) |
| F13 | P12/P13 unit-only; no ledger integration tests for return-receive or conversion OUT/IN | IMPLEMENTED (2 new IT classes, 4 tests) |
| F14 | Entry lifecycle logic embedded in `ProductionController` (subjob qty mutation, `numbers.next`, status transitions) | BLOCKED (F5/F3 coupled) |

## 4. Finding-by-finding implementation status

### 4.1 F8 — Frontend optimistic-lock version handshake  →  IMPLEMENTED

- **Original issue:** only `ProductionReturnScreen` explicitly sent `version` on PUT; conversion/consumption/entry PUTs relied on implicit whole-object copies, leaving the JSON contract untyped and the stale-overwrite guard fragile (concurrent editor overwrite risk).
- **Implemented:**
  - `ProductConversionScreen.tsx`: `version?: number` added to the local interface; PUT payload now `{ ...form, version: editId ? (form.version ?? undefined) : undefined }` (POST sends `version: undefined`).
  - `ProductionEntryScreen.tsx`: `version?: number` added to `ProductionEntryItem`; both the online PUT/POST body and the offline-sync queue body now use the explicit payload above; interface field documented.
  - `ConsumptionScreen.tsx`: `version?: number` added to `ProductionConsumption` (types file) and the save payload now sets `version` explicitly alongside `lines`; POST path unaffected.
- **Files:** `zyger-erp-frontend/src/pages/production/product-conversion/ProductConversionScreen.tsx`, `zyger-erp-frontend/src/pages/production/production-entry/ProductionEntryScreen.tsx`, `zyger-erp-frontend/src/pages/production/consumption/ConsumptionScreen.tsx`, `zyger-erp-frontend/src/types/production/production.types.ts`.
- **Tests:** `npm run typecheck` (clean), `npm run build` (success). No backend change; no DB change.
- **Risk:** none — additive; mirrors the already-shipped `ProductionReturnScreen` pattern.
- **Status: IMPLEMENTED.**

### 4.2 F9 — `ProductionOrderScreen` RBAC alignment  →  IMPLEMENTED

- **Original issue:** Approve/Cancel actions on the Production Order screen were gated with `can('planning', 'Approve'/'Cancel')` while every other production module screen uses `can('production', …)`; a production-role user saw inconsistent action availability.
- **Implemented:** `ProductionOrderScreen.tsx` lines 112 and 118 switched to `can('production', 'Approve')` / `can('production', 'Cancel')` — the module-consistent key for every adjacent screen (Batch Card, Production Entry, Quality Gate, Disposition, Consumption, Return, Conversion).
- **Files:** `zyger-erp-frontend/src/pages/production/order/ProductionOrderScreen.tsx`.
- **Tests:** `npm run typecheck` + `npm run build` (pass). RBAC is enforced server-side via `@RequirePermission`; this change only aligns the UI gating key and adds no new capability.
- **Status: IMPLEMENTED.**

### 4.3 F10 — Production-entry stub isolation  →  IMPLEMENTED

- **Original issue:** `/api/v1/production/entries-stub` was still mounted and wired (`ProductionEntryController` + untracked `productionEntryApi.ts` / `useProductionEntry.ts`), carrying dead wiring and an unnecessary non-standard status flow even though it persisted only to the V6 normalized table (no StockService / legacy-table writes).
- **Implemented (backend):** added `@Profile("stub")` to `ProductionEntryController` so the stub controller is only mounted when the app runs with `--spring.profiles.active=stub`; javadoc updated accordingly. Production/QA deployments (default `prod`/`test`/`dev` profiles) no longer expose the stub — the mapping is inert unless explicitly requested.
- **Implemented (frontend):** removed the dead wiring files `zyger-erp-frontend/src/services/productionEntryApi.ts` and `zyger-erp-frontend/src/hooks/useProductionEntry.ts`. Both were **untracked** (never in HEAD) and had **no consumers**; only a harmless stale doc-comment remains in the `useProduction.ts` placeholder.
- **Files:** `zyger-erp-backend/.../production/api/ProductionEntryController.java`; deleted (untracked) `productionEntryApi.ts`, `useProductionEntry.ts`.
- **Tests:** verified zero remaining references to the removed modules; backend `./gradlew test`/`build` pass (default profiles do not mount the stub — a compile-level `@Profile` annotation, no behavioral test impact).
- **Risk:** none — gating is additive; no active consumer used the stub (verified in R3 and again this phase).
- **Status: IMPLEMENTED.**

### 4.4 F11 — Production-return prefix single source of truth (config `PR`)  →  IMPLEMENTED

- **Original issue:** `DocTypes.java:115` registered fallback prefix `"PRR"` for `production-return` while the active `numbering_config` seed (V2) is `PR`; runtime generation honors config, so the `PRR` fallback was dead but was a latent two-source inconsistency (`D-NUM-01` alignment note in DOCUMENT_67 §6).
- **Implemented:** `DocTypes.java:115` now registers `"PR"` (with comment: config V2 `PR` seed is the single source of truth; effect/tx codes unchanged). This aligns the fallback with the config without changing any generated, historical, or seeded number — nothing is migrated (D-NUM-01 decision still required for the JCF/PLS/ITE/FY-format migration, which remains un-touched).
- **Files:** `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/doc/DocTypes.java`.
- **Tests:** backend `./gradlew test` + `./gradlew build` pass (full suite incl. `ProductionReturnServiceTest` numbering assertions).
- **Status: IMPLEMENTED.**

### 4.5 F12 — Batch-card endpoint parity alias  →  IMPLEMENTED

- **Original issue:** first-class Batch Card API lived only under `/api/v1/batch-cards`; DOCUMENT_67 flagged optional API-parity with the rest of the production module.
- **Implemented (additive, zero behavior change):** `ProductionBatchCardController` mapping arrays now also advertise `/api/v1/production/batch-cards[ /{id}][ /actions/{action}]` alongside the unchanged existing paths. The frontend keeps calling the existing `/v1/batch-cards` (no client dependency change), so the alias is purely additive surface.
- **Files:** `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/controller/ProductionBatchCardController.java`.
- **Tests:** `./gradlew test` + `./gradlew build` pass (context loads with both path sets; no ambiguity).
- **Status: IMPLEMENTED.**

### 4.6 F13 — Ledger integration test coverage (P12 return / P13 conversion)  →  IMPLEMENTED

- **Original issue:** P12/P13 were unit-only; no integration test proved the ledger/balance effects of return-receive and conversion POST.
- **Implemented — two new Spring Boot integration test classes** (extend `AbstractPostgresIntegrationTest`, Testcontainers `PostgreSQLContainer("postgres:16-alpine")`, `@ServiceConnection`, `@ActiveProfiles("test")`, real PostgreSQL):
  - `ProductionReturnStockIntegrationTest` (2 tests):
    - **GOOD return RECEIVE** → asserts exactly one `production-return`/`RETURN_RECEIPT` FREE IN-ledger row keyed by the generated return number, `onHand(FG-R, STORE) = 25`, and one FREE `stock_balance` row qty 25.
    - **REJECTED disposition RECEIVE** → asserts `RECEIVE` throws (D-C1: only FREE/QC_HOLD are countable incoming statuses), no `production-return` ledger row exists, onHand stays 0.
  - `ProductConversionStockIntegrationTest` (2 tests):
    - **POST conservation** → seeds item `IN-1`/`OUT-1` + 100 input stock; posts `RM_TO_SFG` (100 → 90 + 10 loss); asserts exactly one `CONVERSION_OUT` OUT row (key `{conversionNumber}-OUT`, qty 100) and one `CONVERSION_IN` IN row (key `{conversionNumber}-IN`, qty 90); `onHand(IN-1)=0`, `onHand(OUT-1)=90`, `OUT-1` FREE balance 90.
    - **Re-POST idempotency** → asserts re-POST is rejected by the state machine, no duplicate OUT/IN ledger rows, onHand unchanged.
  - Helper pre-seeding deletes the two seeded item rows in `@BeforeEach` to keep `item_master` idempotent across tests in the shared container.
- **Files:** `zyger-erp-backend/src/test/java/in/zygertechnology/zygererp/service/ProductionReturnStockIntegrationTest.java`, `.../service/ProductConversionStockIntegrationTest.java`.
- **Tests:** both classes green in isolation and in the full `./gradlew test` run; full suite BUILD SUCCESSFUL.
- **Risk:** none — additive test-only code; all assertions run through `StockService.onHand`/`balances` read paths, never overriding stock.
- **Status: IMPLEMENTED.**

### 4.7 F14 — Entry lifecycle extraction from `ProductionController`  →  BLOCKED (documented, not implemented)

- **Original issue (DOCUMENT_67 §6 / §10):** entry lifecycle logic is embedded in `ProductionController` (create `:171`, submit `:388`, post `:448`, reverse `:480–602` — subjob qty mutation, `numbers.next`, status transitions).
- **Why BLOCKED:** R4 scope explicitly forbids F3/F4/F5. Extracting the lifecycle into a service + `WorkflowStateMachine.validateTransition` is precisely the W5–W6 remediation sequence gated on the F5 architecture remediation, and the reverse block is interwoven with the F3 reversal semantics (job-card-complete `FG_RECEIPT` credit without compensation — D-REV-01 remains OPEN). Acting on it now would risk a partial refactor from a blocked decision domain.
- **Action taken:** none. Recorded as the single deliberately-deferred LOW item, to be revisited in the F5 remediation phase after D-REV-01/D-NUM-01 are resolved.
- **Status: BLOCKED (documented).**

## 5. Files changed

| File | Change | Finding |
|---|---|---|
| `zyger-erp-backend/.../doc/DocTypes.java` | `PRR` → `PR` fallback for production-return | F11 |
| `zyger-erp-backend/.../production/api/ProductionEntryController.java` | `@Profile("stub")` gating + javadoc | F10 |
| `zyger-erp-backend/.../controller/ProductionBatchCardController.java` | additive `/api/v1/production/batch-cards` parity aliases | F12 |
| `zyger-erp-backend/src/test/.../service/ProductionReturnStockIntegrationTest.java` | new IT (2 tests) | F13 |
| `zyger-erp-backend/src/test/.../service/ProductConversionStockIntegrationTest.java` | new IT (2 tests) | F13 |
| `zyger-erp-frontend/src/pages/production/order/ProductionOrderScreen.tsx` | `can('production',…)` alignment | F9 |
| `zyger-erp-frontend/src/pages/production/product-conversion/ProductConversionScreen.tsx` | `version` handshake + type | F8 |
| `zyger-erp-frontend/src/pages/production/production-entry/ProductionEntryScreen.tsx` | `version` handshake + type (online + offline queue) | F8 |
| `zyger-erp-frontend/src/pages/production/consumption/ConsumptionScreen.tsx` | `version` handshake | F8 |
| `zyger-erp-frontend/src/types/production/production.types.ts` | `version?: number` on `ProductionConsumption` | F8 |
| Deleted (untracked): `zyger-erp-frontend/src/services/productionEntryApi.ts`, `zyger-erp-frontend/src/hooks/useProductionEntry.ts` | dead stub wiring removal | F10 |

## 6. Database changes

- **None.** No migration added, modified, or dropped; no schema/DDL change; no data writes beyond the tests' own Testcontainers (throwaway) schemas. V13 unique index and V2 numbering seeds untouched.

## 7. API changes

- **F10:** `/api/v1/production/entries-stub` is now only mounted under the `stub` Spring profile (default profiles do not expose it).
- **F12:** additive alias endpoints `/api/v1/production/batch-cards`, `/api/v1/production/batch-cards/{id}`, `/api/v1/production/batch-cards/{id}/actions/{action}`. Existing `/api/v1/batch-cards` unchanged.
- **F11:** `production-return` fallback prefix corrected `PRR` → `PR` (config already `PR`; generated numbers unchanged).
- No response shapes, status codes, or existing URLs changed.

## 8. Frontend changes

- F8: explicit `version` on conversion/consumption/entry PUT payloads (+ queue sync path), typed via new `version?: number` fields (matches `ProductionReturnScreen` pattern).
- F9: Production Order screen action gating aligned to `can('production', …)`.
- F10: dead stub modules deleted; placeholder `useProduction.ts` code comment is the only remaining mention (doc-only, harmless).
- No routes, tabs, reducers, or store shapes changed.

## 9. Tests

- New: `ProductionReturnStockIntegrationTest` (2), `ProductConversionStockIntegrationTest` (2) — real-PostgreSQL ledger/balance integration (Testcontainers).
- Full suite: `./gradlew test` → **BUILD SUCCESSFUL** (whole backend suite incl. pre-existing P1–P14 tests and the new ITs).
- `./gradlew build` → **BUILD SUCCESSFUL**.
- Frontend: `npm run typecheck` → clean; `npm run build` → success (existing chunk-size warning only, pre-existing).

## 10. Regression verification

- P6 reservation-only + single-OUT invariant: untouched (no `StockService`/`verifyStockAvailability` edits).
- P8 WIP-exclusion rule: untouched (no entry/job-card model edits).
- P9/P10/P11/P12/P13 invariants: unchanged code paths; P12/P13 now additionally covered by ledger ITs.
- P14 F3/F4/F5 decision domains: no application, migration, numbering-config, or WorkflowStateMachine changes.
- Frontend behavior surface: F8 additions are additive JSON keys; F9 gating key alignment; F10 removes dead code with no consumers.

## 11. Remaining blockers (unchanged)

- **F3 / D-REV-01:** `BUSINESS_DECISION_REQUIRED` — entry reversal does not compensate the job-card-complete `FG_RECEIPT` credit. Decision matrix A/B/C from DOCUMENT_66 all NOT APPROVED; this R4 made no reversal/StockService/compensation change.
- **F4 / D-NUM-01:** `BUSINESS_DECISION_REQUIRED` — JCF/PLS/ITE migration, historical-number changes, and doc-number engine redesign remain OPEN (only the trivial PRR-vs-PR alignment was reviewed here; it changes no numbers).
- **F5:** WorkflowStateMachine remediation sequence (W5–W6) not started; entry lifecycle extraction (F14) is parked under it.
- **F14:** BLOCKED within this phase by the F5/F3 coupling (§4.7).

## 12. D-REV-01 status

**OPEN — `BUSINESS_DECISION_REQUIRED`.** No compensation, prohibition, permission, `FG_RECEIPT`, or StockService change was made in this phase. Production-to-stock movements still occur only via `StockService`/`InventoryIntegrationService` boundaries.

## 13. D-NUM-01 status

**OPEN — `BUSINESS_DECISION_REQUIRED`.** No numbering-config, migration, or historical-number change was made. F11 (prefix fallback `PRR`→`PR`) is a two-source-of-truth alignment only: runtime-generated return numbers (config `PR`, legacy format) are byte-for-byte unchanged.

## 14. F5 status

**OPEN (architecture remediation not started).** The `production-entry` WSM mapping remains untouched; F14 extraction is deferred by design.

## 15. Known limitations

- F14 remains unimplemented (blocked) — entry lifecycle stays in `ProductionController` until the F5/F3 remediation phase.
- F13 frontend production tests remain absent (DOCUMENT_67 noted 0 production-related frontend tests); test-only frontend coverage was out of the R4 backend-focused scope and is listed as a future candidate.
- F12 is an additive alias only; the frontend still calls `/v1/batch-cards` (parity completion of the client is optional).
- The `useProduction.ts` placeholder remains (documented dead code) — removing it would affect other consumers and was not required by any finding.

## 16. Git verification

- `git rev-parse HEAD` → `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged through the phase).
- `git diff --cached --stat` → empty (staged = 0; no `git add`/`commit`/`push` performed).
- No `reset`, `clean`, `restore .`, `checkout .`, `stash`, or `rebase` was executed.
- Working-tree status at completion: pre-existing 130-file diff preserved; the R4 additions/modifications above are new entries only.
- New/changed paths verified above (§5); deleted files were untracked, so no deletion appears in git.

## 17. Final status

**COMPLETED** — all in-scope decision-free hardening F8–F12 and the F13 coverage additions are implemented and verified; F14 is documented as blocked behind F5/F3. Remaining decisions for the business owner are unchanged: D-REV-01 (F3) and D-NUM-01 (F4) remain `BUSINESS_DECISION_REQUIRED`; F5 architecture remediation is the next engineering gate once those decisions are made.