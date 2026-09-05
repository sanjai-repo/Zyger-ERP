# DOCUMENT_45 — PRODUCTION MODULE FUNCTIONAL ROADMAP AND TRANSACTION DEPENDENCY ARCHITECTURE

| Field | Value |
| --- | --- |
| Document ID | DOCUMENT_45 |
| Title | Production Module Functional Roadmap and Transaction Dependency Architecture |
| Module | Zyger ERP — Production |
| Type | Functional / Roadmap architecture — READ-ONLY documentation deliverable |
| Author | Agent (authorized documentation session) |
| Date | 2026-09-04 |
| Status | Analysis complete — documentation only. **No implementation.** |
| Authorization | None for backend/frontend/database/migration/staging/commit |

**MODE: DOCUMENTATION AND READ-ONLY ANALYSIS ONLY. NO IMPLEMENTATION PERFORMED.**

---

## 1. Document Control

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-09-04 | Agent | Publication of the Production functional roadmap and transaction dependency architecture |

Sources: DOCUMENT_01–DOCUMENT_44 (authoritative history), DOCUMENT_15 (backlog EP/BK), DOCUMENT_18 (phases P0–P13), plus read-only git inspection of committed vs working-tree state.

---

## 2. Purpose

This document establishes the **functional architecture and dependency sequence** for the next Production Module capabilities, before any implementation. It:

1. Reviews the dependency chain established across DOCUMENT_01–44.
2. Distinguishes **documented / implemented / committed / uncommitted / planned-only / deferred** for the Production domain.
3. Analyzes the next candidate functional areas:
   - A — Multiple-Output Production Entry
   - B — Rejection / Scrap / Rework
   - C — Idle Time / Line Stopping
   - D — Return / Conversion / Item Change / Disassembly
4. Determines their correct dependency order and why each depends on the previous one.
5. Recommends which capability should be **designed** next.
6. Imposes an explicit STOP GATE. It does **not** authorize implementation.

---

## 3. Relationship to DOCUMENT_01–DOCUMENT_44

- DOCUMENT_01–DOCUMENT_11 record the original **confirmed requirements, FRS, workflow, and status models** (Production Entry, Route Sheet, Job Card, Work Order, PO/WO terminology, quantity model, quality/inventory boundaries). These are the **authoritative functional reference** and are **not repeated or rewritten here**.
- DOCUMENT_12–DOCUMENT_14 record database, API, and traceability.
- DOCUMENT_15 documents the **implementation backlog** (EP/BK tasks).
- DOCUMENT_16–DOCUMENT_18 record the technical implementation plan and the **phase roadmap P0–P13**; DOCUMENT_18 is the authoritative phasing reference used for §20.
- DOCUMENT_19–DOCUMENT_42 record P0–P3.3 execution, gates, backfill, quarantine, and git closure.
- DOCUMENT_43–DOCUMENT_44 record P3.4 (operational backfill control layer + verification).
- This **DOCUMENT_45** is the next functional planning document. It does **not** repeat, rewrite, or regenerate any prior document.

---

## 4. Current Production Module State Classification

Read-only evidence (git, HEAD `db5abb2` = P3.3 commit):

| Category | Status |
| --- | --- |
| Branch / HEAD | `main` / `db5abb2` (committed) |
| Index (staged) | 0 |
| Committed Production backend java (entity/service/controller/repo) | **75 files** |
| Committed Production Flyway migrations | V4, V5(`production_module`), V5(`prod_backfill_infrastructure`), V40, V42, V44, V46, V65, V69 (+ related V28/V47/V53) |
| Committed Production frontend (src/pages/production & planning) | **34 tsx** |
| Uncommitted Production backend java | **0** (excluding the 3 untracked P3.4 main files) |
| Uncommitted Production frontend | 2 modified (`JobCardScreen.tsx`, `ProductionEntryScreen.tsx`) + 1 untracked (`order/`) |
| P3.4 untracked files | 8 (ProductionBackfillController, ProductionBackfillCommandService, BackfillJobRequest, BackfillJobResponse, 2 tests, DOCUMENT_43, DOCUMENT_44) — **not to be touched** |

