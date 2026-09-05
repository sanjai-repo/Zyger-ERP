# DOCUMENT_65 — P14-R1 SAFE PRODUCTION REMEDIATION — IMPLEMENTATION REPORT

> **Chain:** DOCUMENT_64 (P14 audit, authoritative defect baseline) → DOCUMENT_65 (this report).
> **Mode:** P14-R1 — SAFE REMEDIATION. Implement ONLY F1, F2, F6. No new methods, no new capabilities.
> **Headline:** **REMEDIATED_AND_VERIFIED** — three targeted additive migrations (V11/V12/V13) + one Flyway-enabled integration proof; 467/467 backend tests green; schema-constrained behavior verified against real PostgreSQL 16.

---

## 1. Final Summary

| Attribute | Value |
|---|---|
| Request | P14-R1 SAFE PRODUCTION REMEDIATION of DOCUMENT_64 findings |
| Approved scope | F2 (HIGH — consumption sub-schema missing from Flyway), F1 (HIGH — V7 `quantity > 0` CHECK vs P8 reversal negated rows), F6 (MEDIUM — `stock_ledger(doc_no, doc_type)` has no DB-level uniqueness) — ONLY |
| Not in scope | F3 (`BLOCKED_BY_BUSINESS_DECISION`, D-REV-01 pending), F4 (D-NUM-01 not implemented), F5, F7, LOW findings, maintenance/F15, P3.4, normalized-event redesign |
| Result | **REMEDIATED_AND_VERIFIED** |
| Evidence | New migrations apply clean V1→V13 on fresh PostgreSQL 16 (Testcontainer); 3 new integration tests prove F2/F1/F6 at the DB level; full backend suite 467/467, 0 failures; build green; frontend gates green |
| Working-tree additions | `V11__production_consumption_and_material_request_tables.sql`, `V12__production_entry_output_reversal_check.sql`, `V13__stock_ledger_doc_identity_unique.sql`, `ProductionSchemaFlywayIntegrationTest.java` |
| Git | HEAD unchanged `0781e1a30ca881614a7b573904caf6481adcbdc9`; staged **0**; Commit NO, Push NO — delivered as working-tree additions only |

---

## 2. Remediation Record

| # | Finding (DOCUMENT_64) | Severity | Resolution | Migration | Verified by |
|---|---|---|---|---|---|
| F2 | `prod_consumption` / `prod_consumption_line` (and same-root-cause upstream pair `prod_req_material` / `prod_req_material_line`) absent from ALL migrations — staging/prod (Flyway + `ddl-auto: validate`) fail boot | HIGH | Additive migration mirroring the committed JPA entities 1:1 | V11 | Clean-DB apply + F2 integration test (tables exist; ISSUE → reservation only; POST → exactly one physical OUT; onHand/reserved/available correct) |
| F1 | V7 `ck_production_entry_output_qty_positive CHECK (quantity > 0)` contradicts the approved P8 reversal representation (NEGATED rows) → reversals violate the schema on Flyway-managed DBs | HIGH | Swap to `quantity <> 0` (signed-row model; zero still rejected). Precedent: V9 batch-card `CHECK (quantity <> 0)` | V12 | F1 integration test (negated row persisted; zero-qty rejected; repeated reversal alternates sign; WIP unchanged) |
| F6 | `StockService` dedupe is check-then-insert (`existsByDocNoAndDocType`), no DB-level uniqueness on `stock_ledger(doc_no, doc_type)` — a race can double-post stock | MEDIUM | Pre-insert duplicate scan that STOPS loudly (`RAISE EXCEPTION`, never deletes) + `CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_ledger_doc_no_doc_type` | V13 | F6 integration test (index present; duplicate insert rejected) |

---

## 3. Environment & Build Info

| Attribute | Value |
|---|---|
| Backend | Spring Boot 4.1.0 / Java 25; `spring-boot-starter-flyway` + `flyway-database-postgresql` on classpath |
| Frontend | Vite PWA build (`npm run build`), TypeScript, vitest |
| Database under test | PostgreSQL 16-alpine (Testcontainer, `@ServiceConnection`) |
| Baseline migrations | Working-tree V1..V10 (`V1__baseline.sql` … `V10__production_quality_gate.sql`) — untouched by P14-R1 (historical migrations never edited) |
| Flyway profiles | default/dev: `spring.flyway.enabled=false` + `ddl-auto: update`; staging/prod: `flyway.enabled=true` + `ddl-auto: validate` + `baseline-on-start: true`/`baseline-version: 0` |

