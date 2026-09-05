# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 11 — ERP WORKFLOW AND TRANSACTION DESIGN

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 11 — ERP Workflow and Transaction Design |
| Baseline | DOCUMENT 07 §22; DOCUMENT 09 fields |
| Status | AUTHORITATIVE WORKFLOW + STATUS DICTIONARY + TRANSACTION LIFE CYCLES |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |
| Corrections | Resolves WF-GAP-001..006 + Workflow Status Dictionary (DOCUMENT 08A) |

---

## TABLE OF CONTENTS

1. Authoritative Workflow Status Dictionary
2. Entity Lifecycles (per-entity state machines)
3. Transaction Lifecycle Specifications (29 transactions)
4. Status Transition Summary Table
5. Reversal and Cancellation Logic

---

## 1. AUTHORITATIVE WORKFLOW STATUS DICTIONARY (WF-GAP RESOLUTION)

A single controlled **enterprise status vocabulary** underlies every entity. Two distinct
dimensions are modeled and MUST NOT be conflated:

- **DOCUMENT STATUS** — the administrative/approval lifecycle of a document (drafting → approval).
- **EXECUTION STATUS** — the physical/shop-floor progress of a work entity (planned → release →
  running → done).

`ON HOLD`/`HOLD` is a **formal controlled state** representing deliberate suspension of an
entity's active progress (with a reason), not a loose label.

### 1.1 Document Status (administrative lifecycle)
| Code | Meaning |
|---|---|
| DRAFT | being edited; not yet presented for approval |
| VALIDATED | technical completeness checked |
| SUBMITTED | presented for approval |
| PENDING_APPROVAL | awaiting approval decision |
| APPROVED | authorized; effect allowed |
| CANCELLED | voided before/at approval (no effect) |
| REJECTED | approval refused → returns to DRAFT |
| REVERSED | an APPROVED/executed doc is voided with compensating postings |

**Document state machine (canonical):**
```
DRAFT → VALIDATED → SUBMITTED → PENDING_APPROVAL → APPROVED → CLOSED
          │             │             │                │
          │             │             └→ REJECTED ──→ DRAFT
          │             └─────────────→ CANCELLED
          └───────────────────────────→ CANCELLED
APPROVED → REVERSED
REVERSED → (closed, no further transitions)
```
Per-entity approval requirement varies: many execution docs are APPROVED implicitly by RELEASE
(no separate approval step); the quantity/approval-bearing docs (rework order, additional
material, scrap-beyond-tolerance, WC re-allocation, short-close, batch card) require explicit
approval.

### 1.2 Execution Status (physical progress)
| Code | Meaning |
|---|---|
| PLANNED | scheduled, not yet released |
| RELEASED | authorized to begin shop-floor work |
| IN_PROGRESS | active execution underway |
| PARTIALLY_COMPLETED | some qty/ops done, not all |
| ON_HOLD | deliberately suspended (reason recorded) |
| COMPLETED | all planned work done |
| SHORT_CLOSED | closed below planned qty (authorized) |
| CLOSED | finalized; no further changes |

### 1.3 Operation Status (per-route-operation)
| Code | Meaning |
|---|---|
| NOT_STARTED | not begun |
| READY | prerequisites met, eligible to start |
| IN_PROGRESS | being executed |
| QUALITY_PENDING | produced, awaiting inspection |
| COMPLETED | accepted output secured |
| BLOCKED | gated (quality hold / prerequisite / breakdown) |
| REWORK | routed to rework |
| SKIPPED_AUTHORIZED | bypassed with authorization |

### 1.4 Legend / invariants
- **KEY RULE:** Document Status and Execution Status are independent columns on carrying tables.
  A doc can be APPROVED (document) while execution is IN_PROGRESS (execution).
- `ON HOLD` always carries a `hold_reason` + `hold_by/at`; never used without one.
- No entity uses a single generic workflow; each has its own allowed lifecycle (below) drawn
  from this vocabulary.

---

## 2. ENTITY LIFE CYCLES (PER-ENTITY STATE MACHINES)