**Key conclusion:** The **_core Production transaction model is already committed & authoritative_** at `db5abb2` — including `ProductionEntry` and its child records (Material/Operator/Rejection/Rework/Batch/Audit), `JobCard`/`JobCardSubjob`, `WorkOrder`(+Operation/Material/StatusHistory), `RouteSheet`/`RouteOperation`, and the normalized projection (`ProdExecutionSession`/`ProdOperationEvent`/`ProdOutputEvent`, `ProductionNormalizedEventService`, `ProductionInputAuthorityResolver`). The next phase is therefore about **controlled extensions** of that committed core, and the correct next step is **functional design**, not a greenfield build.

---

## 5. Authoritative Baseline vs Working-Tree Code

This document treats **committed code at `db5abb2`** as the **approved authoritative implementation**. The **working tree** contains:
- Uncommitted **frontend** refinements (2 modified production screens + 1 untracked `order/` directory) — **may be in-flight, NOT yet approved architecture**.
- The **P3.4 backfill-operational-control layer** (8 untracked files) — **pending authorization**; excluded from this roadmap's scope except where it must not be coupled (§24).

Therefore: even though backend/frontend screens may exist in the tree, **they are not treated as automatically approved architecture** where uncommitted. The four candidate capabilities are analyzed against the **committed core model and the documented FRS**, not against uncommitted screen code.

---

## 6. Production Transaction Architecture

The Production module is a **shop-floor execution domain**: it records actual manufacturing work performed in a CNC / precision machining shop.

Business chain (documented base):
```
Production Planning → Work Order → BOM + Route Sheet → Material Planning
→ Material Issue → Job Card / Batch Card → Machine Setup
→ Production / Operation Execution → Production Output
→ Quality → Next Operation or Finished Goods
```

Transaction architecture principle: **every candidate capability below is a controlled extension of the core Production Entry transaction model**, not an unrelated screen. They share the same parent transaction (Job/Work Order → Operation), the same quantity lifecycle, and the same route/op linkage.

---

## 7. Core Parent Transaction Model

The **authoritative Production Entry** is the parent/core transaction. Documented reference model captures:
- Route Sheet · Operation · Machine · Operator · Shift
- Processed Quantity (`process_qty`/`produced_quantity`)
- Accepted (good) · Rejected · Rework · Scrap quantities
- Pending / WIP (derived)
- Material-consumption context · Idle time · Production output

Parent chain:
```
Production/Work Order (authorization) → Route Sheet (Engineering, read-only)
→ Job Card / Subjob (execution doc) → Operation assignment → Production Entry
```

The committed normalized projection already derives `prod_execution_session`/`prod_operation_event`/`prod_output_event` from the authoritative single-entry model (§4). Candidate capabilities extend this committed core.

---

## 8. Candidate Capability A — Multiple Output Production Entry

| Analysis dimension | Finding |
| --- | --- |
| A. Business purpose | Record primary output **plus optional co/by-products** per operation (FR-PROD-ENTRY-003, BK-013). |
| B. CNC shop workflow | A machining operation can yield a primary part + swarf/by-product or a co-part. |
| C. Parent transaction | Production Entry (operation-level), under Job Card → Operation. |
| D. Required source records | Committed `ProductionEntry` + `RouteSheet`/`RouteOperation` (co/by-product spec) + output weight/destination-stage columns. |
| E. Route/op relationship | Outputs tied to a route operation's outcome; destination stage = next operation or FG/SFG. |
| F. Quantity model | Primary accepted/rejected/rework/scrap + additional co/by-product quantities + weights. |
| G–J. Accepted/Rej/Scrap/Rework qty | Primary quantities as today; co/by-product quantities are **additional** outputs. |
| K. Pending/WIP | Derived from input vs total output across all outputs (extend committed `deriveWip`). |
| L. Output relationship | Multiple `prod_output_event` rows per operation (weight, destination-stage); extends the single-good output projection. |
| M. Quality dependency | Each output may carry its own inspection/disposition at the gate. |
| N. Inventory dependency | Only **intents** if/when authorized — not part of this design. |
| O. Costing dependency | Co/by-product value allocation — Costing-owned (CLAR-PROD-008). |
| P. Audit/traceability | Output rows carry created-at/by; extend committed natural-key idempotency. |
| Q. Backend dependency | Extends `ProductionNormalizedEventService.putOutput` + `ProdOutputEvent` (committed). |
| R. Frontend dependency | Production Entry workspace output block (must be integrated, not mock). |
| S. Independently designable | **Yes** — additive to committed single-output model. |
| T. Independently implementable | **Yes**, behind flag, without inventory posting. |