### 3.1 Migration-set disclosure (version-collision with historical HEAD files)

The **working tree** migration set (the deployment source) is a rewritten chain: `V1__baseline.sql` … `V10__production_quality_gate.sql` plus the new P14-R1 files. Git **HEAD** still carries a separate historical ERP set (`V1__init.sql` … `V70__performance_indexes.sql`), including tracked `V11__customer_fields.sql`, `V12__sample_customers.sql`, `V13__add_item_type_to_item_group.sql`. Those three tracked files are **deleted from the working tree** (pre-existing working-tree diff, untouched by P14-R1).

- The P14-R1 migrations reuse version numbers 11/12/13 within the **working-tree** chain. Verified: the working-tree V1→V13 set is version-unique and applies cleanly on a fresh database (test evidence in §8).
- **Risk disclosure (must stay visible in review):** if the historical tracked `V11/V12/V13` customer/misc files are ever restored into the working tree alongside the P14-R1 files, Flyway will reject duplicate versions. Migration roots must never mix the two sets. Deployments from the current working tree are unaffected.

---

## 4. F2 — Production Consumption sub-schema (V11)

- **Defect (verbatim reference):** DOCUMENT_64 F2 (HIGH). `prod_consumption`, `prod_consumption_line` (and, same root-cause, `prod_req_material`, `prod_req_material_line`) exist in the JPA model but in **no migration**. Staging/prod are Flyway-managed with `ddl-auto: validate` → boot failure once the P6 entities ship there.
- **Root cause (defect-side):** the P6 entities landed after the V1 baseline dump; with Flyway disabled in default/dev, their DDL only ever materialised via Hibernate auto-DDL. Verified exhaustively: exactly four production tables were missing from the migration set; every other production table already exists in V1..V10.
- **Resolution (implemented):** `V11__production_consumption_and_material_request_tables.sql` — additive only:
  - `prod_consumption` — BIGSERIAL PK; `consumption_no` UNIQUE (`uq_prod_consumption_consumption_no`); `job_card_id/_number`, `work_order_number`, `material_request_no`, `consumption_date`, `status`, `posted_at`, `remarks(500)`, `version`, audit columns — column-for-column JPA 1:1.
  - `prod_consumption_line` — FK `fk_prod_consumption_line_consumption` → `prod_consumption(id)`; `issued/consumed/return/scrap_qty NUMERIC(18,4)`; `batch_number(40)`, `uom(20)`, `location(60)`, `line_remarks(500)`; index `idx_prod_consumption_line_consumption`.
  - `prod_req_material` — 1:1 mirror of `ProdReqMaterial`; `req_no` UNIQUE (`uq_prod_req_material_req_no`).
  - `prod_req_material_line` — FK `fk_prod_req_material_line_request` → `prod_req_material(id)`; index `idx_prod_req_material_line_request`.
  - Safety: `CREATE TABLE IF NOT EXISTS`, no `DROP`/`TRUNCATE`/`DELETE`, no DDL on any existing table; pre-existing identical tables on partially-created databases remain untouched (idempotent reconcile).
- **Behavioral confirmations (P6 regression on the migrated schema):** MR ISSUE → exactly one `stock-allotment` reservation APPROVED + **zero** physical OUT rows (Effect.NONE); consumption POST → exactly **one** OUT row (`production-consumption`, 90/100 consumed), reservation released (allotment POSTED), `onHand = 10`, `available = 10`, FREE balance row = 10.
- **Schema impact:** 4 new tables + 2 FKs + 2 indexes + 2 unique constraints; nothing existing changed. **Data impact:** none. **Staging/prod impact:** `ddl-auto: validate` now agrees with the schema for the consumption module.
- **Completion status:** IMPLEMENTED_AND_VERIFIED.

---

## 5. F1 — Production Entry Output CHECK vs reversal negated rows (V12)

