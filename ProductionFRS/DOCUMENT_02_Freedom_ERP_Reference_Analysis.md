# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 02 — FREEDOM ERP REFERENCE ANALYSIS

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 02 — Freedom ERP Reference Analysis |
| Reference screen | Production Entry (route-sheet / operation-centric) |
| Source classification | REF = Freedom ERP Reference Behavior |
| Status | ANALYSIS — reference review; basis for improvements in DOC 04 |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

**Note on screenshot:** The reference screenshot (Production Entry) could not be opened as
an image in this session; this document is built from the authoritative field-level
textual breakdown in `production-entry.md`, which documents the screen header, quantity
summary, route-sheet info, material-consumption grid, and output/stage sections.

---

## TABLE OF CONTENTS

1. Reference Screen Summary
2. Screen Purpose and Business Intent
3. Screen Structure (logical areas)
4. Section A — Production Header
5. Section B — Production Summary / Process Quantity
6. Section C — Route Sheet and Operation Information
7. Section D — Material Consumption Grid
8. Section E — Production Output / Stage
9. Retain / Improve / Remove / Unclear / Missing Register
10. Reference Weaknesses Requiring Redesign
11. Reference Strengths to Preserve
12. Reference → Zyger Mapping (what changes where)

---

## 1. REFERENCE SCREEN SUMMARY

| Attribute | Value |
|---|---|
| Screen ID (reference) | SCR-PROD-001 (reference) |
| Screen Name | Production Entry |
| Source | REF |
| Core entity | One Production Entry against a selected Route Sheet, Process/Operation, Machine, Operator, Shift |

The reference screen is a **single-document, operation/route-centric production recording
transaction**. It captures quantity, material, machine, operator, time, and output in one
screen. It is a useful starting point but has several design weaknesses that must be
improved, not copied.

---

## 2. SCREEN PURPOSE AND BUSINESS INTENT

Business intent (source REF, consistent with CR-PROD-001):

- Record actual production performed for a route sheet + operation.
- Capture production quantity (processed / accepted / rejected / pending / WIP).
- Capture route-sheet context (route no, possible qty, target qty, UOM).
- Capture machine, operator, supervisor, shift.
- Capture process time, rate, machine-hour rate (MHR).
- Capture material consumption (requested / issued / available / consumed / deviation / returned).
- Capture idle time and idle reason.
- Capture output / stage quantity and weight.

---

## 3. SCREEN STRUCTURE (LOGICAL AREAS)

```
PRODUCTION ENTRY
│
├── A. Production Header
├── B. Production Summary / Process Quantity
├── C. Route Sheet and Operation Information
├── D. Material Consumption
└── E. Production Output / Stage Information
```

---

## 4. SECTION A — PRODUCTION HEADER

| Field ID (ref) | Field Name | Purpose | Retain? | Verdict |
|---|---|---|---|---|
| PROD-H-001 | Entry Type | Defines transaction type (Production Entry) | Retain, but make a controlled category | ENHANCE |
| PROD-H-002 | Production Type | General / Rework | Retain but make rework a traced sub-type | ENHANCE |
| PROD-H-003 | Supervisor | Responsible supervisor (EMP004 - ASHISH KUMAR) | Retain; validate active/plant/authorized | RETAIN |
| PROD-H-004 | Entry Date | Transaction entry date | Retain; separate from Actual Production DateTime | ENHANCE |
| PROD-H-005 | Entry No | Auto-generated (`PROD/0663/26-27`) | Retain; formalize numbering + preview/reserve | ENHANCE |

### 4.1 Entry Type
Reference value: a fixed label "Production Entry". Proposed improvement: a controlled
catalogue of production categories — Production Entry, Rework Entry, Multiple-Output Entry,
Conversion Entry, Disassembly Entry. Entry Type drives fields, workflow, inventory logic,
costing, and quality workflow. Must be locked after save.

