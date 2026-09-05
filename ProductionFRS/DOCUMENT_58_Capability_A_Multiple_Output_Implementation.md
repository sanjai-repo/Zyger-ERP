# DOCUMENT_58 — CAPABILITY A — MULTIPLE-OUTPUT PRODUCTION ENTRY — IMPLEMENTATION CONTRACT

| Field | Value |
|---|---|
| Document ID | DOCUMENT_58 |
| Title | Capability A — Multiple-Output Production Entry: Implementation Authorization + Controlled Implementation |
| Module | Production (P8 — Capability A) |
| Authorization | P8 implementation authorization (owner, recorded 2026-09-05); approval-of-record `DOCUMENT_57` |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Staged (start) | 0 |
| Scope | **ONE capability only:** Multiple-Output Production Entry (FR-PROD-ENTRY-003, BK-013, DOC_45 §8, DOC_46) |
| Status | Implementation contract (created before coding; verification results appended) |

---

## 1. Existing Behavior (source-verified)

- AUTHORITATIVE transaction = `production_entry` row (entity `ProductionEntry`, table
  `production_entry`). Primary-output quantities are the four committed columns
  `good_quantity`, `rejected_quantity`, `rework_quantity`, `scrap_quantity` plus `part_code`
  (the item produced). Reconciliation rule (committed V-07): `good + rejected + rework + scrap <=
  process_qty` (verified in `ProductionEntryValidationService.validate`).
- `ProductionController` exposes `POST /api/v1/production/entries`,
  `PUT /api/v1/production/entries/{id}`, `DELETE .../{id}`,
  `POST .../{id}/actions/{action}` (submit/approve/**post**/reverse/…), plus `next-number` and
  reporting endpoints. Baseline HEAD / staged = 0; `@Transactional` per write action.
- POST finality (committed): a POSTED/REVERSED entry is never re-posted; `X-Idempotency-Key` is
  recorded in `posting_idempotency_key` for retry safety. POST adds good/rejected/rework/scrap to
  the matching `job_card_subjob`.
- REWORK REJECTION SCRAP : committed P3 projection (`ProductionNormalizedEventService`, flag
  `production.normalized-ops.enabled`) derives `prod_execution_session` /
  `prod_operation_event` / `prod_output_event` rows **in the same transaction** from the
  authoritative entry. Outputs are emitted per `(output_type, item_code, location)` natural key
  with output slots ACCEPTED / REJECTED / REWORK / SCRAP (item = `part_code`, location = `STORE`).
  The projection never calls `StockService` (P3-05), never fabricates input (RC-1), WIP =
  `max(resolvedInput − (good+rejected+rework+scrap), 0)` (P3-04), and is idempotent by DB UNIQUE
  (`uq_prod_output_event_key`).
- Reversal uses a negated mirror entry (`PE-REV` numbering) + compensating projection; the
  historical projection is preserved.
- Frontend `ProductionEntryScreen` (`zyger-erp-frontend/src/pages/production/production-entry/`)
  is a single-output form (header → route/process → stage quantity → summary grid → save draft /
  final post); good is auto-derived `process − rejected − rework`; backend re-validates.
- Security/validation conventions: `GlobalExceptionHandler` maps `IllegalArgumentException` →
  400 with message (no stack traces); controllers receive `Principal`, authorization is
  action-level `can('production', …)` at the UI and the shared `SecurityConfig`.
- No direct Inventory writes anywhere in the entry flow (P6 Model B-a preserved; MR ISSUE =
  reservation only, Consumption POST = release + single physical OUT — untouched).

## 2. Approved Business Decisions Relevant to Capability A (DOCUMENT_57 §4)

| Decision | Adopted rule applied here |
|---|---|
| ADR-PROD-001 | `production_entry*` remains authoritative; `prod_*` projection stays derived/idempotent; Capability A scope = **entries + outputs only**; additive, no cutover. |
| ADR-PROD-005 | NO direct `stock_ledger` / `stock_balance` writes; inventory integration boundary untouched (intents only when separately authorized — not this phase). |
| CLAR-PROD-002 | Quantity/WIP contract **unchanged**: `WIP = max(resolvedInput − (good+rejected+rework+scrap), 0)`; `produced = good + rework + rejected`; `pending = planned − completed`; over/under-production and excess-consumption rules unchanged. Co/by-product quantities are **additional outputs** outside the primary reconciliation (see §8). |
| CLAR-PROD-012 | Per-output quality gate is **deferred** (Capability B) — not implemented here. |
| CLAR-PROD-008 | Costing: Production records quantity only; Costing values. No value logic added. |
| CFL-PROD-012 | single-output default preserved; multiple output = additive optional rows. |

