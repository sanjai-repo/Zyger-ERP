# DOCUMENT 17 — PRODUCTION ARCHITECTURE DECISION RECORD

| Field | Value |
|---|---|
| Document ID | DOCUMENT_17 |
| Title | Production Architecture Decision Record |
| Status | **OPEN — AWAITING APPROVAL** (Phase 0 Architecture Decision Gate) |
| Technical baseline | DOCUMENT_16 (Production Technical Implementation Plan) |
| Functional baseline | DOCUMENTS 07–15 (Approved Production FRS v1.0) |
| Scope | D1…D5 architecture decisions — **analysis and decision ONLY, no code** |
| Target stack | React 19 + Vite · Spring Boot 4.1 / Java 25 / Gradle · PostgreSQL 16 |

> **Purpose.** This record formally **resolves and documents** the implementation decisions required to
> begin Production-module build-out, by cross-checking the existing Zyger codebase against the approved
> FRS (DOC 07–15). It preserves every approved FRS decision (DEC-PROD-001, TERM-PROD-001, DE-decisions),
> reuses existing infrastructure, avoids duplicate domain models, uses **additive, non-destructive
> migration**, and guarantees **zero data loss**. No application code, migration, table, or API is changed.

> **Gate outcome:** See **PART I** (Executive Decision Summary) and **FINAL GATE**. The recommended gate
> result is **B — APPROVED WITH PRE-CODING ACTIONS**, contingent on the single blocking decision (D1)
> and two primary approvals (D1, D2).

---

# PART I — EXECUTIVE DECISION SUMMARY

| ADR | Decision | Status / Approval | Blocking? |
|---|---|---|---|
| **ADR-PROD-001** (D1 — data model) | **ADOPT** the FRS normalized operation-event model as target over the existing wide-row `production_entry`, **with additive non-destructive migration**; `production_entry*` retained as legacy-compatibility (not deleted). | **AWAITING APPROVAL (Architect + DB Owner + Tech Lead)** | **YES (BLOCKING)** |
| **ADR-PROD-002** (D2 — Production Order terminology) | **One canonical Production Order domain model**; existing `work_order` becomes the implementation table for Production Order (option A), extended; **no duplicate source of truth**. | **AWAITING APPROVAL (Architect + Planning owner)** | **YES (BLOCKING)** |
| **ADR-PROD-003** (D3 — first-class document architecture) | Per-document REUSE/EXTEND/REFACTOR/CREATE NEW: Rejection/Scrap/Rework/Deviation/Stoppage/Consumption/Planning = CREATE NEW first-class docs; Entry/Conversion/Return/Idle/MREQ = EXTEND/align. | **AWAITING APPROVAL (Architect)** | No (after D1) |
| **ADR-PROD-004** (D4 — numbering) | **REUSE** `DocNumberService` + `doc_sequence` + `numbering_config`; register Production doc types; no new numbering engine. | **AWAITING APPROVAL (Architect)** | No |
| **ADR-PROD-005** (D5 — inventory posting) | **REUSE** controlled inventory engine (`StockService` + `stock_ledger` + `posting_idempotency_key`); Production never directly writes stock balances. | **AWAITING APPROVAL (Architect)** | No |

**Blocking decisions:** **D1** (data model) and **D2** (Production Order terminology) are the only blocking
decisions. D3–D5 are non-blocking approvals that follow D1/D2.

**Required approvals:** Decision approvers named per ADR below; the **final gate** must be signed by
Lead Architect + DB Owner + Tech Lead (frontend/backend) + QA lead.

**Recommended first implementation phase:** **P1 — Foundation & Shared Integration** (per DOC 15/16),
prepared in PART VII.

---

# PART II — ARCHITECTURE DECISION RECORDS (per-decision template)

Each ADR uses the required template:
ADR ID · Status · Context · Problem · Options Considered · Decision · Reason · Consequences ·
Migration Impact · Frontend Impact · Backend Impact · Database Impact · API Impact · Testing Impact ·
Rollback Plan · Approval Required.

---

# DECISION D1 — DATA MODEL (DEC-PROD-001)

## ADR-PROD-001

