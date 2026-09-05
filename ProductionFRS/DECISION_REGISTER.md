# Zyger ERP Production Module — DECISION REGISTER

Consolidated register of all locked decisions, assumptions, terminology decisions, and
resolved conflicts that govern the Production Module. This is the authoritative, at-a-glance
record; the full rationale lives in the source documents referenced per entry.

Legend: **DEC** = Architecture/Design Decision (approved) · **ASM** = Assumption (reversible) ·
**TERM** = Terminology decision · **CFL** = Conflict resolution.

---

## 1. Architecture & Design Decisions (DEC-PROD)

| ID | Decision | Status | Basis |
|---|---|---|---|
| DEC-PROD-001 | **Hybrid Final-Part-Centric Production Execution Architecture.** Final-part workspace as the primary UX aggregate over normalized operation-level execution events. | APPROVED (mandatory) | CR-PROD-001 + ZYGER final-part + REF per-op (DOC 03-§3) |
| DEC-PROD-002 | Bounded production domain — Production owns exactly its processes; does not duplicate Inventory/BOM/Route/Quality/Maintenance/Costing/Machine/Tool/MRP. | APPROVED | Scope instruction (DOC 03-§2) |
| DEC-PROD-003 | Production Core + Planning Layer = full FRS; external modules = integration contracts. MPS/MRP/Budget engine flagged FUTURE. | APPROVED | Scope instruction (DOC 03-§6) |
| DEC-PROD-004 | Every stock movement via a controlled Inventory stock transaction; Production never writes stock balance directly. | APPROVED | R-PROD-006 (DOC 07-§15) |
| DEC-PROD-005 | OEE is a single cross-functional engine (Availability × Performance × Quality); Production/Quality/Maintenance supply data. | PROPOSED | avoid duplication (DOC 03-§8) |
| ADR-PROD-001 | **(D1)** ADOPT additive migration: normalized `prod_operation_event`/session model = authoritative source; `production_entry*` retained legacy/compat (not deleted, read-only after cutover); backfill idempotent; scope = entries + outputs (return/conversion outside spine today). | **APPROVED (owner, 2026-09-05)** | DOCUMENT_17 D1 · DOCUMENT_56 §7.1 · DOCUMENT_57 §4 |
| ADR-PROD-002 | **(D2)** One canonical Production Order; existing `work_order` is the implementation table; no `prod_order`; no renames. | **APPROVED (owner, 2026-09-05)** | DOCUMENT_17 D2 · DOCUMENT_56 §7.1 · DOCUMENT_57 §4 |
| ADR-PROD-003 | **(D3)** First-class document register: Rej/Scrap/Rework/Deviation/Stoppage/Consumption/Planning = CREATE NEW; Entry/Conversion/Return/Idle/MREQ = EXTEND. | **APPROVED (owner, 2026-09-05)** | DOCUMENT_17 D3 · DOCUMENT_56 §7.1 · DOCUMENT_57 §4 |
| ADR-PROD-004 | **(D4)** REUSE `DocNumberService` + `doc_sequence` + `numbering_config`; register all Production doc types. | **APPROVED (owner, 2026-09-05)** | DOCUMENT_17 D4 · DOCUMENT_56 §7.1 · DOCUMENT_57 §4 |
| ADR-PROD-005 | **(D5)** REUSE controlled inventory engine (`StockService` + `stock_ledger` + `posting_idempotency_key`); Production never writes balances. | **APPROVED (owner, 2026-09-05)** | DOCUMENT_17 D5 · DOCUMENT_56 §7.1 · DOCUMENT_57 §4 |

## 2. Assumptions (ASM-PROD)