## 3. Current Limitation

A Production Entry can record only **one** output item (the primary `part_code`) with the four
committed stage quantities. A CNC operation that yields a **primary part + a co-part / swarf /
by-product** (BK-013; DOC_45 §8B) cannot be represented: no schema slot, no validation, no
projection output row, no screen entry for the additional item(s).

## 4. Target Behavior

1. A Production Entry (DRAFT, editable) may carry **zero or more additional outputs**, each
   classified CO_PRODUCT or BY_PRODUCT, with `item_code`, `location` (default STORE), `quantity`
   (> 0), optional `weight`, `uom`, `destination_stage_code`, `remarks`.
2. Additional outputs are **recorded facts only** — they are part of the entry (production
   history/audit/output events) and are **never** posted to inventory (Capability A has no
   inventory intent; ADR-005 boundary). The committed four primary stage quantities and the
   primary WIP/reconciliation contract are **unchanged**.
3. On POST: each additional output is validated once more and finalized with the entry. The
   normalized projection emits one `prod_output_event` row per additional output
   (`output_type` = CO_PRODUCT/BY_PRODUCT, item = additional item, location = its location) with
   the same natural-key idempotency as the committed outputs. Nothing exceeds the committed single
   stock deduction, and no double deduction is introduced (§9).
4. On reversal: a negated mirror of each additional output is carried into the reversal entry so
   the compensating projection fully offsets the original rows.
5. Frontend: the entry form exposes an **Additional Outputs** block with clear line handling,
   validation before submit, duplicate prevention, and busy/loading guard. Draft behavior and the
   `PE` numbering behavior are unchanged.

## 5. Exact API Changes

- **New fields on the existing Production Entry JSON** (create/update/get/list; reversal output):
  `additionalOutputs: [ { id?, outputType, itemCode, itemName?, uom?, location?, quantity, weight?, destinationStageCode?, remarks? } ]`.
- Endpoints: **none added, none removed, none renamed.** Existing `POST /api/v1/production/entries`,
  `PUT .../{id}`, `POST .../{id}/actions/{action}` accept the field; existing get/list return it.
- Read-only normalized projection endpoints unchanged. `prod_output_event` gains rows of type
  CO_PRODUCT/BY_PRODUCT for posted entries carrying additional outputs (flag-gated, same as today).

## 6. Exact UI Changes

- `ProductionEntryScreen.tsx`: new **"Additional Outputs (Co/By-Products)"** block between the
  Stage-Quantity area and the Transaction Summary grid.
  - Add-line button; per-line editable grid: Output Type (CO_PRODUCT / BY_PRODUCT), Item Code,
    Quantity (>0), Location (default STORE), Weight (optional ≥0), Destination Stage (optional),
    Remarks (optional); per-line delete.
  - Live client validation: required item code, quantity > 0, no duplicate
    `(outputType, itemCode, location)`; duplicates rejected inline before save/submit.
  - Existing save/post/print/download/busy behavior preserved; no new Print/Download controls;
    no localStorage; no unrelated redesign.

## 7. Persistence Changes (genuinely required)

V7 additive migration `V7__production_entry_outputs.sql` → new child table
`production_entry_output` (see §16). **Proof existing schema cannot safely support the capability**
(gate §16): `production_entry` has exactly one primary-output column set for `part_code`; the only
multi-output table (`prod_output_event`) is a **flag-gated derived projection**, not an
authoritative record — recording additional outputs only there would violate ADR-001 (authoritative
source-of-truth) and would silently vanish when the feature flag is OFF. No existing column, table,
or constraint can hold authoritative per-entry additional outputs → additive new child table is
required; no existing data is altered.

## 8. Validation Rules (backend, enforcement in `ProductionEntryValidationService`)

Applied on create, update, and post (all already funnel through the committed `validate()`):
1. `additionalOutputs` nullable / empty allowed (single-output behavior preserved).
2. Each row: `outputType` mandatory ∈ {CO_PRODUCT, BY_PRODUCT}; `itemCode` mandatory, non-blank,
   and must exist in `item_master` (`existsByCode`) — consistent with committed V-15 machine check
   and §14 "invalid item references".