| Field | Value |
|---|---|
| **ADR ID** | ADR-PROD-001 |
| **Status** | **AWAITING APPROVAL — BLOCKING** |
| **Context** | FRS DEC-PROD-001 mandates a **hybrid architecture**: a final-part-centric user experience over **normalized operation-level execution events**, with **first-class traceable Rejection, Scrap and Rework events**, rolled-up aggregate views, and **no duplicate source of truth** (DOC 03/07/10/11/12/13/15/16). The existing system models production execution as a **wide/single-row** `production_entry` (columns for `good_quantity`, `rejected_quantity`, `scrap_quantity`, `rework_quantity`, `produced_quantity`, `process_qty`, etc.) with **5 child-event tables** (`production_entry_material`, `production_entry_operator`, `production_entry_rejection`, `production_entry_rework`, `production_entry_batch`) and a separate `production_entry_audit_log`. |
| **Problem** | The existing wide-row model (a) stores rejection/scrap/rework as **columns on a single row**, not as first-class independently-numbered and authorized documents (violating BR-PROD-REJ-001/BR-PROD-SCRAP-001); (b) has **no normalized operation-event axis** for material/machine/manpower per operation (needed for WIP/OEE/costing per DOC 03 §8 / DOC 12); (c) risks becoming a **second source of truth** if the FRS `prod_*` model is built alongside it. |
| **Options Considered** | **O1 — RETIRE**: delete `production_entry*` and build only `prod_*`. *Rejected:* destructive migration violates rules 15–16 (no destructive migration, no data loss). **O2 — PARALLEL DUAL (no mapping)**: keep `production_entry*` as-is AND build `prod_*` with no relation. *Rejected:* creates **duplicate source of truth**, violates DEC-PROD-001 and rules 14/18. **O3 — ADDITIVE MIGRATION (recommended)**: build normalized `prod_operation_event`/`prod_execution_session`/`prod_output_event`/`prod_rejection`/`prod_scrap`/`prod_rework_event` as **new target tables**; keep `production_entry*` as a **legacy/compatibility structure** that maps into the new event model; data migration is additive + reversible. |
| **Decision** | **`ADOPT` — ADDITIVE MIGRATION.** The normalized operation-event model becomes the **authoritative source of truth** (target architecture). Existing `production_entry*` tables are **retained** as legacy/compatibility structures, **not deleted**, and are mapped/backfilled into the new events. No destructive migration; zero data loss. |
| **Reason** | Satisfies DEC-PROD-001 (final-part UI + normalized op-events + first-class Rej/Scrap/Rework); satisfies BR authorization (first-class docs); gives a **single source of truth** (the normalized events) while the legacy tables provide read-compatibility; preserves existing production historical data and open transactions; reuses existing infra (idempotency, audit). |
| **Consequences** | (+ ) Correct FRS architecture, traceability, OEE/WIP/costing inputs. (−) Two model families temporarily coexist (mitigated by explicit legacy→event mapping, no dual-write source-of-truth ambiguity: events are authoritative). (+) Existing production data retained. |
| **Migration Impact** | Additive Flyway migrations introduce new `prod_*` tables + a one-time backfill (INSERT ... SELECT) from `production_entry*` into normalized events; the backfill is **reversible** and idempotent (uses `posting_idempotency_key`-style guard). No table drop. |
| **Frontend Impact** | `ProductionEntryScreen` is **REFACTORED** to the final-part-centric workspace that writes normalized op-events via a service layer (`useProduction.ts`); legacy read endpoints still feed existing dashboards during transition. |
| **Backend Impact** | Refactor `ProductionController` → thin controllers + `ProductionEntryService` (op-event engine), `RejectionService`, `ScrapService`, `ReworkService`; business logic exits the controller layer (DOC 10/13 layering). |
| **Database Impact** | New tables: `prod_operation_event`, `prod_execution_session`, `prod_output_event`, `prod_log_entry`, `prod_rejection(_line)`, `prod_scrap(_line)`, `prod_rework_event`. Legacy `production_entry*` unchanged (retained). |
| **API Impact** | Keep `API-ENTRY-*` legacy-compatible during transition; add/register op-event + first-class Rej/Scrap/Rework endpoints per DOC 13. No existing API is removed in phase 0. |
| **Testing Impact** | New test cases (DOC 14 TC-*) for op-events, QTY-RECONCILE, first-class Rej/Scrap authorization, backfill idempotency; regression on legacy read path. |
| **Rollback Plan** | Feature-flag the new event writer; keep legacy writer active. Revert = turn off flag; no schema drop; backfill is idempotent and can be re-run. |
| **Approval Required** | Lead Architect + DB Owner + Tech Lead. |

## A–K detail (D1)