| ID | Assumption | Source | Reversibility |
|---|---|---|---|
| ASM-PROD-001 | Pending/WIP/Available are backend-derived read-only from posted operation events (single source of truth). | CR-PROD-001/007, CFL-PROD-006 | Recompute in one place if CLAR-PROD-002 changes |
| ASM-PROD-002 | Rework is a traced transaction referencing original entry + authorized qty + NCR; never a bare radio. | CR-PROD-001, CFL-PROD-002 | Adopt unless overruled |
| ASM-PROD-003 | Production may proceed with partial material; over-consumption requires approved Additional-Material Request / deviation. | CR-PROD-001, CFL-PROD-004 | Matches CNC partial-issue reality |
| ASM-PROD-004 | Master Data (Machine/Tool/WorkCenter/Operation/Shift/Employee) owned by Master Data; Production references read-only. | DOC 03-§2 | Prevents duplication |
| ASM-PROD-005 | BOM/Routing/Route Sheet/Process Flow owned by Engineering; Production consumes approved versions. | CR-PROD-001, DOC 03-§2 | Prevents duplication |
| ASM-PROD-006 | Every stock movement goes through Inventory as a controlled stock transaction; Production never writes stock directly. | CR-PROD-002/003, R-PROD-006 | System of record = Inventory |
| ASM-PROD-007 | OEE = one engine; Production supplies data, Maintenance supplies downtime, Quality supplies rejects. | DEC-PROD-005 | Prevents duplicate OEE |
| ASM-PROD-008 | MRP/MPS/APS optimization engines are external (future); Production Planning supplies plans & actuals, not the engine. | CFL-PROD-003 | Resource-deferred |
| ASM-PROD-009 | Document numbers: preview may repeat; reservation permanent once Draft/Submitted; server-side concurrency; numbers never reused. (BR-NUM-001) | DOC 07-§21 | Non-negotiable rule |
| ASM-PROD-010 | "Process Rate" interpreted as Standard Production Rate (units/hour) pending CLAR-PROD-007. | CLAR-PROD-007 | Reversible if clarified |
| ASM-PROD-011 | Multiple-output Entry supports primary + optional co/by-products per operation; single-output is default quick mode. | CFL-PROD-012 | Matches Zyger key points |
| ASM-PROD-012 | (Reserved — not assigned in baseline.) | — | — |
| ASM-PROD-013 | (Reserved — not assigned in baseline.) | — | — |
| ASM-PROD-014 | **Production Order = planning/authorization level; Work Order = execution-level instance under a PO** (same entity when only one level used). | TERM-PROD-001 (DOC 07-§02) | PROPOSED; reversible if customer distinguishes them |
| ASM-PROD-015 | **MSL = Minimum Stock Level** (CLAR-PROD-001, customer-confirmed). Item minimum-stock/reorder level owned by Inventory/Store; Production is integration-only (material availability + shortage alert via BR-PROD-MATL-001). Production does not store/set minimum levels. | CLAR-PROD-001; ZYGER MSL key point (DOC 03-§5) | Confirmed; reversible only if the business later wants min-stock maintained in Production |

## 3. Terminology Decisions (TERM-PROD)

| ID | Term | Decision | Status |
|---|---|---|---|
| TERM-PROD-001 | Production Order vs Work Order | PO is the planning/authorization level; WO is the execution-level instance under a PO. Carried as ASM-PROD-014; implemented in DOC 09 fields, DOC 12 DDL, DOC 11 lifecycle. | PROPOSED (reversible) |

## 4. Resolved Conflicts (CFL-PROD)

| ID | Conflict | Resolution |
|---|---|---|
| CFL-PROD-001 | Final-part single entry vs per-op recording | DEC-PROD-001: hybrid workspace over normalized operation events — both satisfied |
| CFL-PROD-002 | Rework as radio vs traced transaction | Rework = traced sub-transaction (source entry + NCR + authorized qty + rework route); radio kept only as quick-flag |
| CFL-PROD-003 | Planning layer in Production vs MRP/APS module | Production owns planning transactions & plans; MPS/MRP engine = external FUTURE |
| CFL-PROD-004 | Partial material pending vs strict consumption control | Partial issue/consumption supported; over-consumption needs approved Additional-Material Request / deviation |
| CFL-PROD-005 | Free-form vs catalogued idle reasons | Controlled reason catalogue + enforced "Other" text (CLAR-PROD-006) |
| CFL-PROD-006 | Displayed vs stored Pending/WIP/Available | All derived/read-only from posted operation events (CLAR-PROD-002) |
| CFL-PROD-007 | Return credits same item vs non-conforming | Production Return requires quality/condition disposition (Good/QC-Hold/Rejected) (CLAR-PROD-003) |
| CFL-PROD-008 | Conversion auto-updates inventory vs costing ownership | Production records input/output/loss/scrap txns; Costing computes conversion cost (CLAR-PROD-008) |
| CFL-PROD-009 | Masters listed inside Production vs Master Data module | Master Data owns; Production references read-only |
| CFL-PROD-010 | Mandatory quality gate vs operational urgency | Gate enforced by default; authorized override records reason/user/time/audit (CLAR-PROD-012) |
| CFL-PROD-011 | Entry captures MHR/rate vs costing ownership | Production stores read-only cost snapshot; Costing owns rate rules |
| CFL-PROD-012 | Multiple-output vs single-output model | Primary output + optional co/by-products per operation; single-output is default |

## 5. Numbering Decisions

| Ref | Series | Format | Behavior |
|---|---|---|---|
| NUM-PROD-REJ | Rejection / Defect record | `REJ-{PLANT}-{FY}-{SEQ}` | Repeatable on preview; permanent on Draft/Submit; never reused. Rejection is a first-class, separately number-controlled document (DOC 07-§21.2/§21.4). |
| NUM-PROD-BATCH | Batch Card | `BC-{PLANT}-{FY}-{SEQ}` | Approved 2026-09-05 (P7). BC number = document number; physical batch number separate. |
| NUM-PROD-CONV | Product Conversion | `CV-{PLANT}-{FY}-{SEQ}` | Approved 2026-09-05 (P7): CV adopted as authoritative (FRS DOC 07 §21.2); new numbers only; registration per ADR-PROD-004 at implementation. Committed code currently uses `PC` prefix until the approved change is implemented. |
| (generic) | All document series | `...-{PLANT}-{FY}-{SEQ}` | Governed by BR-NUM-001 / ASM-PROD-009. |