---

## 9. Candidate Capability B — Rejection / Scrap / Rework

| Analysis dimension | Finding |
| --- | --- |
| A. Business purpose | First-class authorized documents for rejected/scrap/reworked quantity (FR-PROD-REJ-001, FR-PROD-SCRAP-001, Rework; P7). |
| B. CNC workflow | Defects/scrap from machine/QC; rework loop to a later operation. |
| C. Parent transaction | Derived from Production Entry outcome; links to NCR (Quality) and original entry. |
| D. Required source records | Rejected/scrap/rework quantities from entry + reason masters + NCR. |
| E. Route/op relationship | Rework uses a rework route/operations under the parent entry. |
| F. Quantity model | Rejection classification {REWORKABLE/SCRAP/HOLD_MRB}; authorized rework qty cap. |
| G–J. Quantities | Consume the rejected/rework/scrap slice of the entry output. |
| K. Pending/WIP | Reconciles with committed pending/WIP derivation. |
| L. Output relationship | Rework becomes re-input; scrap becomes a scrap output. |
| M. Quality dependency | **High** — disposition for scrap/HOLD owned by Quality (BR-PROD-REJ-001). |
| N. Inventory dependency | Scrap/rework intents only if authorized. |
| O. Costing dependency | Scrap value context; rework cost — Costing-owned. |
| P. Audit/traceability | First-class number-controlled documents (per DOC_07 §21: `REJ`, `SC`). |
| Q. Backend dependency | New service/docs; builds on committed entry outcome model. |
| R. Frontend dependency | Rejection/scrap/rework screens/workspace. |
| S. Independently designable | **Yes** for recording; disposition authority spans Quality. |
| T. Independently implementable | **Recording yes**; **scrap/HOLD approval needs Quality boundary** first. |

---

## 10. Candidate Capability C — Idle Time / Line Stopping

| Analysis dimension | Finding |
| --- | --- |
| A. Business purpose | Record resource available-but-not-producing and stoppages (FR-PROD-IDLE-001/STOP-001). |
| B. CNC workflow | Setup, tool change, breakdown, material shortage, no-order, wait. |
| C. Parent transaction | **Not a child of Production Entry** — a utilization record on machine/work-center/shift; linked to a job optionally. |
| D. Required source records | Machine master, shift, reason catalogue (CLAR-PROD-006). |
| E. Route/op relationship | Optional linkage to an operation; primarily resource-level availability. |
| F–J. Quantity model | Time-based (durations), **not** quantity-based. |
| K. Pending/WIP | No direct effect; feeds Availability (OEE). |
| L. Output relationship | None directly. |
| M. Quality dependency | Low (inspection-wait reason only). |
| N. Inventory dependency | None. |
| O. Costing dependency | Time/rate for cost — Costing-owned. |
| P. Audit/traceability | Idle/stoppage records + reason audit. |
| Q. Backend dependency | `IdleStoppageService`; `prod_idle`/`prod_stoppage` (new). **Independent of Production Entry model.** |
| R. Frontend dependency | Idle/stoppage screens. |
| S. Independently designable | **Yes** — separable from entry/output model. |
| T. Independently implementable | **Yes** — no inventory/quality coupling. |

---

## 11. Candidate Capability D — Return / Conversion / Item Change / Disassembly