| Item | Decision |
|---|---|
| **A. Tables that remain** | `production_entry`, `production_entry_material`, `production_entry_operator`, `production_entry_rejection`, `production_entry_rework`, `production_entry_batch`, `production_entry_audit_log` — **retained as legacy/compatibility structures** (read-only / transition). |
| **B. Tables to extend** | `job_card`, `job_card_subjob` (align to `prod_job_card`/`prod_subjob`); `idle_time_entry` (align `prod_idle`); `product_conversion*` (align `prod_conversion*`); retained-use masters (`work_order`, etc.). |
| **C. Tables become legacy/compatibility** | The `production_entry*` family becomes legacy/compatibility; they remain readable for history + dashboards but are **no longer the authoritative write model** once the event model is live. |
| **D. New `prod_*` tables required** | `prod_operation_event`, `prod_execution_session`, `prod_output_event`, `prod_log_entry`, `prod_rejection`, `prod_rejection_line`, `prod_scrap`, `prod_scrap_line`, `prod_rework_event` (plus `prod_order*`, `prod_req_*`, `prod_consumption_event`, `prod_idle`, `prod_stoppage`, `prod_deviation*`, `prod_delay_customer`, `prod_nconf`, `prod_conversion*`, `prod_item_change`, `prod_disassembly*`, `prod_plan_*` — per DOC 12/15/16). |
| **E. Authoritative source of truth** | **`prod_operation_event` (+ `prod_execution_session`) are the authoritative execution source.** Production Entry UI writes to these. Aggregates are **derived** (roll-up views), never a stored duplicate. |
| **F. Roll-up quantity calculation** | Roll-ups are **computed views**, not stored: `Accepted = Σ output_event.qty`; `Rejection = Σ prod_rejection.qty`; `Scrap = Σ prod_scrap.qty`; `Rework = Σ prod_rework_event.qty`; reconciliation `Processed = Accepted + Rejection + Rework + Scrap` per **QTY-RECONCILE** (DOC 10 decision function). Derived views (WIP/pending/capacity/OEE) per DOC 12 §views. |
| **G. Migration/backfill of existing `production_entry` data** | One-time additive **INSERT…SELECT** backfill: each `production_entry` row (+ its material/operator/rejection/rework/batch children) maps to normalized `prod_operation_event`/`prod_execution_session`/`prod_output_event` and first-class `prod_rejection`/`prod_scrap`/`prod_rework_event` rows. Documented field map: wide-row columns → event attributes; child rows → op-level records. Idempotent via `posting_idempotency_key`. |
| **H. Backward compatibility** | Legacy tables remain and existing read APIs (`GET /api/v1/production/entries`, etc.) continue to serve dashboards/history during transition. Existing `StockService.recordStockIn/Out` postings (already wired in `ProductionController`, 6 sites) remain intact. |
| **I. Existing APIs remain temporarily compatible** | **YES.** Existing `/api/v1/production/**` endpoints stay functional during P1–P4 transition; new op-event endpoints are additive. Removal of legacy write path only after migration sign-off. |
| **J. Rollback handling** | Feature-flagged writer; revert = disable flag, no schema drop; backfill idempotent & re-runnable; legacy writer retained until new writer proven. |
| **K. Zero-data-loss guarantee** | No table dropped; backfill uses idempotency keys; source tables retained post-backfill; integrity validated by reconciliation (QTY-RECONCILE) comparing sum(new events) vs sum(old rows); audit trail retained. |

**Final D1 decision:** **`ADOPT` — ADDITIVE MIGRATION** (recommended, per prompt). Status: **AWAITING APPROVAL — BLOCKING.**

---

# DECISION D2 — PRODUCTION ORDER TERMINOLOGY

## ADR-PROD-002

| Field | Value |
|---|---|
| **ADR ID** | ADR-PROD-002 |
| **Status** | **AWAITING APPROVAL — BLOCKING** |
| **Context** | FRS TERM-PROD-001 + DOC 07 §02 distinguish **Production Order (planning/authorization)** from **Work Order (execution-level instance under a PO)**. The existing system has `work_order` (rich planning doc with `doc_no`, `status`, `source_doc_no`, `sales_order_no`, `bom_id`, `balance_qty`, `actual_start/end_date`, approval/submit/close/reopen lifecycle) plus `job_order`, `job_order_item`, `job_order_schedule`, and `production_entry.work_order_number` (string ref). The terms `work_order` / `production_order` / `prod_order` / composite / single / rework production order coexist across the FRS. |
| **Problem** | Risk of **duplicate concepts/sources of truth** if `work_order`, `production_order`, and `prod_order` are all built as independent models. Must reconcile composite/single/rework production order into one canonical domain model. |
| **Options Considered** | **O1 — `work_order` becomes the Production Order implementation table (recommended)**: treat existing `work_order` as the canonical Production Order table; `prod_order*` conceptual terms map onto it; execution instances (Work Order at execution level) map via `production_entry.work_order_number` and job-card. **O2 — New `prod_order` model + migrate `work_order`**: build fresh `prod_order*` tables and migrate `work_order` rows into them (more work, higher risk). **O3 — Dual independent**: *Rejected* — two sources of truth. |
| **Decision** | **`ADOPT` O1 — One canonical Production Order domain model**, with the existing **`work_order` table as the implementation table** (option A from the prompt). Extend `work_order` with any missing Production-Order attributes; do **not** create an independent `prod_order` as a second source of truth. Composite/rework/single Production Orders are **represented as typed Production Orders on the same table** (a `documentType`/`orderType` discriminator), not as separate tables. |
| **Reason** | Reuses a complete, production-quality existing lifecycle (submit/approve/reopen/close, `doc_no`, status, BOM/reference, balance qty); honors TERM-PROD-001 (PO = planning/authorization; execution = Work Order/Job Card level); avoids a second source of truth; least migration risk. |
| **Consequences** | (+) Single canonical model, clean terminology. (−) Requires a documented mapping of FRS `prod_order*` fields onto `work_order`; naming in UI/API uses canonical "Production Order" while the physical table stays `work_order`. |
| **Migration Impact** | ADDITIVE: extend `work_order` with Production-Order discriminator + any missing fields (composite/rework/single flags, PO-relevant columns). No table drop. The optional `prod_order*` tables in DOC 12 are **not created as a parallel model**; only the mapping layer is added. |
| **Frontend Impact** | Navigation/labels use **"Production Order"** (canonical term, per DOC 08 SCR-PROD-ORDER and TERM-PROD-001). Existing `work-order` planning screen is relabelled/extended to render PO + composite + rework + short-close variants. |
| **Backend Impact** | `ProductionOrderService` operates on `work_order` as the PO table; a thin mapping translates FRS PO concept to `WorkOrder` entity; execution-level Work Order/Job Card follows TERM-PROD-001. |
| **Database Impact** | EXTEND `work_order` (add order-type discriminator + any missing PO columns). `job_order*` retained/reused for job/execution. No new independent PO table. |
| **API Impact** | API terminology uses "production order" (canonical). Existing `/api/v1/planning/work-order` endpoints remain; production-order-specific endpoints map onto the same controller/service resource. No API removed. |
| **Testing Impact** | Tests verify single/composite/rework/short-close all realized on the canonical PO model without duplication; TERM-PROD-001 traceability. |
| **Rollback Plan** | Additive discriminator column is backward-compatible; reverted by ignoring it. No data movement. |
| **Approval Required** | Lead Architect + Planning/Production owner. |