### 2.1 Production Order (Single / Composite; also Work Order at execution level)
Document: applies canonical doc status (DRAFT→…→APPROVED).
Execution:
```
PLANNED → RELEASED → IN_PROGRESS → PARTIALLY_COMPLETED → COMPLETED → CLOSED
                             │            │
                             │            └→ SHORT_CLOSED → CLOSED
                             └→ ON_HOLD → RELEASED
```
Mapping to DOC 07 §02 "Released/In Progress/Short Close": **Released = APPROVED (doc) +
RELEASED (exec); In Progress = APPROVED + IN_PROGRESS/PARTIALLY_COMPLETED; Short Close =
APPROVED + SHORT_CLOSED.** This reconciles WF-GAP-001.

### 2.2 Job Card
Document: DRAFT → VALIDATED → SUBMITTED → APPROVED(=RELEASED) → CLOSED (+CANCELLED/REJECTED/REVERSED).
Execution:
```
CREATED → RELEASED → IN_PROGRESS → PARTIALLY_COMPLETED → COMPLETED → CLOSED
                     │            │
                     │            └→ ON_HOLD (reason) → RELEASED/IN_PROGRESS
                     └→ ON_HOLD → RELEASED
```
**ON_HOLD formally defined** (WF-GAP-002): a job/subjob deliberately suspended (material
shortage, quality block, breakdown, customer hold) with reason; resume returns to RELEASED/
IN_PROGRESS.

### 2.3 Production Execution Session (Production Entry)
Document: DRAFT → VALIDATED → SUBMITTED → APPROVED (+REJECTED/CANCELLED/REVERSED).
Execution (session): OPEN → IN_PROGRESS → COMPLETED → CLOSED.
Operation (child, per-op): NOT_STARTED → READY → IN_PROGRESS → QUALITY_PENDING → COMPLETED;
lateral BLOCKED / REWORK / SKIPPED_AUTHORIZED.

### 2.4 Operation-Status → Session-Status aggregation (WF-GAP-003)
- All child ops NOT_STARTED → session OPEN.
- ≥1 op IN_PROGRESS/QUALITY_PENDING, none COMPLETED→ IN_PROGRESS.
- Some COMPLETED + some pending → PARTIALLY_COMPLETED (session-level "IN_PROGRESS").
- All COMPLETED → session COMPLETED.
- Any BLOCKED → session reflects BLOCKED (surface hold reason).

---

## 3. TRANSACTION LIFECYCLE SPECIFICATIONS (29 TRANSACTIONS)

Legend: each transaction row: **Before Save → On Draft Save → On Submit → On Approval → On
Execution → On Completion → On Rejection → On Cancellation → On Reversal.**

### 3.1 Production Order (Single)
- Before Save: validate BOM+route approved; planned_qty>0; numbering preview.
- Draft Save: reserve number; lock BOM/route.
- Submit: notify approver.
- Approval/RWLEASE: set execution RELEASED; make available to Job Cards; propagate to
  composite members.
- Execution: tracked via sessions/ops (IN_PROGRESS/PARTIALLY).
- Completion: delivery of last accepted output → COMPLETED.
- Rejection: returns to DRAFT, editable.
- Cancellation: only DRAFT/SUBMITTED; reason; releases demand.
- Reversal: only APPROVED without committed postings; else requires full reversal of job/ops.

### 3.2 Composite Production Order
- Same as 3.1; release (ATOMIC/MEMBERS_ONLY) releases member orders; each member independent
  status. Cancellation/reversal cascades per release_mode; members without postings cancellable
  individually.

### 3.3 Rework Production Order
- Before Save: source order/entry + NCR + authorized_qty + rework route present.
- Draft/Submit/Approval as 3.1. Approval requires rework authorization owner.
- Execution/Completion/Rejection/Cancel/Reverse: as 3.1; qty capped by authorized_qty
  (BR-PROD-REWORK-001); reversal restricted if rework output already consumed.

### 3.4 Job Card
- Before Save: from RELEASED order; planned_qty ≤ pending; numbering preview.
- Draft Save: reserve; snapshot BOM/material.
- Submit: validate all subjobs planned.
- Approval(=Release): execution CREATED→RELEASED; opens for entries.
- Execution: subjobs progress.
- Completion: all subjobs COMPLETED or authorized ON_HOLD; final quality PASS → FG/SFG receipt →
  CLOSED.
