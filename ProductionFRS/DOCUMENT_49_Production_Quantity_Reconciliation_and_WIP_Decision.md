# DOCUMENT_49 — Production Quantity Reconciliation and WIP Decision

## 1. Document Control

| Field | Value |
|---|---|
| Document ID | DOCUMENT_49 |
| Title | Production Quantity Reconciliation and WIP Decision |
| Document Type | Quantity Reconciliation Matrix + WIP/Derivation Decision (Decision/Preparation — READ-ONLY) |
| Module | Production quantity model |
| Status | P5 PREPARATION — RECONCILIATION MATRIX EVIDENCED; CLAR-PROD-002 RESOLUTION PENDING HUMAN APPROVAL |
| Baseline Branch | `main` |
| Baseline HEAD | `0781e1a` |
| Staged Files at Baseline | 0 |
| Phase Type | PHASE 5 (P5) — Quantity Reconciliation + WIP Decision (NO IMPLEMENTATION) |
| Predecessor | DOCUMENT_47 (clause 14/16, CLAR-PROD-002), DOCUMENT_46, DOCUMENT_07 |
| Author | Senior ERP Solution Architect / Senior Full-Stack Engineer |
| Last Reviewed | P5 evidence collection complete |

## 2. Purpose

This document establishes the authoritative reconciliation matrix across the production quantity lifecycle
(Planned / Released / Issued / Consumed / Produced / Good / Rework / Rejected / Scrap / Returned / Pending /
WIP) and resolves the CLAR-PROD-002 quantity-reconciliation decision.

Scope guard (same as DOCUMENT_48): READ-ONLY preparation. No implementation. Every statement tagged per
the FACT-vs-PROPOSED labeling (see DOCUMENT_48 §4). No clarifications silently promoted or resolved.

## 3. Baseline Verification

Same as DOCUMENT_48 §3. This document adds no baseline changes.

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD | `0781e1a` |
| Staged file count | 0 |
| Committed quantity model | ProductionEntry / ProductionEntryMaterial / ProductionEntryBatch (HEAD, unchanged) |
| Modified working-tree JobCard/JobCardSubjob | Traceability columns only; quantity fields unchanged |
| DOCUMENT_48 / DOCUMENT_49 present before phase | No |

## 4. Committed Quantity Model (FACT FROM COMMITTED CODE)

### 4.1 ProductionEntry

Committed production-entry result fields, all persisted:
`process_qty` (alias code-maintained), `produced_quantity` (alias), `good`, `rejected`, `rework`,
`scrap`, and a persisted `wip` field on `prod_execution_session`.

### 4.2 ProductionEntryMaterial

Committed material capture fields: `reqQty`, `totalIssuedQty`, `availableQty`, `consumedQty`,
`deviationQty`, `returnQty`, `scrapQty`, `rate`, `batch`.

### 4.3 ProductionEntryBatch

Committed batch child entity.

### 4.4 Parent documents

`WorkOrder`, `ProductionOrder`, `JobCard`, `JobCardSubjob` carry quantity fields (planned quantities,
completed quantity). `work_order.pending_qty` is a persisted column that is **not** actively maintained
(matrix treats `pending` as computed-on-demand, see 5.4).

## 5. Quantity Reconciliation Matrix

The matrix below maps each lifecycle quantity to its committed source, its status, and the reconciliation
relationship. Rows marked OPEN require human decision.

| # | Quantity | Committed source (FACT) | Reconciliation relationship | Reconciled? |
|---|---|---|---|---|
| 1 | **Planned** | ProductionOrder / WorkOrder planned quantity | Starting point | YES |
| 2 | **Released** | Release status on the order | Planned minus released deltas (if partial release) | OPEN (release granularity) |
| 3 | **Issued** | `ProductionEntryMaterial.totalIssuedQty` | Issued ≤ reqQty (V-issue checks) | YES |
| 4 | **Consumed** | `ProductionEntryMaterial.consumedQty` | Consumed ≤ issued; V-19 consumed ≤ available | YES |
| 5 | **Produced** | `production_entry.produced_quantity` | = good + rework (+ rejected classified) | YES (derivation) |
| 6 | **Good** | `production_entry.good` | Output-good quantity | YES |
| 7 | **Rework** | `production_entry.rework` | Output-reworkable quantity | YES |
| 8 | **Rejected** | `production_entry.rejected` | Output non-good; split by disposition | OPEN (split semantics) |
| 9 | **Scrap** | `production_entry.scrap` | Irrecoverable output | YES |
| 10 | **Returned** | `ProductionEntryMaterial.returnQty` (material); return movement IN | Returned ≤ issued − consumed | YES |
| 11 | **Pending** | Computed on demand = planned − completed (committed) | Derived, not persisted-maintained | YES (computed) |
| 12 | **WIP** | Persisted `prod_execution_session.wip` via formula (committed, see 6) | See 6 | YES (committed formula) |