- **Defect (verbatim reference):** DOCUMENT_64 F1 (HIGH). V7 declares `ck_production_entry_output_qty_positive CHECK (quantity > 0)`; the `ProductionController` reverse action negates co-/by-product output quantities on the reversal entry → every reversal of an entry with additional outputs violates the schema once Flyway is enabled.
- **Root cause (defect-side):** V7 predates the approved signed-row reversal model (DOCUMENT_58 / P8). Dev/test never saw the failure: default profile disables Flyway and Hibernate-derived DDL emits no CHECK.
- **Resolution (implemented):** `V12__production_entry_output_reversal_check.sql` — drop `ck_production_entry_output_qty_positive` (guarded `IF EXISTS`) and add `ck_production_entry_output_qty_nonzero CHECK (quantity <> 0)`. This mirrors the V9 batch-card precedent exactly. Originals positive; reversal mirrors negative; zero still rejected. Non-destructive, constraint-only, no data DML.
- **Behavioral confirmations (P8 regression, DB-constrained):**
  - Reversal persists the negated output row (`quantity = -30`), read back from the Flyway-managed `production_entry_output`.
  - Repeated (re-reversal) alternates the sign to `+30` and persists cleanly.
  - Direct `INSERT` with `quantity = 0` rejected by the DB (`DataIntegrityViolationException`).
  - Migrated schema no longer has `ck_production_entry_output_qty_positive`; has `ck_production_entry_output_qty_nonzero` (`quantity <>`, not `quantity >`).
  - WIP unchanged: `prod_execution_session.wip = 0` before and after both reversals.
- **Schema impact:** one constraint replaced. **Data impact:** none (`> 0` satisfies `<> 0`). **Behavior deltas:** negative now allowed (matches P8 model); zero still rejected.
- **Completion status:** IMPLEMENTED_AND_VERIFIED.

---

## 6. F6 — stock_ledger (doc_no, doc_type) uniqueness (V13)

- **Defect (verbatim reference):** DOCUMENT_64 F6 (MEDIUM). `StockService.recordStockIn/recordStockOut` de-duplicate via `ledger.existsByDocNoAndDocType(...)` — check-then-insert with no DB uniqueness; `stock_ledger` has only a PK + non-unique `idx_ledger_doc` / `idx_ledger_item_loc`. Concurrent identical postings can double-post `_balance` + `_ledger`.
- **Root cause (defect-side):** uniqueness is application-`where`-enforced, not constraint-enforced; optimistic document-status guards reduce but do not close the movement-layer race.
- **Resolution (implemented):** `V13__stock_ledger_doc_identity_unique.sql`:
  1. `DO`-block pre-scan raising a loud `RAISE EXCEPTION` (duplicate groups + extra-row count) if any `(doc_no, doc_type)` pair repeats. **Stops loudly; never deletes** — satisfies the authorization's "detect, do not remove".
  2. `CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_ledger_doc_no_doc_type ON stock_ledger (doc_no, doc_type)`.
  - Matches the production movement keys: consumption `{consumptionNo}-{lineId}` / `production-consumption`, return `returnNumber` / `production-return`, conversion `{no}-OUT` / `{no}-IN`, job-card-complete `jobCardNumber`. NULLs stay distinct (PostgreSQL semantics); StockService always writes non-NULL keys. Consistent with the existing dedupe contract — legitimate flows unaffected (DocumentFacade generic post already inserts one row per document).
- **Behavioral confirmations:** index present in the migrated schema; two different docTypes under one docNo insert fine; a duplicate `(doc_no, doc_type)` rejected by the DB (`DataIntegrityViolationException`).
- **Schema impact:** one unique index added to `stock_ledger`. **Data impact:** pre-scan aborts if duplicates exist (none in migrated DB). **Safety/security:** no destructive operations; nullability unchanged.
- **Completion status:** IMPLEMENTED_AND_VERIFIED.

---

## 7. Migrations — Final Working-Tree Chain