3. `quantity` mandatory and `> 0`; no negative/zero additional-output quantity.
4. `location` mandatory (default `STORE`), non-blank.
5. `weight` optional; if present must be `>= 0`.
6. `uom` / `itemName` / `destinationStageCode` / `remarks` optional free text with length caps
   matching column lengths.
7. Duplicate prevention: at most one row per `(outputType, itemCode, location)` inside one entry
   (enforced in validation AND by DB UNIQUE `uq_production_entry_output_key` from the projection's
   natural key — mirrors committed `uq_prod_output_event_key`).
8. **Boundary (explicitly documented, not invented):** PRIMARY quantities continue to be bound by
   the committed V-07 contract (`good+rejected+rework+scrap ≤ process_qty`). Co/by-product quantity
   has **no authorized upper bound** — the approved CLAR-002 reconciliation contract governs the
   primary stage quantities only, and no approved decision binds co/by-product yield to the primary
   input. Imposing a ratio/cap would be a NEW business rule → NOT implemented, recorded as an
   open item (§8.3 STOP rule memo). Edge case covered: an entry may still not silently exceed the
   authoritative resolved input via the primary columns; additional outputs are additive facts.

## 9. Transaction Boundary

- Single `@Transactional` per entry mutation (unchanged). Save draft / update / post / reverse
  commit atomically with their child rows and the projection (P3-02). Additional outputs are
  inserted/deleted within the same transaction as the entry via the committed cascade pattern
  (`@OneToMany(orphanRemoval = true)`, `setAdditionalOutputs` rebind).
- No distributed transaction; no Inventory call from this capability (§9 of instruction = §4/§5
  here). If an additional output row fails validation, the WHOLE save/post is rejected — no
  partial entry.

## 10. Idempotency Strategy

- Draft save/update: children replaced by natural key in-place (the committed `setX(list)` clear +
  rebind pattern); repeated save of the same payload converges to one row per
  `(outputType, itemCode, location)` (validation + DB UNIQUE). 
- Post: committed finality guard (no re-post of POSTED/REVERSED) + `X-Idempotency-Key` →
  `posting_idempotency_key` (unchanged); projection upserts are natural-key idempotent. Additional
  output rows are inserted by the same projection path, so a duplicated request cannot double-emit.
- Browser refresh after POST / retry after timeout: covered by the existing idempotency-key guard;
  nothing new relies on frontend prevention.
- Regression awareness: F1 (conversion OUT/IN), F2 (per-line consumption OUT), F4 (entry re-post),
  H2/H2b (closed reservation/SCAR guards) — NONE of those code paths are touched by this change.

## 11. Concurrency Strategy

- Rely on the committed `@Version` optimistic lock on `ProductionEntry` and the existing
  transaction isolation; no new locks. Two simultaneous POSTs are serialized by the version row;
  the finality guard + idempotency key handle duplicate requests. Duplicate additional-output rows
  are prevented at the DB level by the UNIQUE constraint on the same transaction.

## 12. Quantity/WIP Impact

- **None to committed semantics.** WIP, produced, and pending formulas are unchanged and reference
  only the primary stage quantities (CLAR-002). Additional outputs do not feed WIP/pending/produced
  nor the subjob progress columns. This is the smallest safe interpretation of the approved
  contract and is recorded here so it is a conscious, documented boundary, not a silent decision.

## 13. Inventory Impact

- **None.** No `StockService`, `stock_ledger`, `stock_balance`, reservation, or availability call is
  added. P6 Model B-a invariant is preserved (MR ISSUE = reservation only; Consumption POST =
  release + exactly one physical OUT; unchanged). Co/by-product rows are recording-only intents per
  DOC_45 §8-N / §16.

## 14. Quality Impact

- **None.** No disposition, no inspection, no gate. Per-output inspection at the gate is Capability
  B (CLAR-012) — out of scope.

## 15. Audit Requirements

- Existing entry audit log events (`CREATE`, `DRAFT_SAVE`, `POST`, `REVERSE`, `CANCEL`) are kept.
- The additional-output rows carry `created_at` and are part of the entry's child set (auditable by
  entry id). `POST`/`REVERSE` payloads are not logged in body — existing pattern preserved.

## 16. Database Change (single additive migration)