### 4.2 Production Type (General / Rework)
Reference treats rework as a simple radio option. This is weak. Rework must be a **traced
transaction** linking to the original Production Entry, the rejected/reworkable quantity,
the Non-Conformance (NCR) record, and the rework route. A bare "Rework" radio without
source linkage is a traceability risk (R-PROD-003).

### 4.3 Supervisor
Source: Employee Master. Validation: must be Active, assigned to plant/division, authorized
for production supervision. Editable in Draft; locked after submission.

### 4.4 Entry Date vs Actual Production Date
The reference conflates entry date and production date. Recommended: separate
`Entry Date` (transaction date) and `Actual Production Date/Time` (when the work occurred).
This supports late entry of prior-shift production (critical in machine shops).

### 4.5 Entry Number
Reference format `PROD / 0663 / 26-27`. Recommended configurable format
`PROD-{PLANT}-{FY}-{SERIES}`. Numbering must implement **preview vs reservation** with
server-side concurrency control (see DOCUMENT 07, numbering rules). Browser refresh must
never consume or randomly change the number.

---

## 5. SECTION B — PRODUCTION SUMMARY / PROCESS QUANTITY

Reference structure:

```
Produced Quantity
├── Processed
├── Accepted
└── Rejected

Pending Quantity
├── Production Pending
└── Inspection Pending

WIP Quantity
├── General WIP
└── Rework WIP
```

### 5.1 Processed Quantity
Formula (proposed): `Processed = Accepted + Rejected + Rework + Scrap`
Depending on the business, rejected may later split into reworkable / scrap / hold / MRB.
This is captured as CLAR-PROD-002.

### 5.2 Accepted Quantity
Constraint: `Accepted ≤ Processed`. Represent net accepted output.

### 5.3 Rejected Quantity
Reference uses one generic rejected value. Recommended structured breakdown:
`Rejected → Reworkable / Scrap / Hold-MRB`. Improves quality + scrap traceability.

### 5.4 Pending Quantity (Production Pending / Inspection Pending)
- Production Pending = Planned/available operation qty − Completed production qty.
- Inspection Pending = Produced qty − Inspected qty.
Reference displays these as read fields but the formulas were not enforced. Zyger computes all
pending/WIP values in the backend (never user-entered) to avoid inconsistency (R-PROD-002).

### 5.5 WIP Quantity
Reference distinguishes General WIP and Rework WIP — a useful concept to retain and extend to:
`WIP → Normal Production / Rework / Quality Hold / Blocked`. WIP is tracked per operation
(DEC-PROD-001).

---

## 6. SECTION C — ROUTE SHEET AND OPERATION INFORMATION

| Field (ref) | Example | Verdict |
|---|---|---|
| Route Sheet No | RSHT/0020/26-27 | RETAIN (primary process source) |
| Pending Sequence Only | checkbox | RETAIN (filter pending ops) |
| Possible Qty | 2400 | ENHANCE (compute; read-only) |
| Route Sheet Qty | 3000 | RETAIN (immutable after start unless approved change) |
| UOM | — | RETAIN |
| Route Sheet Date | — | RETAIN |
| Process | 2 - CNC-2nd Operation | RETAIN (from approved route sheet; not free text) |
| Operator | — | RETAIN + validate (active/plant/skill/authorization) |
| Machine | search | RETAIN + validate (work center/machine eligibility) |
| Shift | -- Select -- | RETAIN (Shift Master) |
| Start/End (Date+H:M:S) | — | ENHANCE (use proper DateTime; runtime computed) |
| Process Time | 0:1:0:0 | ENHANCE (store duration in seconds; display HH:MM:SS) |
| Process Rate | 3.00 | CLARIFY (ambiguous: qty/hr? cycle rate?) |
| MHR | — | ENHANCE (cost snapshot, not live master only) |
| Target Qty | — | RETAIN (planned target) |
| Total Weight | — | RETAIN |

### 6.1 Route Sheet — primary manufacturing source
Chain: Sales/Demand → Planning → Work Order → BOM → Route Sheet → Job Card/Operation →
Production Entry. Route sheet is engineering-owned (Engineering module); Production consumes
it read-only.