**Final D2 decision:** **`ADOPT` O1** — canonical Production Order on existing `work_order` table. Status: **AWAITING APPROVAL — BLOCKING.**

---

# DECISION D3 — FIRST-CLASS DOCUMENT ARCHITECTURE

## ADR-PROD-003

| Field | Value |
|---|---|
| **ADR ID** | ADR-PROD-003 |
| **Status** | **AWAITING APPROVAL** (non-blocking; follows D1) |
| **Context** | FRS defines a set of Production documents (Production Entry, Rejection, Scrap, Rework, Material Request, Material Consumption, Idle Time, Stoppage, Production Return, Conversion, Item Conversion, Item Change, Disassembly, Deviation, Delay to Customer, Non-Conformity) each with specific BR/workflow/fields (DOC 08/09/10/11/12/13). The existing system models several of these as child-rows or sub-features of the wide `production_entry`. |
| **Problem** | Must decide for each document whether to REUSE, EXTEND, REFACTOR, or CREATE NEW, avoiding duplicate functionality and duplicate models. |
| **Options Considered** | Per document: reuse existing table if FRS-consistent; extend if close; create new first-class doc if it must be independently numbered/authorized (Rejection/Scrap/Rework/Deviation/Stoppage/NC); refactor if existing is monolith but salvageable. |
| **Decision** | **`ADOPT` the per-document disposition table below.** First-class, independently-numbered, authorized documents (Rejection, Scrap, Rework, Deviation, Delay-to-Customer, Non-Conformity, Line Stoppage, Material Consumption, Material Request as first-class docs) are **CREATE NEW** (new `prod_*` tables sourced from existing child data via additive backfill). Documents that are functionally parallel to existing tables (Production Entry, Conversion, Production Return, Idle Time, Material Request) are **EXTEND** (align to FRS fields) or **REFACTOR** (extract from monolith). No existing functionality is duplicated. |
| **Reason** | Satisfies BR-PROD-REJ-001/SCRAP-001 (first-class authorization, own numbering, own lifecycle) and DEC-PROD-001; reuses existing masters/reason tables; additive & non-destructive. |

## D3 disposition register

