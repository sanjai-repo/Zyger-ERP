# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 05 — CONFLICT ANALYSIS

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 05 — Conflict Analysis |
| Purpose | Surface and resolve tensions among CR / REF / ZYGER / PROPOSED without silently choosing one |
| Status | ANALYSIS — decisions feed DOC 06 baseline and DOC 07 FRS |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

---

## TABLE OF CONTENTS

1. Conflict Analysis Methodology
2. Conflict Register
3. Resolved Conflicts (with decisions)
4. Conflicts Requiring User Confirmation
5. Impact of conflicts on the FRS

---

## 1. CONFLICT ANALYSIS METHODOLOGY

Every conflict is presented neutrally with both sides, then a recommended reconciliation.
Where a conflict cannot be fully auto-resolved (the answer materially changes inventory,
costing, approval, or workflow), it is surfaced as a CLAR-PROD-xxx item for user confirmation
rather than silently resolved.

---

## 2. CONFLICT REGISTER

Columns: Conflict ID | Requirement A | Requirement B | Conflict Description | Business Impact | Technical Impact | Recommended Solution

| Conflict ID | Requirement A | Requirement B | Description | Business Impact | Technical Impact | Recommended Solution |
|---|---|---|---|---|---|---|
| CFL-PROD-001 | ZYGER: "All processes under a single entry (Final Part wise)" | CR/REF: per-operation production entry with machine/operator/WIP per op | Single final-part screen vs granular per-operation recording | If only flat summary: no per-op WIP/machine/manpower/cost visibility; if only per-op: tedious UX, no unified view | Two incompatible data models if chosen exclusensefully | DEC-PROD-001: final-part workspace as aggregate over normalized operation events. Both satisfied. |
| CFL-PROD-002 | REF: Rework as a General/Rework radio button | PROPOSED/ZYGER: Rework must be a traced transaction | Bare radio loses source qty, NCR, and authorized rework route | Broken quality/stock/cost traceability on rework | No FK to source entry; no qty cap | Rework = Traced sub-transaction linked to original entry + NCR + authorized qty + rework route. Radio retained only as a quick-flag in quick mode; full trace in operation event. |
| CFL-PROD-003 | ZYGER: Production Planning Layer (Budget/Time-bucket/MPS/Forecast) belongs to Production | Scope: MRP/APS/Advanced Planning must be separate module | Planning layer partially overlaps MRP/APS engine | Boundary ambiguity can cause duplicate scheduling and double ownership | Two engines double-compute plan/demand | Production owns the planning **transactions & plans**; the MPS/MRP **engine/optimization** is an external MRP/APS module consuming Production plans. Flag engine as FUTURE in DOC 06. |
| CFL-PROD-004 | CR-PROD-001: allow "Material not available → Material Pending" and production may still need to proceed | PROPOSED: strict BOM/issue consumption control; no consumption beyond available | When material is short, production may start partially; strict gating would block shop floor | Over-strict control stalls real production; too loose allows negative consumption | Need partial-issue + partial-posting semantics | Support **partial material issue/consumption**; block over-consumption unless an approved Additional-Material Request or deviation approval rides along. Pending-material workflow is first-class. |
| CFL-PROD-005 | CR-PROD-006: Idle Time reasons are free-form examples | PROPOSED/ZYGER: controlled Idle/Stoppage reason catalogue feeding OEE | Free-form vs catalogued reasons | Inconsistent downtime classification in OEE/MIS | Data-quality issue in metrics | Controlled reason catalogue (Maintenance/Material/Operator/Tool/Quality/Power/Planning/No-order); allow "Other" with enforced text; free-form never allowed for standard categories. Requires CLAR-PROD-006. |
| CFL-PROD-006 | REF: "Pending qty / WIP / Available qty" shown as values | PROPOSED: these are backend-computed, read-only | Display-computed vs stored/manual summary qty | If manual, inconsistent ledger | Denormalized ambiguity | All pending/WIP/available are **derived/read-only**; single source of truth from posted operation events. CLAR-PROD-002 partially open (formula confirmation). |
| CFL-PROD-007 | CR: Production Return should credit the same item to stores | Quality: returned/rejected material may be non-conforming | Returning material that may be defective/held | Credit to store without disposition misleads available stock | Need disposition on return | Production Return requires a quality/condition disposition (Good usable / QC Hold / Rejected-scrap). Default rule and who can override → CLAR-PROD-003. |
| CFL-PROD-008 | CR-PROD-002: Conversion updates inventory automatically | Costing: conversion cost allocation is costing-owned | Auto-inventory update vs costing ownership | Conversion loss/cost untracked or double-counted | Posting vs costing split | Production records conversion **input/output/loss/scrap** transactions; Costing module computes conversion cost. Production does not compute cost. CLAR-PROD-008. |
| CFL-PROD-009 | ZYGER: Brand-width Master/Tool/WorkCenter are listed inside Production | Scope: Master Data is a separate module | Ownership ambiguity | Duplicate masters, divergent definitions | Dual maintenance | Master Data module owns masters; Production references read-only. No conflict remains after ownership (DOC 02-§2.3). |
| CFL-PROD-010 | PROPOSED: mandatory quality gate blocks next operation | CR/REF: shop floor sometimes proceeds before inspection when under pressure | Strict gate vs operational urgency | Over-rigid blocking hurts delivery | Bypass needs control | Gate enforced by default; authorized override records reason/user/time/audit. Not silent bypass. |
| CFL-PROD-011 | ZYGER: Production Entry capturing MHR / rate | Costing: rates owned by Costing module | Production storing cost vs costing rules | Rate staleness or user tampering | Costing snapshot duplication | Production stores a **cost snapshot** (rate + UOM + basis) at entry time, read-only from Costing config; Costing remains system of record for rules. |
| CFL-PROD-012 | ZYGER: Multiple-Output Entry | CR: single good/reject/scrap/rework output | Multiple co/by-products vs single-output model | By-product/coproduct value and stock untracked without multi-output | Need one-to-many output | Production Entry supports a primary output + optional co/by-product output events (PER operation). Single-output remains the default quick mode. |