### 6.2 Pending Sequence Only
Checkbox to filter only eligible pending operations. Supports Operation Sequence Control
(BR-PROD-010): Operation 10 must complete before Operation 20, unless parallel/alternate/
rework/override authorization.

### 6.3 Possible Qty
Proposed formula: `Possible Qty = Accepted from previous op + Approved WIP − Already processed
in current op`. System-computed and read-only (never user-entered).

### 6.4 Route Sheet Qty
Planned manufacturing quantity. Immutable once production starts unless a controlled,
approved revision.

### 6.5 Process / Operator / Machine / Shift
- Process: selected from approved route sheet, never free-form.
- Operator: validated (active, plant, skill/competency, machine authorization, shift policy).
- Machine: validated against route-sheet work center, active, not under breakdown, eligible
  for process (BR-PROD-020).
- Shift: from Shift Master.

### 6.6 Time model
Combine Start/End date+time parts into proper `Actual Start DateTime` / `Actual End DateTime`.
Elapsed/Runtime is system-computed: `Elapsed = End − Start`. Never allow manual edit of
calculated runtime.

### 6.7 Process Rate / MHR (ambiguous)
"Process Rate" meaning is unclear (CLAR-PROD-007). Options: units per hour or cycle time.
Recommended explicit names: `Standard Production Rate` / `Cycle Time` / `Units Per Hour`.
MHR (Machine Hour Rate) should be captured as a **cost snapshot** at entry time, not only a
live read from Machine Master.

---

## 7. SECTION D — MATERIAL CONSUMPTION GRID

Reference fields:

```
RM Code | RM Name | Req Qty | Total Issued Qty | Available Qty |
Cons Qty | Dev Qty | Rtn Qty | Rate | Batch | End Bit Qty
```

| Field (ref) | Verdict | Notes |
|---|---|---|
| RM Code | RETAIN | From approved BOM |
| RM Name | RETAIN (derived) | From Item Master; read-only |
| Req Qty | RETAIN | BOM-calculated (qty × consumption rate) |
| Total Issued Qty | RETAIN (read-only) | From Inventory issue transactions |
| Available Qty | ENHANCE (compute) | Issued − previously consumed + approved returned |
| Cons Qty | RETAIN | ≤ Available unless approved additional material |
| Dev Qty | RETAIN (compute) | Actual − standard BOM consumption; approve if beyond tolerance |
| Rtn Qty | RETAIN | Unused → return transaction → store update |
| Rate | RETAIN (read-only) | From Inventory costing engine; not user-changeable |
| Batch | RETAIN | Batch/lot tracking (supplier lot → receipt → issue → consumption → output) |
| End Bit Qty | CLARIFY | Meaning unclear (residual/end-piece quantity?) — CLAR-PROD-009 |

### 7.1 Material workflow requirement
A posted production entry must create a **controlled stock transaction** — never a direct
overwrite of stock balance. Material rows carry transaction headers/lines: item, qty, UOM,
store/rack/bin, lot/batch, reference document, transaction date, cost, user, timestamp
(see DOC 07 inventory integration).

---

## 8. SECTION E — PRODUCTION OUTPUT / STAGE

Reference fields: Stage / Process / Qty / Weight.

Recommended structured output (not a bare stage summary):
- Accepted Qty
- Rejected Qty
- Rework Qty
- Scrap Qty
- Output Weight
- Output Lot / Batch
- Destination Stage

This becomes the operation-level output block (DEC-PROD-001).

---

## 9. RETAIN / IMPROVE / REMOVE / UNCLEAR / MISSING REGISTER

### 9.1 Retain
- Route-sheet-centric manufacturing context.
- Possible/route/target quantity concept.
- Machine/operator/shift capture.
- Material consumption grid (req/issued/available/consumed/dev/return/rate/batch).
- General vs Rework distinction (as a seed).
- Pending qty (production + inspection) and WIP (general + rework) as concepts.
- Idle time + idle reason.
- Supervisor + entry date + entry number.