| Document (FRS) | Existing counterpart | Decision | Required change |
|---|---|---|---|
| Production Entry | `production_entry` + children | **REFACTOR → EXTEND/repurpose** | Extract to op-event engine (D1); final-part UI |
| Rejection | `production_entry_rejection` (child) | **CREATE NEW** (`prod_rejection(_line)`) | First-class numbered/authorized doc; backfill child rows |
| Scrap | (columns `scrap_quantity`, child `material.scrap_qty`) | **CREATE NEW** (`prod_scrap(_line)`) | First-class doc; backfill |
| Rework | `production_entry_rework` (child) | **CREATE NEW** (`prod_rework_event`) | First-class doc; backfill |
| Material Request | `stock_issue_request`, `rm_issue` (adjacent) | **CREATE NEW** (`prod_req_material/_addl/_other`) | Production-specific request docs via StockService issue |
| Material Consumption | `production_entry_material` (child) | **CREATE NEW** (`prod_consumption_event`) + EXTEND `prod_consumable_consumption` | Ops-level consumption |
| Idle Time | `idle_time_entry` | **EXTEND** (→ `prod_idle`) | Align fields; reuse `idle_reason_master` |
| Line Stoppage | (none) | **CREATE NEW** (`prod_stoppage`) | Align maintenance hand-off (INT-GAP-004) |
| Production Return | `production_return` | **EXTEND** | Align to FRS; reuse StockService |
| Conversion | `product_conversion*` | **EXTEND/REFACTOR** | Align to FRS conversion (valuation by Costing; qty/loss only per CLAR-PROD-008) |
| Item Conversion / Item Change | (none) | **CREATE NEW** (`prod_item_change`) | New doc |
| Disassembly | (none) | **CREATE NEW** (`prod_disassembly(_line)`) | DISASM-RECONCILE |
| Deviation | (none) | **CREATE NEW** (`prod_deviation(_line)`) | New doc |
| Delay to Customer | (none) | **CREATE NEW** (`prod_delay_customer`) | New doc |
| Non-Conformity | `quality_ncr` | **CREATE NEW** (`prod_nconf`) + EXTEND quality rail | NC as first-class; hand-off to Quality |
| Planning Layer | `machine_load_plan`, `material_plan` | **CREATE NEW** (`prod_plan_*`) | Phase P8 |

**Consequences / Migration / FE / BE / DB / API / Testing / Rollback / Approval:** Each "CREATE NEW" is
additive (new `prod_*` table + backfill from existing child rows), feature-flagged, reversible, zero-loss.
Frontend gains new screens (`rejection/`, `scrap/`, `rework/`, `stoppage/`, `deviation/`, `disassembly/`,
`material-request/`, `material-consumption/`). Backend gains thin controllers + first-class services.
APIs additive (API-REJ-*/API-SCRAP-* and others per DOC 13). Testing: DOC 14 TC-12/13 for Rej/Scrap
authorization + others. Rollback: disable new-writer flags; no drops. Approval: Lead Architect.

**Final D3 decision:** **`ADOPT`** per-disposition register. Status: **AWAITING APPROVAL.**

---

# DECISION D4 — NUMBERING

## ADR-PROD-004

| Field | Value |
|---|---|
| **ADR ID** | ADR-PROD-004 |
| **Status** | **AWAITING APPROVAL** (non-blocking) |
| **Context** | FRS numbering rule (DOC 07 §21 NUM-PROD-*; NUM-PROD-REJ `REJ-{PLANT}-{FY}-{SEQ}`; DOC 12 `num_reservation`): server-side, concurrency-safe, permanent reservation on Draft/Submit, **never reused**. The existing system provides `DocNumberService` (`next`, `peek`, `allocate`, `nextFy(prefix)`, `nextNumberFromConfig(docType, plantId)`) backed by `doc_sequence` + `numbering_config`. |
| **Problem** | Verify the existing numbering engine satisfies all Production document types and avoid building a parallel engine. |
| **Options Considered** | **O1 — REUSE (recommended)**: register all Production doc types in `DocNumberService`/`numbering_config`; physical DOC 12 `num_reservation` maps conceptually onto existing reservation via `doc_sequence`/`allocate`. **O2 — New engine**: unnecessary duplication. |
| **Decision** | **`ADOPT` O1 — REUSE** `DocNumberService` + `doc_sequence` + `numbering_config` for ALL Production document numbering, including first-class Rejection/Scrap/Rework and `REJ-{PLANT}-{FY}-{SEQ}`. Add Production doc-type registration; no new numbering engine. |
| **Reason** | Engine is already server-side, concurrency-safe, FY-aware, plant-aware (`nextNumberFromConfig`), and reserve-not-reuse; matches FRS rule; reusing avoids duplicate architecture. |
| **Consequences** | (+) Consistent, FRS-compliant numbering; (−) must add Production doc-type configuration/catalog in `numbering_config` seeds (P1). |
| **Migration Impact** | Data/config-only (insert numbering_config rows for PO/JC/Entry/Rej/Scrap/Rework/Conversion/Deviation/Stoppage/Return/Disassembly/Idle). No schema change. |
| **Frontend Impact** | None functional; numbers remain server-assigned (frontend never generates). |
| **Backend Impact** | Register Production doc-types with `DocNumberService`; use `nextNumberFromConfig(docType, plantId)` for plant-scoped numbering. |
| **Database Impact** | Seed `numbering_config` (additive). `doc_sequence`/`numbering_config` reused; DOC 12 `num_reservation` name mapped to existing reservation, no new table. |
| **API Impact** | Existing next-number pattern reused; no new API. |
| **Testing Impact** | Test number reservation persists across refresh; never reused (DOC 14 TC-19 numbering continuity). |
| **Rollback Plan** | Adding config rows is reversible/adjustable; no code path removed. |
| **Approval Required** | Lead Architect. |

**Final D4 decision:** **`ADOPT` O1 — REUSE.** Status: **AWAITING APPROVAL.**

---