| Version | File | Purpose | Source |
|---|---|---|---|
| V1 | `V1__baseline.sql` | Baseline dump | pre-existing |
| V2 | `V2__numbering_config_production_seed.sql` | Production numbering seeds | pre-existing |
| V3 | `V3__work_order_po_discriminator.sql` | WO/PO discriminator | pre-existing |
| V4 | `V4__prod_normalized_events.sql` | Normalized-event infra (P4/P5) | pre-existing |
| V5 | `V5__prod_backfill_infrastructure.sql` | Backfill infra | pre-existing |
| V6 | `V6__create_prod_operation_execution_event.sql` | P3.4 event table | pre-existing |
| V7 | `V7__production_entry_outputs.sql` | Entry outputs (+ positive CHECK — corrected by V12) | pre-existing |
| V8 | `V8__production_disposition_documents.sql` | Return/disposition docs | pre-existing |
| V9 | `V9__batch_card.sql` | Batch card (`CHECK quantity <> 0` precedent) | pre-existing |
| V10 | `V10__production_quality_gate.sql` | Quality gate | pre-existing |
| **V11** | `V11__production_consumption_and_material_request_tables.sql` | **P14-R1 F2** | **new** |
| **V12** | `V12__production_entry_output_reversal_check.sql` | **P14-R1 F1** | **new** |
| **V13** | `V13__stock_ledger_doc_identity_unique.sql` | **P14-R1 F6** | **new** |

Clean-DB application of V1→V13 verified (single `flyway_schema_history`, no version collisions, no errors) as part of the §8 Flyway test.

---

## 8. Tests

### 8.1 New — Flyway-enabled integration test (P14-R1 proof)

`src/test/java/in/zygertechnology/zygererp/migration/ProductionSchemaFlywayIntegrationTest.java` — boots the **full V1..V13 chain** on a real PostgreSQL 16 Testcontainer (`@SpringBootTest(properties={"spring.flyway.enabled=true","production.normalized-ops.enabled=true"})`, `@ActiveProfiles("test")`, `ddl-auto` stays `update`) — the only test class that runs with Flyway on.

| Test | Proves | Result |
|---|---|---|
| `flywayAppliesP6SubSchema_andConservationHolds` | V11 tables exist after Flyway (F2); ISSUE reserves with zero physical OUT; POST emits exactly one OUT; reservation released; onHand/reserved/available = 10/0→10 (P6 regression) | PASS |
| `reversalPersistsNegatedRowsUnderSchemaConstraint` | Reversal persists `quantity=-30` under V12 CHECK; zero-qty rejected; re-reversal persists `+30`; `ck_production_entry_output_qty_positive` gone / `ck_production_entry_output_qty_nonzero` present; WIP unchanged (F1 + P8 regression) | PASS |
| `stockLedgerDocIdentityUniqueRejectsDuplicates` | `uq_stock_ledger_doc_no_doc_type` exists; duplicate `(doc_no, doc_type)` rejected (F6) | PASS |

3/3 PASS.

### 8.2 Full backend suite

`./gradlew test` — **467 tests / 84 classes, 0 failures, 0 errors** (baseline 464 → +3 new). `./gradlew build` — SUCCESS.

### 8.3 Frontend gates

| Gate | Result |
|---|---|
| `npm run typecheck` (`tsc -b --pretty`) | 0 errors |
| `npm run build` (vite) | SUCCESS (PWA SW generated) |
| `npm run lint` | 797 problems (31 errors / 766 warnings) — **byte-identical to the documented baseline** (DOCUMENT_61 P11: 31/766); zero frontend files touched by P14-R1; no new errors |
| `npm test` (vitest) | 34/34 PASS across 5 files (P13 baseline) |

---

## 9. Schema, Data, Security, Performance Impact

- **Schema:** F2 = 4 new tables + 2 FKs + 2 indexes + 2 unique constraints; F1 = 1 CHECK replaced; F6 = 1 unique index added. No existing object altered by content change; no drops of production tables.
- **Data:** zero DML. Constraint swap `> 0` → `<> 0` cannot invalidate existing rows (all positive). F6 pre-scan aborts deployment if duplicates exist rather than changing data.
- **Security:** no new surface; changes are DB-level constraints consistent with existing application intent. No credentials/keys touched.
- **Performance:** one extra unique index on `stock_ledger(doc_no, doc_type)` — negligible insert cost, no query change; the existing `idx_ledger_doc` index is unchanged. F6 pre-scan is a single grouped scan on deploy only.
- **Risk & mitigations:** version-collision disclosure (§3.1) is the only residual deployment risk and is data-free/self-evident on the working tree; staging/prod already run Flyway, so V11–V13 will apply exactly as tested.

---

## 10. Not Implemented / Deferred (by authorization — no methods, no new capabilities)