| Analysis dimension | Finding |
| --- | --- |
| A. Business purpose | Return unused/recoverable material; convert input→output item; item change; disassemble parent→components (FR-PROD-RETURN-001, CONV-001, ITEMCHG-001, DISASM-001). |
| B. CNC workflow | Unused stock returned; material transformed; parent item broken into components. |
| C. Parent transaction | **Independent transactions** (Return, Conversion, Item Change, Disassembly), not children of Production Entry. |
| D. Required source records | Entry/Material context, input/output item, qty, loss, batch/lot. |
| E. Route/op relationship | Conversion is not route-bound (process/state change). |
| F–J. Quantity model | Input qty → output qty + process loss + scrap; return qty + disposition. |
| K. Pending/WIP | Little direct effect. |
| L. Output relationship | Conversion outputs = item changes (co/by-products). |
| M. Quality dependency | Return disposition (Good/QC-Hold/Rejected) per CLAR-PROD-003. |
| N. Inventory dependency | **High** — return/conversion produce **stock intents** via StockService (DEC-PROD-004). |
| O. Costing dependency | **High** — conversion value/loss allocation (CLAR-PROD-008). |
| P. Audit/traceability | First-class number-controlled docs (`PR`, `CV`, `DS`). |
| Q. Backend dependency | `ConversionService`; new tables. **Depends on StockService integration.** |
| R. Frontend dependency | Return/conversion/item-change/disassembly screens. |
| S. Independently designable | **Yes** functionally; must define inventory boundary. |
| T. Independently implementable | **No** without an authorized inventory/stock interface. |

---

## 12. Dependency Matrix

| Capability | Depends on core Entry model | Inventory/Stock | Quality | Costing | Can be implemented independently |
| --- | --- | --- | --- | --- | --- |
| A — Multiple-Output Entry | **Yes** (extends committed projection) | No | Partial (per-output gate) | Partial | **Yes** |
| B — Rejection/Scrap/Rework | **Yes** (rejection classification, rework loop) | Scrap intent only | **Yes (disposition)** | Partial | Recording yes; disposition needs Quality boundary |
| C — Idle/Stoppage | No (resource-level) | No | Low | Partial | **Yes** |
| D — Return/Conversion | Partial (uses entry/material context) | **Yes** | Return disposition | **Yes** | **No** (needs Stock interface + Quality/Costing) |

**Dependency ordering conclusion:** A → B → C → D from a **core-transaction purity** standpoint (each builds the quantity/output/reason foundation progressively), but C (Idle/Stoppage) is **structurally independent** of the entry model and could be designed in parallel. D is the **most coupled** (Inventory + Quality + Costing) and should be last.

---

## 13. Quantity Lifecycle Model

Unified lifecycle the extensions must conform to (committed semantics):
```
Input (available) ──▶ Processed
      │
      ├─▶ Accepted (good) ──▶ passes quality gate ──▶ next operation / FG/SFG
      ├─▶ Rejected  ──▶ REWORKABLE (→ rework loop) / SCRAP / HOLD_MRB(Quality)
      ├─▶ Rework    ──▶ re-input to a later operation
      └─▶ Scrap     ──▶ scrap disposition (Quality approval)
Output total = Accepted + Rejected + Rework + Scrap
Pending / WIP = max(Input − Output total, 0)   [derived, ASM-PROD-001]
```
- **A (Multiple Output)** extends output multiplicity (co/by-products + weight + destination stage).
- **B (Rejection/Scrap/Rework)** formalises the rejected/rework/scrap branches.
- **C (Idle/Stoppage)** is orthogonal (time-based availability, feeds OEE).
- **D (Return/Conversion)** operates at the material/item boundary.

---

## 14. Transaction Relationship Diagram

```
Production/Work Order
        │  releases
        ▼
Route Sheet (Engineering, read-only) ──► Job Card / Subjob
                                               │  operation assignment
                                               ▼
                                        Production Entry  ──► [A] Multiple-Output   (extends output)
                                          │  parsed branches
                                          ├──► [B] Rejection / Scrap / Rework       (disposition)
                                          ├──► Output → next op / FG/SFG
                          [C] Idle / Line Stoppage   (resource-level, parallel)
                          [D] Return / Conversion / Item Change / Disassembly  (material boundary)
```

---

## 15. CNC Shop-Floor Workflow Analysis