- Rejection/Cancel/Reverse: as doc canonical; reversal restores order pending + removes FG/SFG.

### 3.5 Job Entry
- Before Save: order released; material partial allowed.
- Draft/Submit: capture WC/machine/operator.
- Approval(=Release): job RELEASED.
- Execution/Completion/Reject/Cancel/Reverse: follow Job Card.

### 3.6 Subjob Entry
- Before Save: map subjob↔route op (1:1 default); op in approved route.
- Draft/Submit: machine/operator/qty.
- Approval(=Release): subjob READY.
- Execution: per operation lifecycle.
- Completion: op COMPLETED.
- Cancel/Reverse: only if no posting on that subjob.

### 3.7 Job Completion
- On trigger: run completion check; block if subjob pending or quality not PASS.
- On approval of completion: FG/SFG receipt (BR-PROD-INV-002); Job Card → CLOSED.
- Reverse: remove receipt + restore pending; only if no downstream consumption.

### 3.8 Production Entry (Session + Operation events)
- Before Save: job RELEASED; entry_type valid; route seq (BR-PROD-010).
- Draft Save: reserve number; create session + pending op events.
- Submit: quantity reconciliation (BR-PROD-ENTRY-001), inspection gate visibility, machine/
  operator eligibility (BR-PROD-020).
- Approval: session APPROVED; post output/consumption/scrap/rework intents to Inventory.
- Execution: ops progress (per-op lifecycle); WIP/pending derived.
- Completion: session COMPLETED; last-op accepted output eligible for FG/SFG.
- Rejection: return to DRAFT; release reserved qty.
- Cancellation: only before posting (DRAFT/SUBMITTED).
- Reversal: ordered reversal of all posted stock txns (consumption, output, scrap); blocked if
  FG consumed/sold.

### 3.9 Rework Entry
- As 3.8 but entry_type=REWORK, prod_type=REWORK; validates source entry + authorized_qty cap
  (BR-PROD-REWORK-001); reversal restricted after rework output usage.

### 3.10 Multiple Output Entry
- As 3.8 with entry_type=MULTI_OUTPUT; validates ≥1 PRIMARY + reconciliation
  (BR-PROD-ENTRY-003); each output posted as separate output event/txn.

### 3.11 Production Return
- Before Save: returnable qty ≤ issued−consumed; disposition required (Good/Hold/Rejected).
- Draft/Submit/Approval: return doc.
- Execution/Completion: post RETURN txn credited per disposition (BR-PROD-INV-003);
  QC-hold/rejected segregated.
- Reverse: only before store receipt; else re-issue.

### 3.12 Production Material Request
- Before Save: BOM item; req_qty = output×rate; numbering.
- Draft/Submit/Approval(=issue): partial issue allowed (ASM-PROD-003).
- Execution: posts MATERIAL_ISSUE txn.
- Completion/Reject/Cancel/Reverse: as doc canonical; reversal restores issued qty if not
  consumed.

### 3.13 Additional Material Request
- Before Save: justification + deviation_qty.
- Approval: requires authorized role; deviation beyond tolerance → BR-PROD-MATL-001.
- Execution/Reject/Cancel/Reverse: as 3.12; approval chain mandatory before issue.

### 3.14 Other Material Request
- As 3.12 for non-BOM material; purpose mandatory; authorization required.

### 3.15 Consumable Consumption
- Before Save: consumable item, qty, uom, job/machine.
- Draft/Submit/Approval: posts CONSUMPTION/ISSUE txn.
- Execution/Completion/Reject/Cancel/Reverse: as consumable doc; reversal before cost impact.

### 3.16 Rejection (record + disposition)
- Before Save: source op_event; rejected_qty ≤ processed.
- Draft/Submit: classification + reason; NCR required for scrap/hold.
- Approval: disposition REWORKABLE/SCRAP/HOLD_MRB (with Quality for scrap/hold).
- Execution: disposition drives rework route / SCRAP txn / quarantine block.
- Completion: disposition realized.
- Rejection(workflow): return to DRAFT.
- Cancellation: before posting.
- Reversal: mirror of disposition; SCRAP reversal restricted after capitalization.