| Item | Status | Reason |
|---|---|---|
| F3 (entry reversal / FG credit compensation, DOCUMENT_64 §34) | **BLOCKED_BY_BUSINESS_DECISION** | D-REV-01 pending; Authorization: do not choose compensate/leave/forbid. Left exactly as shipped |
| F4 (JCF/PLS/ITE numbering inconsistencies) | NOT IMPLEMENTED | D-NUM-01: do not implement numbering changes |
| F5 (WSM workability) | NOT IMPLEMENTED | Explicitly excluded from P14-R1 |
| F7 (Flyway disabled in dev profile) | NOT IMPLEMENTED | Explicitly excluded; dev deliberately keeps auto-DDL |
| F8–F14 (LOW) | NOT IMPLEMENTED | Explicitly excluded → future remediation round(s) |
| F15 / Maintenance handoff | NOT IMPLEMENTED | Explicitly excluded; handoff stays within DOCUMENT_64 |
| P3.4 / normalized-event redesign / new capabilities | NOT IMPLEMENTED | Outside SAFE REMEDIATION scope |

**Regression check:** the only behavior-level intended change is the F1 CHECK swap (negative rows now permitted, matching the approved P8 model); P6/P8/P10/P12/P13 motions verified unchanged by the full suite (467/467). No frontend behavior changed (0 FE files touched).

---

## 11. Git State

| Check | Value |
|---|---|
| HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged) |
| Staged | **0** (nothing staged) |
| Commit / Push | NO / NO (not performed, not requested) |
| P14-R1 additions | 3 migrations + 1 test file (untracked) + this document (untracked) |
| Working-tree status lines | 289 (baseline 285 + 4 P14-R1 additions) |
| History edited | none; no reset/stash/rebase/amend/clean |

---

## 12. Final Report (P14-R1, authorization format)

| Field | Value |
|---|---|
| F2 | HIGH — IMPLEMENTED_AND_VERIFIED — V11 additive migration; P6 conservation verified |
| F1 | HIGH — IMPLEMENTED_AND_VERIFIED — V12 CHECK `quantity <> 0`; reversal persistence + zero-rejection + WIP verified |
| F6 | MEDIUM — IMPLEMENTED_AND_VERIFIED — V13 loud-pre-scan + unique index; duplicate rejection verified |
| Migrations | V1..V13 working-tree chain; clean-DB apply verified; historical V11-V13 collision disclosed (§3.1) |
| Schema | 4 new tables, 2 FKs, 3 indexes, 3 unique/CHECK constraints; additive; no carries |
| Constraints | `ck_production_entry_output_qty_nonzero`, `uq_stock_ledger_doc_no_doc_type`, UQ consumption/req numbers |
| Indexes | `uq_stock_ledger_doc_no_doc_type` (+ existing V1 indexes unchanged) |
| Regressions | **0** (467/467 backend; 34/34 frontend; P6 & P8 explicitly re-proven on the migrated schema) |
| Tests | backend 467/467 (3 new Flyway-enabled); frontend 34/34 |
| Builds | backend `build` SUCCESS; frontend `typecheck` 0 errors + `build` SUCCESS |
| Lint | 31 errors / 766 warnings — identical to documented baseline; 0 frontend files touched |
| F3 | BLOCKED_BY_BUSINESS_DECISION (D-REV-01 pending; no compensated/leave/forbid choice made) |
| D-REV-01 | NOT DECIDED (pending business instruction) |
| F4 / D-NUM-01 | NOT IMPLEMENTED (per authorization) |
| F5 | NOT IMPLEMENTED (excluded) |
| F7 | NOT IMPLEMENTED (excluded) |
| Remaining HIGH | F3 — BLOCKED_BY_BUSINESS_DECISION |
| Remaining MEDIUM | F4 (numbering, D-NUM-01), F5 (WSM) |
| Remaining LOW | F8–F14 as documented in DOCUMENT_64 |
| Business decisions | D-REV-01 (entry/FG reversal policy) and D-NUM-01 (numbering) still open |
| Commit | **NO** |
| Push | **NO** |
| Staged | **0** |
| Document | `ProductionFRS/DOCUMENT_65_P14_R1_Safe_Remediation.md` (this file) |
| **Final status** | **REMEDIATED_AND_VERIFIED** |

---

## 13. Stop Condition

P14-R1 scope is complete and verified. Per the SAFE REMEDIATION contract, work **stops** here — no further fixing, no new capabilities, no methods change — until a new authorization is issued. NONE of F3, F4, F5, F7, LOW findings, or maintenance items were silently re-scoped or started.