- A machine setup precedes operation events (uses Idle/Stoppage for setup/wait time — C).
- Operation execution yields output (A) and defect branches (B).
- Each operation passes a Quality gate before next-op/completion.
- Finished goods / return / conversion operate at the boundary (D).
- The workflow confirms the ordering: execution **output completeness (A)** and **defect classification (B)** must be defined before the material-boundary transactions (D); **Idle/Stoppage (C)** is a parallel availability stream.

---

## 16. Data Ownership Boundaries

| Function | Owner |
| --- | --- |
| Production Entry, Multiple Output (A) | **Production** (execution record) |
| Rejection **recording** (B) | **Production** |
| Rejection **disposition** (scrap/HOLD), NCR (B) | **Quality** |
| Idle/Stoppage capture (C) | **Production**; breakdown → Maintenance |
| Return/Conversion/Disassembly transaction (D) | **Production** |
| **Stock posting / ledger** (A/B/D intents) | **Inventory** (StockService, DEC-PROD-004) |
| Cost/value, conversion loss valuation | **Costing** |

Production does **not** own the ledger. Capabilities A/B/D produce **posting intents** only when authorized; C produces none.

---

## 17. Quality / Inventory / Costing Boundaries

- **Quality:** owns disposition for scrap/HOLD_MRB and NCR/CAPA/PPAP workflows (B). Production only generates inspection-pending + disposition references.
- **Inventory:** owns all stock moves via `StockService` + `stock_ledger` + idempotency keys (DEC-PROD-004). A/B/D provide intents; C none.
- **Costing:** owns rates, rules, and value allocation (incl. conversion loss, CLAR-PROD-008/Cost of co-products). Production stores read-only snapshots.

**Design rule:** this roadmap designs the **business event recording** layer. It does **not** activate inventory postings, and does **not** couple to the P3.4 backfill execution.

---

## 18. Backend Dependency Analysis

| Capability | Backend touch | Against committed baseline? |
| --- | --- | --- |
| A | Extend `ProductionNormalizedEventService.putOutput` + `ProdOutputEvent` (output multiplicity, weight, dest-stage); additive DTO + endpoint | Extends committed service — needs care to remain additive |
| B | New `RejectionService`/`ScrapService`/`ReworkService` + first-class docs (new tables) | Additive; scrap/HOLD approval needs Quality auth flow |
| C | New `IdleStoppageService` + `prod_idle`/`prod_stoppage` (new) | Additive, independent |
| D | `ConversionService` + new tables + **StockService integration** | Additive but couples to Inventory |

All candidate backend work is **additive**; none requires modifying the committed normalized **backfill execution** layer. A would minimally extend the committed projection service (must preserve its invariants).

---

## 19. Frontend Dependency Analysis

- A: Production Entry workspace output block (extend committed screen; current `ProductionEntryScreen.tsx` is **modified/uncommitted** — treat as in-flight, not approved).
- B: Rejection/Scrap/Rework screens + approval UI.
- C: Idle/Stoppage screens (existing `IdleTimeScreen.tsx` committed).
- D: Return/Conversion/Item-Change/Disassembly screens (Return/Conversion committed; Item-Change/Disassembly new).

Frontend design must follow backend contract and **not use mock data** as a replacement for real workflow. The modified/uncommitted entry screen indicates in-flight work — flag, do not assume approved.

---

## 20. Candidate Phase Priority Comparison

Per DOCUMENT_18 phase ordering (P5 Production Entry & Output → P6 Material → P7 Rejection/Scrap/Rework → P8 Idle/Stoppage → P9 Return/Conversion):

| Priority | Capability | DOC 18 phase | Coupling | Design readiness |
| --- | --- | --- | --- | --- |
| 1 | **A — Multiple-Output Production Entry** | P5 | Low (committed core) | **Highest** |
| 2 | **C — Idle / Line Stopping** | P8 | Low (independent) | High (parallel) |
| 3 | **B — Rejection / Scrap / Rework** | P7 | Medium (Quality) | Medium |
| 4 | **D — Return / Conversion / Item Change / Disassembly** | P9/P6 | High (Inv+Qual+Cost) | Lower until boundary |