---

## 3. RESOLVED CONFLICTS (WITH DECISIONS)

| Conflict | Resolution Decision | Adopted In |
|---|---|---|
| CFL-PROD-001 | DEC-PROD-001 (hybrid model) | DOC 03-§3 |
| CFL-PROD-002 | Rework = traced transaction | DOC 02-§9, DOC 07-§07 |
| CFL-PROD-003 | Planning transactions in-scope; MPS/MRP engine = external FUTURE | DOC 03-§6, DOC 06 |
| CFL-PROD-004 | Partial issue/consumption supported; over-consumption needs approval | DOC 07-§05,§15 |
| CFL-PROD-009 | Master data owned by Master Data module | DOC 03-§2 |
| CFL-PROD-011 | Cost snapshot captured read-only; Costing owns rules | DOC 07-§18 |

---

## 4. CONFLICTS REQUIRING USER CONFIRMATION

| Conflict | Question surfaced | Clarification |
|---|---|---|
| CFL-PROD-005 | Free-form vs catalogue idle reasons | CLAR-PROD-006 |
| CFL-PROD-006 | Pending/WIP formula confirmation | CLAR-PROD-002 |
| CFL-PROD-007 | Return disposition default & override | CLAR-PROD-003 |
| CFL-PROD-008 | Conversion cost allocation | CLAR-PROD-008 |
| CFL-PROD-010 | Quality-gate override authorization level & policy | CLAR-PROD-012 |
| (MSL) | MSL scope/owner | CLAR-PROD-001 → RESOLVED = Minimum Stock Level; Inventory/Store owns min-stock; Production integration-only (ASM-PROD-015) |

---

## 5. IMPACT OF CONFLICTS ON THE FRS

- DEC-PROD-001 resolves the fundamental data-model conflict and unblocks all screens.
- Cost/quality/inventory ownership conflicts are resolved by **ownership boundaries** so the FRS
  does not duplicate other modules.
- Quantity-formula and disposition/override items are left as **OPEN clarifications** with
  documented PROPOSED assumptions (DOC 06) so design can proceed without guessing.

**END OF DOCUMENT 05**