# DECISION D5 — INVENTORY POSTING

## ADR-PROD-005

| Field | Value |
|---|---|
| **ADR ID** | ADR-PROD-005 |
| **Status** | **AWAITING APPROVAL** (non-blocking) |
| **Context** | FRS inventory-integrity rule (DOC 10 BR-PROD-INV-*, DOC 12 §13, DEC-PROD-003, DOC 15 Phase P5, DOC 16 §10#2): Production must **never directly write stock balances**. Mandatory flow: Production Domain Event → Inventory Integration Service → Validated Posting Command → Stock Ledger → Derived Stock Balance. The existing system provides exactly this: `StockService.recordStockIn/Out/Adjustment/releaseQcHold/disposeHeldStock/verifyStockAvailability` backed by `stock_balance` + `stock_ledger` + `posting_idempotency_key`. **`ProductionController` already invokes `stockService.recordStockIn/Out` at 6 sites** — the chain is partially wired. |
| **Problem** | Confirm Production uses the controlled engine, and that idempotency, reversal, audit, transaction boundary, failure handling, and retry safety hold for all new Production inventory movements. |
| **Options Considered** | **O1 — REUSE (recommended)**: all Production movements route through `StockService`; no direct balance writes. **O2 — Direct updates**: *Rejected* (violates FRS + data integrity). |
| **Decision** | **`ADOPT` O1 — REUSE** the existing controlled inventory engine. All Production issues, receipts and returns call `StockService` (via an `InventoryIntegrationService` in the Production module); **no `UPDATE stock_balance` from Production code**. |
| **Reason** | Aligns fully with FRS; prevents orphan ledger/balance drift; already partially implemented (6 call sites) — minimal new work, maximum correctness. |

## D5 detail — idempotency / reversal / audit / tx-boundary / failure / retry

| Aspect | Confirmation / mechanism |
|---|---|
| **Idempotency** | `posting_idempotency_key` + `@Idempotent`/`IdempotencyAspect` reuse — duplicate posting rejected. |
| **Reversal** | Reversal via a documented reverse posting (negated movement) through `StockService` (recordStockOut for a stock-in, etc.); reversal restricted per BR (e.g. no Rej/Scrap reversal post-capitalization per BR-PROD-SCRAP-001). |
| **Audit trail** | Every posting writes `stock_ledger` (immutable ledger) + Production audit (audit_logs/`prod_document_audit`-mapped) via `AuditEntityListener`; full traceability. |
| **Transaction boundary** | Production service `@Transactional` spans the Production event + inventory posting so both commit together or roll back together (atomicity). |
| **Failure handling** | Posting failure rolls back the whole Production transaction; `GlobalExceptionHandler` returns a clear business error; partial writes impossible (single tx). |
| **Retry safety** | Idempotency key makes retries safe (no duplicate ledger entries); retry path reuses the same key. |

**Consequences:** (+) FRS-compliant, safe inventory; (−) New Production services must consistently route through StockService (enforced by code-review rule DOC 16 §10#2). 

**Migration Impact:** None (engine exists). **Frontend Impact:** None. **Backend Impact:** Add `InventoryIntegrationService` wrapper (thin) reusing `StockService`; no direct balance ops. **Database Impact:** None (reuse `stock_balance`/`stock_ledger`/`posting_idempotency_key`). **API Impact:** None new. **Testing Impact:** Verify inventory-integrity: no Production path writes `stock_balance` directly (static analysis + integration). **Rollback Plan:** Feature-flag new-production-posting; rollback keeps legacy StockService path. **Approval Required:** Lead Architect.

**Final D5 decision:** **`ADOPT` O1 — REUSE.** Status: **AWAITING APPROVAL.**

---

# PART III — EXISTING-TO-TARGET ARCHITECTURE COMPARISON

| Concern | Existing | Target (after ADRs) |
|---|---|---|
| Production execution model | Wide-row `production_entry` + child rows | Normalized `prod_operation_event`/session + first-class Rej/Scrap/Rework (ADR-001) |
| Source of truth | `production_entry` (+ children) | Normalized events (derived aggregates) |
| Production Order | `work_order` + `job_order` | Canonical Production Order on `work_order` (ADR-002) |
| Rejection/Scrap/Rework | columns + child rows | First-class documents (ADR-003) |
| Numbering | `DocNumberService`/`doc_sequence`/`numbering_config` | Reused + registered (ADR-004) |
| Inventory | `StockService`/`stock_ledger`/`posting_idempotency_key` | Reused (ADR-005), no direct writes |
| Controllers | thick (business logic) | thin + services (DOC 10/13 layering) |
| Frontend production | direct apiClient, monolith screens | service/hooks/types layer + refactored final-part screen (DOC 16 Part 7) |

---

# PART IV — TABLE MIGRATION STRATEGY

| Category | Tables | Action |
|---|---|---|
| RETAIN (legacy/compat) | `production_entry`, `production_entry_material`, `production_entry_operator`, `production_entry_rejection`, `production_entry_rework`, `production_entry_batch`, `production_entry_audit_log` | **Retain; not deleted.** Become legacy/compat (ADR-001). |
| EXTEND | `job_card`, `job_card_subjob`, `idle_time_entry`, `product_conversion*`, `production_return`, `production_log_sheet`, `work_order` (PO discriminator), `oee_daily`, `machine_load_plan` | Add additive columns/discriminators; no drops (ADR-002/003). |
| REUSE (no change) | `stock_balance`, `stock_ledger`, `posting_idempotency_key`, `doc_sequence`, `numbering_config`, `doc_status_history`, masters (`item_master`, `machine_master`, `work_center`, `operation_master`, `route_sheet*`, `production_bom*`, `store_master`/`rack_master`/`bin_master`), `quality_ncr`, reason masters | Used as-is / wired (ADR-004/005). |
| CREATE NEW (`prod_*`) | `prod_operation_event`, `prod_execution_session`, `prod_output_event`, `prod_log_entry`, `prod_rejection(_line)`, `prod_scrap(_line)`, `prod_rework_event`, `prod_req_material(_line)`, `prod_req_addl(_line)`, `prod_req_other(_line)`, `prod_consumption_event`, `prod_consumable_consumption`, `prod_stoppage`, `prod_deviation(_line)`, `prod_delay_customer`, `prod_nconf`, `prod_item_change`, `prod_disassembly(_line)`, `prod_plan_*` | Additive Flyway V2+ (ADR-001/003). `prod_order*` NOT created as parallel model (ADR-002). |

**Migration principle:** additive only; each new table via forward migration; backfill idempotent; no
DROP/destructive ALTER in the migration set.

---

# PART V — API COMPATIBILITY STRATEGY

- **No existing API is removed during the transition.**
- Existing `/api/v1/production/**` and `/api/v1/planning/work-order` remain live and backward-compatible.
- New First-class document endpoints (`/api/v1/production/rejections`, `/scraps`, `/rework`, `/stoppages`,
  `/deviations`, `/disassemblies`, `/material-requests`, `/consumption`, `/conversions`, `/item-change`,
  `/outputs`, `/log-sheets`) are **additive**, per DOC 13.
- Deprecated legacy write path (production_entry direct writes) is removed **only after** migration
  sign-off and a deprecation window; reads remain for history.
- All responses use `ApiEnvelope` + DOC 13 pagination; 409 optimistic locking preserved.

---

# PART VI — DATA MIGRATION STRATEGY

- **One-time additive backfill** from `production_entry*` into normalized `prod_*` events and first-class
  docs, executed as an idempotent Flyway data migration (guarded by `posting_idempotency_key`).
- Field map is explicitly documented (wide-row columns → event attributes; child rows → op records).
- Rejection/scrap/rework child rows → first-class documents with generated numbers via `DocNumberService`
  (ADR-004).
- `work_order` rows already exist; Production-Order discriminator backfilled from existing type/status
  (ADR-002).
- Backfill is reversible: source tables retained; migration can be re-run idempotently.

---

# PART VII — ROLLBACK STRATEGY

- **Feature flags** gate the new event writer and new-first-class-doc writer independently.
- Rollback = disable flags; existing writer + legacy tables remain functional; no schema drop.
- Backfill is idempotent and re-runnable; no destructive ALTER.
- Each phase (P1–P10) has a documented reverse migration (drop only the new table if fully rolled back).
- Inventory postings remain on `StockService` in both states (ADR-005) — no corruption on rollback.

---

# PART VIII — ZERO-DATA-LOSS STRATEGY

1. No source table is dropped (legacy retained).
2. Backfill is idempotent (idempotency key), so re-runs never duplicate.
3. Reconciliation (QTY-RECONCILE) verifies Σ(new events) == Σ(old rows) post-backfill.
4. `stock_ledger` is immutable and preserved; `posting_idempotency_key` prevents duplicate postings.
5. Audit tables (`production_entry_audit_log`, `audit_logs`, `doc_status_history`) retained.
6. Rollback never deletes data; it only disables new writers.

---

# PART IX — RISKS AND MITIGATIONS

| Risk | Sev | Mitigation |
|---|---|---|
| D1 conflict: wide-row vs normalized model mis-migrated | High | Additive backfill + reconciliation QTY-RECONCILE; dual-mode read; sign-off gate |
| `ProductionController` refactor breaks existing production | High | Incremental (P4), feature-flagged, regression tests; thin-controller extraction per endpoint |
| Duplicate source of truth (production_entry vs events) during transition | Med | Events are authoritative; legacy read-only; explicit mapping; no dual write |
| Frontend monolith screens / missing service layer | Med | Introduce `production-api.ts`+`useProduction.ts`+types first (P1); refactor incrementally |
| Numbering collisions for first-class docs | Med | Reuse `DocNumberService` + `numbering_config` disaster; TC-19 continuity |
| Inventory postings bypassed in new services | High | Code-review rule DOC 16 §10#2; static grep guard (`stock_balance` write ban) |
| Independent `prod_order` model accidentally created | Med | ADR-002 forbids it; canonical `work_order` only |

---

# PART X — IMPLEMENTATION PREREQUISITES

1. Approval of ADR-PROD-001 and ADR-PROD-002 (blocking).
2. Approval of ADR-PROD-003/004/005 (non-blocking, recommended same gate).
3. Sign-off of the D1 field-map / migration design document.
4. Final approval of DOCUMENT_16 (technical baseline).
5. Backend/FE/DB/QA leads identified for P1.

---

# PART XI — FINAL APPROVAL CHECKLIST

| Checklist item | Status |
|---|---|
| D1 data model ADOPTED (additive migration) | PENDING |
| D2 canonical Production Order (on `work_order`) | PENDING |
| D3 first-class doc disposition register approved | PENDING |
| D4 numbering REUSE approved | PENDING |
| D5 inventory posting REUSE approved | PENDING |
| No destructive migration / no data loss confirmed | YES (design) |
| No duplicate domain models | YES (design) |
| React + Spring Boot + PostgreSQL architecture preserved | YES |
| Existing production APIs remain compatible during transition | YES (design) |
| Zero-data-loss strategy documented | YES (§VIII) |
| Rollback strategy documented | YES (§VII) |

---

# FINAL GATE

## Recommendation

**B — APPROVED WITH PRE-CODING ACTIONS**

### Blocking decisions
- **D1 (ADR-PROD-001):** data-model target (normalized op-events + additive migration) — **BLOCKING**.
- **D2 (ADR-PROD-002):** canonical Production Order on existing `work_order` — **BLOCKING**.

### Required approvals
- Lead Architect + DB Owner + Tech Lead: **ADR-PROD-001, ADR-PROD-002, ADR-PROD-003**.
- Lead Architect: **ADR-PROD-004, ADR-PROD-005**.
- DB Owner: D1 migration/backfill design.
- QA lead: readiness for P1 regression + DOC 14 TC-*.

### Recommended first implementation phase
**P1 — Foundation & Shared Integration** (DOC 15 §7, DOC 16 Part 8): numbering registration (ADR-004),
workflow/status registration (DOC 11), audit/plant-scoping wiring, FE service/hooks/types layer
(`production-api.ts`, `useProduction.ts`, `types/production/*`), and inventory-integration wrapper
(ADR-005). **D1/D2 data-model work is gated on the migration-design sign-off and lands in P4.**

### Exact files/components allowed to be modified first after approval
| Area | Item | Basis |
|---|---|---|
| Backend (config) | `service/DocNumberService` usage + `numbering_config` seed rows (additive) | ADR-004 |
| Backend (new, additive) | New `InventoryIntegrationService` (wrapper) reusing `StockService` | ADR-005 |
| Backend (new, additive) | New logged services registered with `WorkflowStateMachine` transitions | ADR-003 |
| Database | **Additive V2+ Flyway migration** adding `numbering_config`/status seed rows (NO DDL table-drop) | ADR-004 |
| Frontend (new, additive) | `src/services/production-api.ts`, `src/hooks/useProduction.ts`, `src/types/production/*` | DOC 16 Part 7 |
| Frontend (config) | Register new screenIds in `screenRegistry.tsx` + `navigation.ts` (additive) | DOC 08 |
| **NOT to be modified first** | `production_entry*` tables/DDL, `StockController`, `security`, existing production endpoints (read-only during transition) | ADR-001 legacy retention |

> **No implementation starts automatically.** This document stops here and awaits the advisory board's
> approval of the gate above and the blocking decisions (D1, D2). Upon approval, P1 foundation work may
> begin as scoped.

---

**END OF DOCUMENT 17 — PRODUCTION ARCHITECTURE DECISION RECORD.**

---

# ADDENDUM — APPROVAL RECORDED (2026-09-05)

The D1–D5 decisions in this document were recorded as `AWAITING APPROVAL` / `BLOCKING` / `PENDING`
at authoring time. On **2026-09-05** the Business/Architecture Owner **APPROVED ADR-PROD-001..005**
via the DOCUMENT_56 §11 approval form. This approval is the authoritative resolution of the earlier
status contradiction between this document (AWAITING) and DOCUMENT_18/DOCUMENT_19 (claims of
"APPROVED").

Recorded in: `DOCUMENT_57_P7_Approval_Record_and_Regate.md` · `DECISION_REGISTER` (§1) ·
`DOCUMENT_51` §9 (all boxes ticked) · `CHANGELOG` [1.1.0]. The historical text above is preserved
unchanged; the recorded-approval status supersedes it. No implementation is authorized by this
addendum (see DOCUMENT_57 §7/§11).