**Recommended next design:** **Capability A — Multiple-Output Production Entry** (highest priority, lowest coupling, extends the committed core, independent, testable, and prerequisite-compatible before D). Capability C may be designed in parallel.

---

## 21. Recommended Next Functional Design Phase

**Recommended next phase: Functional Design Documentation for Capability A (Multiple-Output Production Entry).**

- It is the natural extension of the committed core Production Entry model (output multiplicity).
- It respects all safety boundaries: no inventory posting, no stock writes, no migration execution, no P3.4 coupling.
- It is independently designable and implementable (behind flag).
- It is a prerequisite (output completeness) for the later material-boundary capability D, and co-establishes the output model that B consumes.

**This is a design/documentation recommendation only — it does NOT authorize implementation.**

---

## 22. Explicitly Deferred Capabilities

- **D — Return/Conversion/Item-Change/Disassembly: deferred** until an authorized Inventory (StockService) interface + Quality return-disposition + Costing value boundary are agreed.
- **P6 — Material Request & Consumption Posting: deferred** — inventory issue/consumption posting requires authorization (per this task's boundaries).
- **MRP/MPS/APS engines, deep PPAP, MSL deep flow:** out of Production scope (FUT-PROD-001..005).
- **P3.4 backfill operational control + quarantine record PE/2026-27/00001:** explicitly **not coupled** to this roadmap; not resolved here.
- **Normalized-ops cutover:** not enabled; remains deferred to its authorized gate.

---

## 23. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| 1 | Extending committed `ProductionNormalizedEventService` breaks its projection invariants | Additive, flag-gated; preserve natural-key idempotency and zero-inventory rule |
| 2 | Treating uncommitted frontend/entry screen as approved | §5 distinguishes committed vs in-flight; not approved |
| 3 | Scope migration onto item-change/disassembly/inventory | §12, §16, §22 keep D deferred; intents-only rule |
| 4 | Quality disposition mis-owned | §17 recording vs disposition split |
| 5 | Waiting WIP formula ambiguity (CLAR-PROD-002) | Tracked, not silently assumed |
| 6 | Premature implementation | STOP GATE; design-first |
| 7 | P3.4/backfill coupling | §24 excludes |

---

## 24. Authorization Boundaries

For this roadmap and any future design:
- **Do not** activate inventory integration or design stock posting as implementation.
- **Do not** modify `production_entry`.
- **Do not** couple the next document to P3.4 backfill execution.
- **Do not** enable normalized-ops.
- **Do not** resolve the quarantined `PE/2026-27/00001`.
- **Do not** absorb uncommitted broader-production code as approved architecture.
- **Do not** create a roadmap that silently approves existing uncommitted code.

---

## 25. Final Decision

**Classification: A — Ready for Functional Design Documentation** (Capability A — Multiple-Output Production Entry).

Basis:
- Confirmed requirement (FR-PROD-ENTRY-003, BK-013).
- Extends the **committed/authoritative** core (not uncommitted proxy).
- Independent, testable, safe (no inventory/stock/backfill/P3.4 coupling).
- Correct dependency position before D and co-required for B.

**Capability C (Idle/Line Stopping) is also design-ready (A) and may be run in parallel.** Capability B = **A** for recording but needs a Quality disposition boundary note. Capability D = **D (Requires Architecture Authorization)** — needs Inventory/Costing boundary authorization first.

---

## 26. STOP GATE

**STOP after this document.**
- No backend implementation.
- No frontend implementation.
- No modification of existing files.
- No migrations.
- No Spring Boot execution.
- No flags enabled.
- No backfill / normalized-ops cutover.
- No quarantine resolution.
- No staging / commit / push.

Only this documentation deliverable was produced. Await explicit authorization before creating the next functional design document or starting any implementation.

---

### Read-Only Verification Record (completed)
- Branch `main`, HEAD `db5abb2`, index 0 staged, P3.4 8 files untracked/unstaged, V4/V5 (and V40/42/44/46/65/69) committed, committed backend prod java = 75, committed FE prod+planning tsx = 34, uncommitted FE prod/planning = 3 (2 modified + 1 untracked), uncommitted backend prod java = 0.
- No files created/modified other than this DOCUMENT_45.