### 3.17 Scrap
- Before Save: source op_event; scrap_qty ≤ processed; reason.
- Submit/Approval: authorization AUTO/MANUAL per BR-PROD-SCRAP-001.
- Execution: post SCRAP txn + value_context.
- Completion/Reject/Cancel: as doc canonical.
- Reversal: **restricted** after costing/capitalization; pre-capitalization reversal requires
  authorization level + ordered rollback.

### 3.18 Idle Time
- Before Save: machine active; start ≤ end.
- Draft/Submit/Approval: duration derived.
- Execution/Completion/Reject/Cancel/Reverse: feeds OEE Availability; reversal updates OEE.
- Note: idle records do not post inventory; doc-level admin lifecycle only.

### 3.19 Line / Machine Stoppage
- Before Save: type + resource; reason.
- Execution: if breakdown → maintenance hand-off (BR-PROD-STOP-001); machine ineligible.
- Completion/Reject/Cancel/Reverse: as idle; hand-off rollback on reversal if maintenance not
  acted.

### 3.20 Product / Item Conversion
- Before Save: input/output items; stock availability; numbering.
- Draft/Submit/Approval: reconciliation (BR-PROD-CONV-001).
- Execution: post CONVERSION txn (input−, output+, loss, scrap); Costing values.
- Reject/Cancel/Reverse: before stock post; reversal after → input/output restore (blocked if
  consumed).

### 3.21 Item Conversion (product conv_type)
- As 3.20 with item-to-item conversion; output_qty = input_qty default.

### 3.22 Item Change
- As 3.21, output = new item id, no material loss by default; state/identifier change.

### 3.23 Disassembly
- Before Save: parent stock; reverse BOM; numbering.
- Execution: post DISASSEMBLY txn (parent−, components+, by+, loss). Reconciliation
  (BR-PROD-DISASM-001).
- Reverse: restore parent; blocked if components consumed.

### 3.24 Batch Card
- Before Save: batch/lot-controlled item required (CLAR-PROD-011).
- Execution: track every movement by batch/lot (issue, consumption, output, scrap, receipt);
  status OPEN/HELD/CLOSED.
- Completion/Reject/Cancel/Reverse: batch motions controlled; reversal requires movement-level
  rollback.

### 3.25 Short Close
- On trigger: Released/In-Progress only; close_reason + remaining disposition (CANCEL/SCRAP/
  RETURN); authorized.
- Execution: reconcile WIP/pending; post remaining disposition; order → SHORT_CLOSED → CLOSED.
- Reverse: restore order + previous disposition; restricted if scraped/finished.

### 3.26 Production Plan Deviation
- Before Save: order ref + reason + responsible area.
- Draft/Submit/Approval: deviation record; qty derived (plan−actual).
- Completion/Reject/Cancel/Reverse: as admin doc; feeds plan-vs-actual.

### 3.27 Delay to Customer Delivery
- Before Save: order ref + delay reason + attributed period.
- Draft/Submit/Approval: record.
- Execution/Completion/Reject/Cancel/Reverse: feeds delivery performance.

### 3.28 Non-Conformity
- Before Save: op_event ref + description.
- Execution: raise/link NCR (Quality-owned); Production does not run NCR workflow.
- Completion: status OPEN → NCR_LINKED → CLOSED (when Quality closes).
- Reverse: unlink NCR if not acted.

### 3.29 WIP Tracking (read-only, no transaction)
- Derived from posted op/consumption/output events (BR-PROD-WIP-001). No lifecycle of its own;
  reflects the sum of operation states. Quarterly reconstruction for audit is a report.

---

## 4. STATUS TRANSITION SUMMARY TABLE