### 9.2 Improve
- Rework → traced transaction (source entry + NCR + qty cap + rework route).
- Entry type → controlled catalogue.
- Time → single DateTime + computed runtime.
- Quantities → backend-computed, not user-entered summary.
- Single operation view → final-part-centric workspace over per-operation events (DEC-PROD-001).
- Numbering → preview/reservation + concurrency (DOC 07).

### 9.3 Remove / do not copy
- Placeholder "Index Entry"/"Process Rate" ambiguity without clear meaning.
- Free-form process names (must be route-sheet driven).
- Manually editable pending/WIP/available values.
- Rework as a bare radio button without source document.

### 9.4 Unclear (clarifications)
- Process Rate meaning (CLAR-PROD-007).
- MHR rate basis (CLAR-PROD-008).
- End Bit Qty meaning (CLAR-PROD-009).
- "Pending Sequence Only" exact filter scope (assumed; see CLAR-PROD-010).
- Batch vs lot vs end-bit semantics (assumed; see CLAR-PROD-011).

### 9.5 Missing (to add)
- Mandatory quality gate (inspection required → next op blocked until accepted).
- Operation sequence control with authorized override.
- Material deviation/tolerance approval workflow.
- Cost snapshot of MHR/rate at entry.
- WIP per operation (not only general/rework totals).
- Document status lifecycle (Draft → Validated → Submitted → Approved → Completed/Closed, plus Cancel/Reverse).
- Audit trail and error-tolerant numbering.

---

## 10. REFERENCE WEAKNESSES REQUIRING REDESIGN

1. **Flat single-entry model** — hides per-operation execution, machine, operator, WIP.
   Redesigned by DEC-PROD-001 (final-part workspace over operation events).
2. **Manual summary quantities** — inconsistent WIP/pending.
3. **Rework without traceability** — breaks rejection/scrap/quality linkage.
4. **No mandatory quality gate** — output can advance to next operation before acceptance.
5. **Ambiguous metrics** (Process Rate, MHR, End Bit) — confusing and non-deterministic.
6. **Per-part time fields** (D/H/M/S) — error-prone; replaced by DateTime + duration.
7. **No defined numbering/concurrency** — risk of duplicate/re-changing document numbers.
8. **No status lifecycle / audit** — cannot track approval, reversal, cancellation.

---

## 11. REFERENCE STRENGTHS TO PRESERVE

- Route/operation-oriented data capture philosophy (matches CNC reality).
- Material consumption grid with issued/available/consumed/deviation/return (strong).
- Distinction of production vs inspection pending and general vs rework WIP (conceptual seed).
- Idle time + reason capture (feeds OEE and downtime).
- Machine/operator/shift on the transaction (feeds machine & manpower analysis).

---

## 12. REFERENCE → ZYGER MAPPING (WHAT CHANGES WHERE)

| Reference element | Zyger treatment | Where specified |
|---|---|---|
| Production Entry (single op screen) | Final-Part Production Workspace + per-operation events | DEC-PROD-001 (DOC 03), DOC 07-§04, DOC 08-C |
| Entry Type / Production Type | Controlled catalogue; Rework = traced transaction | DOC 07-§04, §07 |
| Quantity summary | Backend-computed; structured output (accepted/rejected/rework/scrap) | DOC 07-§06 |
| Route sheet info | Consumed read-only from Engineering | DOC 07-§16 |
| Machine/Operator/Shift | Validated op-level capture | DOC 07-§12, §14 |
| Time/Idle | DateTime + duration; idle-reason catalogue | DOC 07-§09 |
| Material consumption | Controlled stock transactions; deviation tolerance approval | DOC 07-§05, §15 |
| Output/stage | Structured op output + WIP | DOC 07-§06 |
| Numbering | Preview vs reservation + concurrency | DOC 07-§21 |

**END OF DOCUMENT 02**