`zyger-erp-backend/src/main/resources/db/migration/V7__production_entry_outputs.sql`:

```sql
CREATE TABLE production_entry_output (
    id                     BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    production_entry_id    BIGINT NOT NULL REFERENCES production_entry(id) ON DELETE CASCADE,
    output_type            VARCHAR(30) NOT NULL,
    item_code              VARCHAR(60) NOT NULL,
    item_name              VARCHAR(200),
    uom                    VARCHAR(20),
    location               VARCHAR(60) NOT NULL DEFAULT 'STORE',
    quantity               NUMERIC(18,4) NOT NULL,
    weight                 NUMERIC(14,4),
    destination_stage_code VARCHAR(60),
    remarks                VARCHAR(255),
    created_at             TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_production_entry_output_key UNIQUE (production_entry_id, output_type, item_code, location),
    CONSTRAINT ck_production_entry_output_qty_positive CHECK (quantity > 0)
);
CREATE INDEX idx_production_entry_output_entry ON production_entry_output(production_entry_id);
```

- Additive, forward-safe; no existing table/data/history is modified. `output_type`, `item_code`,
  `location` reuse the committed `prod_output_event` key shape so the derived projection replays
  without key mapping.

## 17. Test Plan

- Unit (validation/edge): valid multiple output; zero quantity; negative quantity; blank item;
  unknown item; unknown outputType; duplicate line; inconsistent entry (primary sum > process);
  unauthorized (security layer); repeated request.
- Integration (HTTP + Postgres Testcontainers): create-with-outputs; save draft; post with outputs;
  post idempotency (same idempotency key twice); projection emits additional output rows;
  transaction rollback (invalid additional output aborts whole create); reversal carries negated
  outputs; quantity reconciliation regression (WIP unchanged); regression of existing entry /
  material request / consumption / return / conversion / job card flows.
- Regression gate: backend `./gradlew test`; frontend `npm run typecheck` / `build` / `lint`
  (lint baseline 31 errors / 758 warnings — must not increase).

## 18. Explicit Out-of-Scope (do not implement)

- Batch Card, new Batch identity model, Quality Gate, new Rejection/Scrap workflow, Production
  Return redesign, Product Conversion redesign, Subjob cardinality redesign, Consumption History,
  new Costing architecture, P3.4 backfill, normalized-event redesign, Inventory redesign,
  Maintenance/Planning integration. No numbering change (`PE`/`PC` untouched). No inventory
  postings from additional outputs. No new endpoints, no SecurityConfig change, no
  localStorage use.

---

## STOP-RULE MEMO

§22 quantity-ownership/WIP stop check: The co/by-product **upper-bound** question (may an
additional output exceed/be unrelated to primary input?) is not covered by any approved decision —
the approved CLAR-002 contract governs the primary stage quantities. Per §8, the uncovered behavior
("arbitrary additional-output quantity") is **documented, not invented**: recording is implemented,
no cap is imposed, and a future business decision is flagged. No other stop conditions triggered
(no Inventory ownership, Quality authority, Batch identity, Return disposition, Costing policy, or
numbering change; P6 Model B-a untouched).

---

*End of DOCUMENT_58 — Capability A implementation contract. Verification results appended after the
full test gate and post-implementation audit.*

---

## 19. VERIFICATION RESULTS — 2026-09-05

### 19.1 Final Status
**IMPLEMENTED_AND_VERIFIED**

### 19.2 Implementation Delivered (source-verified)
| # | Artifact | Location |
|---|----------|----------|
| 1 | DB migration `V7__production_entry_outputs.sql` — table `production_entry_output` | `zyger-erp-backend/src/main/resources/db/migration/V7__production_entry_outputs.sql` |
| 2 | Entity `ProductionEntryOutput` (natural key via `uq_production_entry_output_key` UNIQUE) | `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/entity/ProductionEntryOutput.java` |
| 3 | `ProductionEntry.additionalOutputs` (`@OneToMany`, orphanRemoval) + rebinding setter | `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/entity/ProductionEntry.java` |
| 4 | Backend validation `validateAdditionalOutputs` (type/item/qty/weight/dup) | `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/ProductionEntryValidationService.java` |
| 5 | Projection `projectAdditionalOutputs` (POST + REVERSE, natural-key idempotent) | `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/ProductionNormalizedEventService.java` |
| 6 | Controller wiring create/update + negated reversal copies | `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/controller/ProductionController.java` |
| 7 | Frontend UI block "3A. Additional Outputs" + list badge + client validation | `zyger-erp-frontend/src/pages/production/production-entry/ProductionEntryScreen.tsx` |
| 8 | Spec-verified fix: self-destructive `setAdditionalOutputs(getAdditionalOutputs())` rebind (reassign new list) | same entity (item 3) |