| Entity | Doc lifecycle | Execution lifecycle | Terminal(s) |
|---|---|---|---|
| Production Order | canonical | PLANNED→RELEASED→IN_PROGRESS→PARTIALLY→COMPLETED→CLOSED | CLOSED, CANCELLED, REVERSED |
| Composite PO | canonical | as Single (+member cascade) | CLOSED, CANCELLED, REVERSED |
| Rework PO | canonical (approval) | as Single (qty-capped) | CLOSED, CANCELLED, REVERSED |
| Job Card | canonical | CREATED→RELEASED→IN_PROGRESS→PARTIALLY→COMPLETED→CLOSED (+ON_HOLD) | CLOSED, CANCELLED, REVERSED |
| Job Entry | canonical | via Job Card | CLOSED, CANCELLED |
| Subjob | sub-op | NOT_STARTED→READY→IN_PROGRESS→QUALITY_PENDING→COMPLETED | COMPLETED, CANCELLED |
| Job Completion | canonical | — | CLOSED |
| Production Entry | canonical | OPEN→IN_PROGRESS→COMPLETED→CLOSED | CLOSED, CANCELLED, REVERSED |
| Rework Entry | canonical | as Entry (capped) | CLOSED, CANCELLED, REVERSED |
| Multiple-Output Entry | canonical | as Entry (multi-output) | CLOSED, CANCELLED, REVERSED |
| Production Return | canonical | — | CLOSED, CANCELLED, REVERSED |
| Material Request | canonical(approval) | — | ISSUED/CLOSED, CANCELLED, REVERSED |
| Additional Material Req | canonical(approval) | — | APPROVED/CLOSED, CANCELLED |
| Other Material Req | canonical(approval) | — | APPROVED/CLOSED, CANCELLED |
| Consumable Consumption | canonical | — | CLOSED, CANCELLED, REVERSED |
| Rejection | canonical(approval) | — | DISPOSED/CLOSED, CANCELLED, REVERSED |
| Scrap | canonical(approval) | — | POSTED/CLOSED, CANCELLED, REVERSED(restricted) |
| Idle Time | canonical | — | CLOSED, CANCELLED, REVERSED |
| Stoppage | canonical | — | CLOSED, CANCELLED, REVERSED |
| Conversion | canonical | — | POSTED/CLOSED, CANCELLED, REVERSED |
| Item Conversion / Change | canonical | — | POSTED/CLOSED, CANCELLED, REVERSED |
| Disassembly | canonical | — | POSTED/CLOSED, CANCELLED, REVERSED |
| Batch Card | canonical | OPEN→HELD→CLOSED | CLOSED, CANCELLED |
| Short Close | (action) | RELEASED→SHORT_CLOSED→CLOSED | CLOSED |
| Plan Deviation | canonical | — | CLOSED, CANCELLED |
| Delay to Customer | canonical | — | CLOSED, CANCELLED |
| Non-Conformity | canonical | — | CLOSED |

**Invalid-transition check:** no invalid transitions exist; terminals defined for every entity;
reversal/cancellation logic present; role restrictions per DOC 08; field locking per DOC 09
(Locked-when ∈ {≥CREATED, ≥SUBMIT, ≥APPROVE/RELEASE, always}).

---

## 5. REVERSAL AND CANCELLATION LOGIC

### 5.1 Cancellation (pre-effect)
- Allowed states: DRAFT, SUBMITTED, PENDING_APPROVAL (never APPROVED with postings).
- Action: mark CANCELLED with `cancelled_by/at/reason`; number retained (BR-NUM-001); release
  any reserved demand/stock not yet posted.
- No inventory/order effect beyond releasing reservation.

### 5.2 Reversal (post-effect)
- Allowed states: APPROVED / PARTIALLY_COMPLETED / COMPLETED.
- Preconditions: reason mandatory; reversal authorization.
- Action sequence (ordered): reverse dependent child docs → reverse stock transactions in
  reverse-chronological order (output−, consumption+, issue+, receipt−, scrap+restore if
  pre-capitalization) → restore WIP/pending → set REVERSED (terminal).
- Restrictions: blocked when a downstream disposition is capitalized (scrap write-off) or the
  FG/SFG is already consumed/sold.
- Audit: every reversal step logged.

### 5.3 Field locking (maps DOC 09 Locked-when)
- CREATED/RELEASED lock prevents modification of already-released BOM/route/order header keys.
- ≥SUBMIT locks quantity/timing fields (accepted/rejected/rework/scrap, consumed, dates).
- ≥APPROVE/RELEASE locks approval-bearing documents from re-edit; only REVERSAL allowed.
- Renumbering is never a consequence of any transition.

---

**END OF DOCUMENT 11**