### 5.5 Balance identities (all reconciled by committed derivation)

- `produced = good + rework + rejected` (output classification partitions `produced`).
- `wip = max(resolvedInput − (good + rejected + rework + scrap), 0)` (see §6).
- `pending = planned − completed` (computed on demand).
- Material: `reqQty → totalIssuedQty → consumedQty`; `consumed ≤ available` (V-19); `returnQty ≤ issued − consumed`.

## 6. WIP Decision (grounded in committed code)

### 6.1 Fact: WIP formula is already implemented and committed

- Persisted on `prod_execution_session.wip`.
- Formula (committed): `WIP = max(resolvedInput − (good + rejected + rework + scrap), 0)`.
- `resolvedInput` = resolved effective input via `ProductionInputAuthorityResolver` (not raw `process_qty`).

### 6.2 PROPOSED DECISION — WIP

> **Status: PROPOSED — HUMAN APPROVAL REQUIRED.**
>
> **Retain the committed WIP formula as the authoritative derivation** (`max(resolvedInput − outputs, 0)`),
> because it is already the evidenced, committed behavior. It must floor at zero (no negative WIP).

## 7. CLAR-PROD-002 Resolution

### 7.1 Evidence status (FACT)

- The **WIP derivation**, the **produced/output partition**, and the **pending** computation are already
  implemented and committed (§5, §6).
- The **material availability authority** (`consumed ≤ available`) is committed (V-19).

### 7.2 What remains genuinely open (HUMAN DECISION REQUIRED)

The committed code does **not** provide an authoritative business decision for:

1. **Rejected split semantics** — how `rejected` is partitioned into reworkable vs scrap vs hold (relates to CLAR-PROD-003 return disposition and CLAR-PROD-012 quality gate).
2. **Release granularity** — whether partial release is supported and how `released` is tracked (row 2 above).
3. **Batch/lot identity in reconciliation** — how batch affects `wip`/`issued` per-batch (CLAR-PROD-011).

### 7.3 CLAR-PROD-002 classification

> **Status: OPEN — HUMAN DECISION REQUIRED on the open items in 7.2.**
>
> The reconciliation **derivations** (WIP, produced partition, pending) are **evidenced/committed** and can
> be fixed by the architecture from code. The **business disposition semantics** (rejected split, release
> granularity, batch identity) are **OPEN** and must not be resolved silently by P5. P5 does not place
> CLAR-PROD-002 fully in a DECIDED state; it records the evidenced portion as fixed and the remainder OPEN.

## 8. P6 Gate Implication

- The WIP/derivation formulas are re-usable for P6 but require the HUMAN approvals in DOCUMENT_48 §6.4/§7.4
  and DOCUMENT_49 §7.3.
- Gate: **C = BLOCKED BY REQUIRED DECISIONS** (open human decisions on rejected split, release granularity,
  batch identity) with derived formulas already evidenced.
- P6 is NOT started by this phase.

## 9. Open Clarifications Register (unchanged)

Per P5 guard, CLAR-PROD-003/005/006/008/011/012/013 remain OPEN (see DOCUMENT_48 §11). CLAR-PROD-002 is
partially evidenced (derivations) with OPEN business semantics (this document §7).

## 10. File Modification Summary

| File | Action |
|---|---|
| `ProductionFRS/DOCUMENT_49_Production_Quantity_Reconciliation_and_WIP_Decision.md` | CREATED (this document) |
| All other files | Not modified by P5 |

## 11. Git Safety Confirmation

Same as DOCUMENT_48 §14: staged = 0, no commit, no push, no stock writes, no state change.