### 19.3 Verification Performed
| Gate | Command | Result |
|------|---------|--------|
| Backend full test suite (Testcontainers Postgres) | `./gradlew test` | PASS |
| Frontend type check | `npm run typecheck` | PASS |
| Frontend build (incl. PWA `generateSW`) | `npm run build` | PASS |
| Frontend lint | `npm run lint` | PASS — 31 errors / 758 warnings, exactly the pre-existing baseline (no increase) |

### 19.4 Test Coverage (new, all passing)
*Unit — `ProductionEntryValidationServiceTest`*: valid outputs accepted; qty ≤ 0 rejected;
blank item rejected; unknown item (`existsByCode=false`) rejected; type outside
CO_PRODUCT/BY_PRODUCT rejected; duplicate (type,item,location) rejected; negative weight rejected.
*Unit — `ProductionNormalizedEventServiceTest`*: POST projects exactly 4 primary + 2 additional
rows (CO-1→CO_PRODUCT at STORE qty 30, SW-1→BY_PRODUCT at SWARD qty 5); WIP computed over
primary quantities only (unchanged, `2.0000`); REVERSE projects negated CO_PRODUCT row
(`−30.0000`); entry with no additional outputs still emits exactly 4 rows.
*Integration — `ProductionEntryMultipleOutputIntegrationTest`* (HTTP + Postgres, flag ON):
create persists+returns outputs; duplicate/zero-qty/unknown-item rejected with RFC-7807
`$detail` messages and **zero (0) `production_entry` rows persisted** for any rejected payload;
idempotent POST — same `X-Idempotency-Key` on repeat keeps `prod_output_event` row count at 4
(ACCEPTED 95, SCRAP 5, CO_PRODUCT 30, BY_PRODUCT 5) with `stock_ledger` count and `stock_balance`
count **byte-identical before vs after**; WIP `0`; reversal response carries `additionalOutputs`
with negated quantity `−30.0000`, original projection kept COMPLETED and compensating mirror
CANCELLED.

### 19.5 Post-Implementation Audit
| Check | Result |
|-------|--------|
| Production quantities/WIP/produced | UNCHANGED — CLAR-002 formula intact; additional outputs never enter WIP/pending/produced; WIP asserted `0` and `2.0000` per scenario |
| Inventory (ADR-005 / P6 Model B-a) | NO direct `stock_ledger`/`stock_balance` writes; zero stock postings verified; MR ISSUE / Consumption OUT flow untouched |
| Idempotency/regression (F1/F2/F4/H2/H2b) | no change to those paths; POST repeat key verified non-duplicating |
| Projection | ADDITIVE only (4→6 rows on POST with outputs); original 4-row contract preserved for entries without outputs |
| Reversal | compensating mirror carries fully negated additional outputs |
| Security | no SecurityConfig change (pre-existing actuator `health/**` edit is prior in-flight work, untouched) |
| Frontend | no new endpoints, no localStorage; list badge + client validation only |
| DB migration | single additive `V7_`; dev/test create schema from entities (`ddl-auto: update`); prod/staging Flyway + `validate` use it |
| Git safety | HEAD `0781e1a30ca881614a7b573904caf6481adcbdc9`, staged 0, no commit/stage/push/reset/stash/rebase/amend performed |

### 19.6 Remaining Caveats (documented, not invented)
1. **Co/by-product upper bound** remains an uncovered business question (see STOP-RULE MEMO §8/§22):
   recording is implemented with no cap on additional-output quantity vs process qty; a future
   approved decision may impose one. No stopping condition was violated.
2. The pre-existing `setX(getX())` rebind pattern used by the other child collections
   (`materials`, `operations`, `reasons`, `batchAllocations`) is left untouched (outside Capability A
   scope); only `setAdditionalOutputs` was hardened against self-clearing. No evidence this phase
   regressed existing behavior — full suite passes.

---

*End of DOCUMENT_58 — verification complete. Status: IMPLEMENTED_AND_VERIFIED (2026-09-05).*