## 6. Status & Change Control

- This register reflects the **Version 1.0 baseline (amended)** (Approved for Development).
- Any change to a decision/assumption must be requested, versioned in `CHANGELOG.md`, and
  reflected here.
- **CLAR-PROD-001 (MSL) is RESOLVED = Minimum Stock Level** (ASM-PROD-015); it no longer revokes
  any assumption. Remaining open clarifications that may revoke an assumption: CLAR-PROD-002,
  CLAR-PROD-007, CLAR-PROD-010, CLAR-PROD-013. Reversible assumptions are flagged above.
- **Version 1.1.0 (2026-09-05)** — P7 human approvals recorded (`DOCUMENT_57`): ADR-PROD-001..005,
  CLAR-PROD-002/003/005/008/011/012, D-C1, D-C2, Batch Card, and Conversion numbering (CV) are now
  **APPROVED** (Business/Architecture Owner, 2026-09-05). CLAR-PROD-006/007 remain registered
  assumptions (CFL-PROD-005 / ASM-PROD-010); CLAR-PROD-013 is Quality-owned (SAMPLING vs PPM,
  Production boundary only). §7 below is the closed record; nothing further is pending on
  Production-owned decisions.

## 7. P7 Business Decisions (Approved 2026-09-05)

Recorded from DOCUMENT_56 §11 owner responses via `DOCUMENT_57_P7_Approval_Record_and_Regate.md`;
ticking instrument `DOCUMENT_51 §9` (all boxes ticked).

| ID | Decision (approved option) | Status |
|---|---|---|
| CLAR-PROD-002 | Quantity/WIP reconciliation — retain committed WIP formula `max(resolvedInput − (good+rejected+rework+scrap), 0)` (negative WIP invalid); `produced = good+rework+rejected`; `pending = planned − completed`; rejected split **R1** (first-class disposition documents); release **G1** (order-level first pass); operation-level reconciliation grain; batch-level reconciliation for batch/lot-controlled items only; over-production only via approved deviation/Additional Material; under-production flows to Pending; partial consumption supported (over-consumption needs approved Additional-Material Request/deviation). | **APPROVED (owner)** |
| CLAR-PROD-003 | Return disposition — strict enum {GOOD, QC_HOLD, REJECTED, SCRAP, REWORK}; default QC_HOLD (batch/lot-controlled) else GOOD; condition mandatory when posting; unsupported condition → validation error (never FREE); FREE/QC_HOLD only to counted balances; SCRAP via controlled posting; NCR for REJECTED/SCRAP; REWORK with rework-route reference; audited override. | **APPROVED (owner)** |
| D-C1 | Unknown return condition **must NOT** become FREE (validation error); only FREE/QC_HOLD to counted balances; scrap via controlled posting; segregated countable status only via a separate Inventory ADR. | **APPROVED (owner)** |
| D-C2 | Shared contract — Production validates `returnQty ≤ issued − consumed` against entry/consumption facts; Inventory credits via StockService; origin linkage via `originalIssueReference` + explicit identifier + `(docNo, docType)` dedupe. | **APPROVED (owner)** |
| CLAR-PROD-005 | Subjob↔Route-op — mandatory validated 1:1; authorized N:1 exceptions; rework as rework-route subjobs; sequence enforced; route binding **frozen once an entry posts**; changes via deviation/exception document. | **APPROVED (owner)** |
| CLAR-PROD-011 | Batch/lot policy — batch and lot distinct dimensions where the business tracks both; identity mandatory for batch/lot-controlled items at receipt/issue/consumption/output/rejection/rework/scrap/return/conversion; allocation rule manual/FIFO/FEFO (chosen at design); multi-batch consumption decomposed per batch; per-batch WIP/rejection/rework/scrap for controlled items. | **APPROVED (owner)** |
| Batch Card | **DOCUMENT** architecture (execution + traceability); number `BC-{PLANT}-{FY}-{SEQ}` (NUM-PROD-BATCH); DocTypes + `numbering_config` registration (ADR-004); lifecycle open/held/closed; audit trail; links to Production Entry / Job Card / Route Operation / Inventory batch. | **APPROVED (owner)** |
| CLAR-PROD-012 | Quality Gate — enforced by default at op/subjob completion + entry post (block next-op/completion/FG while inspection PENDING/FAIL/HELD); override = Quality Supervisor **and** Production Supervisor jointly or Plant Head; one-time; operation scope; mandatory reason; audited; PPAP non-overridable. | **APPROVED (owner)** |
| CLAR-PROD-008 | Conversion costing — Production records qty/loss only; **Costing computes conversion value** (CFL-PROD-008). | **APPROVED (owner)** |
| Conversion numbering | **CV (FRS)** `CV-{PLANT}-{FY}-{SEQ}` as authoritative convention; new numbers only; registration per ADR-PROD-004 at implementation; documented deviation note for the current committed `PC` prefix. | **APPROVED (owner)** |

---

*Zyger ERP Production Module · Decision Register · Baseline v1.0*