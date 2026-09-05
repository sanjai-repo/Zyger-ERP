# DOCUMENT_46 — PRODUCTION ENTRY FUNCTIONAL REQUIREMENT SPECIFICATION

| Field | Value |
| --- | --- |
| Document ID | DOCUMENT_46 |
| Document Title | Production Entry Functional Requirement Specification |
| Module | Zyger ERP — Production |
| Document Type | Functional Requirement Specification (FRS) |
| Status | Draft for review — documentation only |
| Version | 1.0 |
| Date | 2026-09-04 |
| Scope | Functional requirements for Production Entry within the confirmed Production module ownership boundaries |

**MODE: DOCUMENTATION / ANALYSIS ONLY. NO IMPLEMENTATION PERFORMED.**

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Document ID | DOCUMENT_46 |
| Document Title | Production Entry Functional Requirement Specification |
| Module | Zyger ERP — Production |
| Document Type | Functional Requirement Specification |
| Status | Draft for review |
| Version | 1.0 |
| Date | 2026-09-04 |
| Scope | Production Entry execution-recording function; its functional scope, workflow position, quantity model, validation, lifecycle, and module-ownership boundaries. No implementation, schema, or API design. |

---

## 2. Document Purpose

Production Entry is the Production module's **execution-recording function**: it records actual manufacturing work performed on the shop floor at the level of a production operation. It captures operational quantities (processed, accepted, rejected, rework, scrap), the machine/operator/shift context, timing, and the linkage to the authorized production context (Production/Work Order, Job Card, Subjob, Route operation).

This document specifies the **functional requirements** for Production Entry only. It does **not** authorize Production to own inventory ledger posting, stock mutation, quality disposition, engineering ownership, costing valuation, or maintenance breakdown ownership. Integration boundaries and responsibilities are documented; nothing is implemented.

---

## 3. Functional Scope

### In scope (Production Entry covers)
- Recording an operation-level production execution event.
- Recording operational quantities (input/processed/produced/accepted/rejected/rework/scrap).
- Recording machine, operator, shift, and timing context.
- Linking to the authorized production context (Production/Work Order, Job Card, Subjob, Route operation).
- Draft/Submit status and lifecycle of the entry record.
- Generating functional requirements for entry numbering, idempotency, audit, and validation.
- Producing downstream data/feedback for derived WIP/Pending and integration **intents** (not postings).

### Out of scope (Production Entry does NOT cover)
- Direct inventory ledger / stock balance / stock quantity mutation.
- Quality disposition, NCR, CAPA, quality release or approval.
- Engineering ownership of BOM / Route Sheet.
- Cost valuation and allocation.
- Maintenance breakdown ownership.
- The P4 normalized execution engine, P3.4 backfill, quarantine resolution, migrations.

---

## 4. Source Requirement Evidence

| Requirement Area | Source Document | Requirement Evidence | Classification |
| --- | --- | --- | --- |
| Production Entry core (operation-level event) | DOCUMENT_07 §04 | FR-PROD-ENTRY-001 (input/processed/accepted/rejected/rework/scrap, machine, operator, shift, datetime, runtime, idle, inspection, material consumption) | CR |
| Final-part workspace (aggregate) | DOCUMENT_07 §04 / DOCUMENT_08 §C | FR-PROD-ENTRY-004, DEC-PROD-001 (hybrid final-part-centric execution) | CR |
| Rework Production Entry | DOCUMENT_07 §04 | FR-PROD-ENTRY-002 (rework op event linked to original + NCR + qty cap) | CR |
| Multiple-Output Production Entry | DOCUMENT_07 §04 | FR-PROD-ENTRY-003 (primary + co/by-products per operation) | CR |
| Quantity model (good/reject/rework/scrap) | DOCUMENT_07 §04, committed `ProductionEntry` | goodQuantity, rejectedQuantity, reworkQuantity, scrapQuantity, processQty, producedQuantity | CR |
| Quantity reconciliation formula | DOCUMENT_06 CLAR-PROD-002 | Processed = Accepted+Rejected+Rework+Scrap; Pending/WIP derived | OPEN CLARIFICATION |
| Status vocabulary | committed `ProductionEntry.status` | DRAFT, POSTED, SUBMITTED, APPROVED, REJECTED, CANCELLED, REVERSED | CR (committed) |
| Stock-posting boundary | DOCUMENT_07 §15.1 / DEC-PROD-004 | Never overwrite stock; Production posts intents; Inventory is ledger | CR |
| Quality boundary | DOCUMENT_07 §14 / DOCUMENT_03 §2.3 | Production generates inspection-pending & dispositions; NCR/CAPA/PPAP owned by Quality | CR |
| Rejection classification/disposition | DOCUMENT_10 BR-PROD-REJ-001 | {REWORKABLE/SCRAP/HOLD_MRB}; scrap/hold disposition owned by Quality | CR |
| Subjob mapping | DOCUMENT_06 CLAR-PROD-005 | Subjob 1:1 route-op default; free only under auth | OPEN CLARIFICATION |
| Quality-gate override | DOCUMENT_06 CLAR-PROD-012 | Override authorization level/policy | OPEN CLARIFICATION |
| Sampling functionality | DOCUMENT_06 CLAR-PROD-013 | SAMPLING vs PPM; no functionality designed until resolved | OPEN CLARIFICATION |
| Numbering rule | DOCUMENT_07 §21 | Preview repeatable; reservation permanent on save/draft; never reused | CR |
| Engineering route/BOM read-only | DOCUMENT_07 §16 / ASM-PROD-005 | BOM/Routing owned by Engineering; Production consumes approved versions | CR |
| WIP/Pending derived | DOCUMENT_06 ASM-PROD-001 | Backend-derived, single source of truth | DR |
| Idle time within entry | DOCUMENT_07 §09 | FR-PROD-IDLE-001 (runtime, idle time/reason) | CR / DP for entry-level capture |

---

## 5. Production Entry Business Objective

- **Why it exists:** Records the actual manufacturing work performed per operation on the shop floor, forming the authoritative record of Production execution.
- **Business problems solved:**
  - Shop-floor visibility of operation-level output and progress.
  - Quantity accountability (who produced how much, accepted/rejected/rework/scrap, on which machine/operation).
  - Traceability from a production operation back to the authorized order/work/job context and forward to quality/inventory/planning actuals.
- **Shop-floor purpose:** capture per-operation execution fact at the point of work.
- **Traceability purpose:** link output quantities to authorized production context, operator, machine, shift, time.
- **Quantity accountability:** atomically record accepted/rejected/rework/scrap so that derived WIP/Pending remain consistent.
- **Integration boundaries:** record business facts in Production; emit data/intents to downstream Quality and Inventory without authorizing direct postings.

---

## 6. Production Entry Position in Production Workflow

Conceptual workflow position (marks ownership boundaries):

```
Production Planning                       [Planning Layer]
        ↓
Production Order / Work Authorization     [Production — authorization-level doc]
        ↓
Job / Operation Execution                [Production — Job Card / Subjob / Operation]
        ↓
Production Entry                         [Production EXECUTION RECORD]  ← THIS DOCUMENT
        ↓
Quality (inspection/disposition/NCR)     [Quality-Owned]   (Production records inspection-pending only)
Inventory (posting/ledger)               [Inventory-Owned] (Production emits intents only)
Planning (actuals for plan-vs-actual)    [Planning consumes]
```

Boundary: Production Entry sits at the **execution-fact** layer. It feeds (but does not perform) downstream Quality disposition and Inventory posting.

---

## 7. Entry Types

| Entry Type | Purpose | Trigger | Source Document | Quantity Effect | Quality Interaction | Inventory Interaction | Approval | Status Lifecycle |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Standard Production Entry | Record one operation event | Operator/supervisor initiates on an active job | Production/Work Order → Job Card → Operation | process input; accepted/rejected/rework/scrap outputs | Generates inspection-pending; disposition external | Intent only (no posting) | Submit for authorization as per workflow | DRAFT → SUBMITTED → APPROVED (see §12) |
| Rework Production Entry | Record rework execution on rejected/reworkable qty | Authorized rework of rejected qty | Original entry + NCR + rework route (FR-PROD-ENTRY-002) | Rework input/output; qty cap per authorization | Rejected/rework disposition ownership with Quality | Intent only | Requires rework authorization | DRAFT → SUBMITTED → APPROVED (reversal rules per DOC_11 §5.2 as required) |
| Multiple-Output Production Entry | Record primary + co/by-product outputs | Operation yielding co/by-products | Same operation context (FR-PROD-ENTRY-003) | Primary + co/by-product quantities; weight/destination-stage | Per-output inspection where applicable | Intent only | As per standard entry | DRAFT → SUBMITTED → APPROVED |
| Production Log Sheet (adjacent) | Per-shift/machine activity history | Shift/machine activity | Machine/shift (FR-PROD-LOG-001) | None (activity) | Inspection/wait reasons recorded | None | N/A (record) | Separate lifecycle |

**Classification:** Standard/Rework/Multiple-Output are CR (documented). Entry-level idle-time capture is a DP unless confirmed. No entry type is invented beyond documented ones.

---

## 8. Production Entry Header Information

| Field | Description | Source | Mandatory | Editable Rule | Validation |
| --- | --- | --- | --- | --- | --- |
| Entry Number | Auto-generated execution identifier | Numbering rule (§17) | Y | Read-only after reservation | Unique; never reused (CR) |
| Entry Date | Business date of the entry | System/calendar | Y | Set at creation | Valid business date |
| Production Order / Work Order | Authorizing document reference | Authorized order | Y | Read-only for context | Must exist & be authorized |
| Job Card | Execution document reference | Job Card | Y | Read-only for context | Must exist & be active |
| Subjob | Operation/group under job | Subjob | Y* | Read-only for context | 1:1 route-op (CLAR-PROD-005) |
| Operation | Route operation executed | Route Sheet | Y | Validate against route sequence | Must be eligible route op |
| Machine | Machine used | Machine master | Y | Validate authorization | Must be authorized machine |
| Employee / Operator | Person executing | Employee/operator master | Y | Validate assignment | Must be assigned operator |
| Shift | Shift of execution | Shift master | Y | Set at entry | Valid shift |
| Entry Status | Lifecycle state | §12 | Y | Via workflow only | Valid transition |
| Route Sheet No | Route reference | Engineering | Y | Read-only | Must be approved route (CR) |
| Start/End DateTime | Actual execution window | Operator | Y | Draft editable | End >= Start |

*Subjob mandatory depends on CLAR-PROD-005 resolution. Fields are functional; no schema design.

---

## 9. Production Entry Quantity Information

Distinguish quantity concepts using committed terminology (`ProductionEntry`):

- **Input quantity** — the operation input (resolved via `ProductionInputAuthorityResolver`; effective input).
- **Processed quantity** — `processQty` (a.k.a. `producedQuantity`) processed through the operation.
- **Accepted quantity** — `goodQuantity` (passes to next operation / FG).
- **Rejected quantity** — `rejectedQuantity`.
- **Rework quantity** — `reworkQuantity`.
- **Scrap quantity** — `scrapQuantity`.
- **Pending quantity** — planned/ordered minus completed output (derived; ASM-PROD-001).
- **Balance quantity** — remaining pipeline quantity (derived).

**Reconciliation note:** The exact formula for Processed / Pending / WIP / Inspection-Pending is **OPEN CLARIFICATION** (CLAR-PROD-002). This document preserves that clarification; it does **not** silently decide the formula.

---

## 10. Quantity Reconciliation Rules

- **Required checks:** Accepted + Rejected + Rework + Scrap should reconcile against Processed/effective input (subject to CLAR-PROD-002 confirmation).
- **Allowed relationships:** outputs must not exceed the authorized/processed input allowed (pending formula confirmation).
- **Overproduction handling:** must be flagged/validated; behavior per OPEN CLARIFICATION (not silently decided).
- **Underproduction handling:** leaves Pending; recorded as partial production.
- **Rejection handling:** rejected quantity classified to {REWORKABLE / SCRAP / HOLD_MRB}; disposition owned by Quality (BR-PROD-REJ-001).
- **Rework handling:** rework quantity re-enters a later operation via authorized rework entry (FR-PROD-ENTRY-002).
- **Partial production:** supported (partial material issue/consumption allowed; ASM-PROD-003).

Any unresolved reconciliation is explicitly marked **OPEN CLARIFICATION** (CLAR-PROD-002).

---

## 11. Operation and Route Validation

Functional validation (not implemented):
- Production Entry must reference an **authorized Production/Work Order**.
- The operation must belong to the **Route Sheet operation sequence** (Engineering read-only; ASM-PROD-005).
- Entry must conform to the **Job / Subjob** relationship (subjob 1:1 route operation default; CLAR-PROD-005).
- **Machine authorization** — machine must be valid/assigned to the operation/work-center.
- **Operator authorization** — operator must be valid/assigned.
- Entry must respect **operation sequence** (prerequisite operations completed where applicable).
- Entries must **not** invent operations that conflict with the Route Sheet.

---

## 12. Production Entry Status Lifecycle

Statuses evidence: committed `ProductionEntry.status` enum — `DRAFT, POSTED, SUBMITTED, APPROVED, REJECTED, CANCELLED, REVERSED`.

| From | Action | To | Classification |
| --- | --- | --- | --- |
| DRAFT | Save | DRAFT | CR (committed) |
| DRAFT | Submit | SUBMITTED | CR (committed) |
| SUBMITTED | Approve/Authorize | APPROVED | CR (committed) |
| SUBMITTED | Reject | REJECTED | CR (committed) |
| DRAFT/SUBMITTED | Cancel | CANCELLED | CR (committed) |
| APPROVED | (Controller action POST/REVERSE) | POSTED / REVERSED | CR (committed) |

Note: `POSTED`/`REVERSED` appear in the committed enum and relate to posting/reversal of the entry record. Exact transition table beyond the above is per DOCUMENT_11 (document status vs execution status dims). Any additional proposed status is **DEVELOPMENT PROPOSAL**.

---

## 13. Quality Interaction Boundary

- **Production records:** inspection-pending signals, rejected/rework/scrap dispositions **as operational facts**, and references to Quality (NCR).
- **Quality owns:** inspection disposition, NCR, CAPA, quality release, quality approval rules.
- **HOLD/rejection/scrap approval:** scrap and HOLD_MRB disposition approval is Quality-owned (BR-PROD-REJ-001).
- **Rework** must link to original entry + NCR + authorized rework qty (ASM-PROD-002).
- **Override rules** for a mandatory quality gate are **OPEN CLARIFICATION** (CLAR-PROD-012) — not silently decided.

---

## 14. Inventory Interaction Boundary

Strict boundary (DEC-PROD-004):

```
Production Entry (records business facts / quantities)
        ↓  (produces posting INTENTS only — issue/consumption/receipt/return)
Authorized Integration Boundary
        ↓
Inventory-owned Posting   (stock_ledger, stock_balance, inventory quantity)
```

- Production Entry **must not** directly mutate `stock_ledger`, `stock_balance`, or inventory quantity.
- Material requirement/consumption confirmation and FG/SFG/return/scrap **intents** are the Production-side contribution; the Inventory module is the ledger.
- No implementation design in this document.

---

## 15. Production Entry Validation Rules

| Validation | Rule (functional) | Classification |
| --- | --- | --- |
| Required fields | Authorized context (order/work/job/subjob), operation, machine, operator, shift, dates, at least one quantity | CR |
| Date validation | End >= Start; within allowed period; late-entry guard per BR-PROD-004 | CR |
| Quantity validation | Non-negative; reconciliation per §10 | CR (formula DR) |
| Authorization validation | Submit/approve restricted to authorized roles | DR |
| Operation validation | Operation belongs to route sequence & is eligible | CR |
| Duplicate entry prevention | No duplicate for the same context+operation+window (§16) | CR |
| Status validation | Only valid transitions (§12) | CR |
| Machine validation | Machine authorized for the operation | CR |
| Operator validation | Operator assigned/valid | CR |
| Production order validation | Order is authorized/released/ not closed | CR |

---

## 16. Duplicate and Idempotency Requirements

Functional requirements:
- Prevent **duplicate Production Entries** for the same context/operation/qualifying window.
- Prevent **duplicate submission** (a submitted entry cannot be re-submitted).
- **Refresh-related duplicate numbers:** an auto-generated document number **must not unnecessarily change on page refresh**.
- If a document is **not saved/drafted**, the same available number may be shown again on refresh.
- Once **saved or drafted successfully**, the system moves to the **next number**.
- **Repeated requests / accidental double-save** must be idempotent (no duplicate rows).
- Functional only; no schema/implementation.

---

## 17. Auto-Generated Production Entry Number Rules

Numbering rule per DOCUMENT_07 §21 (BR-NUM-001):
- **Preview:** a number preview may repeat and does **not** consume the sequence.
- **Save/Draft behavior:** number is **permanently reserved** once successfully saved as Draft or Submitted.
- **Refresh:** same available (unreserved) number may be shown again until reserved.
- **Cancellation before save:** number not reserved; next available may be presented.
- **Concurrent users:** reservation is atomic; two users never obtain the same reserved number.
- **Duplicate prevention:** reserved numbers are **never reused**.
- Format: `PE-{PLANT}-{FY}-{SEQ}` (FR-PROD-ENTRY numbering; NUM-PROD-ENTRY).
- Functional only; no sequence/implementation design.

---

## 18. Edit, Cancel and Correction Rules

Functional rules (unresolved marked clearly):
- **Draft editing:** editable free-form; corrected before submission.
- **Submitted editing:** restricted / requires withdrawal or rejection — rule per DOCUMENT_11, **OPEN CLARIFICATION** if not explicitly stated.
- **Approved entry correction:** via an audited correction/reversal (REVERSED state) rather than silent overwrite — confirmation per DOCUMENT_11 §5.2; mark unresolved points clearly.
- **Cancellation:** reason capture required; entry becomes CANCELLED.
- **Audit requirements:** all edits/cancellations/corrections audited (§20).
- **Reason capture:** cancellation and correction reasons recorded.
- Do **not** assume irreversible rules unless confirmed.

---

## 19. Error and Exception Handling

Business scenarios (functional behavior only):
- **Invalid quantity** → reject save with validation message.
- **Unauthorized operation** → block/403-equivalent functional refusal.
- **Invalid status transition** → refuse invalid action.
- **Duplicate entry** → refuse duplicate for same context/operation.
- **Closed production order** → block entry.
- **Invalid machine** → block / warn.
- **Quality HOLD** → block progression beyond the gate (override per CLAR-PROD-012).
- **Missing route** → cannot validate operation; entry blocked.
- **Integration unavailable** → surface a functional error without causing partial/inconsistent data.

---

## 20. Audit and Traceability Requirements

Audit trail required (functional; no table design):
- Created by · Created date/time
- Modified by · Modified date/time
- Approval actions (who/when)
- Status transitions (from→to, by, when)
- Cancellation reason
- Correction/reversal reason
- Operator, machine, shift, operation captured per entry for traceability

---

## 21. Role and Responsibility Matrix

| Role | Create | Edit | Submit | Approve | Cancel | View |
| --- | --- | --- | --- | --- | --- | --- |
| Shop-floor Operator | Y | Y (draft) | Y | – | – | Y |
| Production Supervisor | Y | Y | Y | Y | Y | Y |
| Production Manager / Authorizer | – | – | Y | Y | Y | Y |
| Quality (disposition) | – | – | – | disposition only | – | Y |
| Management (read) | – | – | – | – | – | Y |

Exact permission mapping is not RBAC-designed and, where not explicitly confirmed, is **DEVELOPMENT PROPOSAL / OPEN CLARIFICATION**.

---

## 22. Integration Boundary Matrix

| External / Internal Module | Production Entry Responsibility | Other Module Responsibility | Boundary |
| --- | --- | --- | --- |
| Planning | Provide execution actuals for plan-vs-actual | Schedule/plan authority | Actuals feedback; Planning consumes |
| Production Order | Reference authorized order (context) | Authorize/release order | Entry uses authorized order |
| Engineering | Consume approved Route/BOM | Own BOM & Route Sheet | Read-only (ASM-PROD-005) |
| Quality | Generate inspection-pending + disposition references | Inspection disposition, NCR, CAPA, release, approval | Recording vs disposition split |
| Inventory | Produce posting **intents** | Ledger postings (stock_ledger/balance/qty) | Intent → authorized posting (DEC-PROD-004) |
| Maintenance | Record idle/stoppage/reference breakdown | Own breakdown work orders | Availability data exchange |
| Costing | Provide execution actuals (time/qty/output) | Own rates/rules/value allocation | Production provides data; Costing computes |

---

## 23. Functional Workflow

```
Authorized Production Work (Order/Work released)
        ↓
Select Production Context (Order → Job → Subjob → Operation)
        ↓
Enter Execution Information (machine, operator, shift, dates)
        ↓
Validate Operation (route sequence, eligibility, machine/operator auth)
        ↓
Enter Quantities (processed/accepted/rejected/rework/scrap)
        ↓
Validate Quantities (reconciliation, non-negativity)
        ↓
Save Draft / Submit
        ↓
Production Execution Record Created (status lifecycle)
        ↓
Quality / Inventory downstream boundary (inspection-pending; posting intents)
```

No automatic inventory posting is implied unless confirmed (DEC-PROD-004 keeps posting at Inventory).

---

## 24. Screen-Level Functional Requirements

Production Entry screen areas (conceptual; no UI code):
- **Header** — Entry number, date, status (CR).
- **Production Context** — Order/Work, Job Card, Subjob, Route Sheet, Operation (CR; subjob DR).
- **Operation Information** — operation, sequence, machine, operator, shift (CR).
- **Quantity Information** — processed, accepted, rejected, rework, scrap, pending (CR; formula DR).
- **Machine / Operator Information** — machine, operator, shift (CR).
- **Quality Information** — inspection-pending, rejection/rework/scrap disposition references, HOLD (CR; disposition to Quality).
- **Remarks** — free text (CR/DP).
- **Attachments** — if supported (DP unless confirmed).
- **Audit / History** — creation/modification/transitions (CR).

Each field/section is classified; no frontend code.

---

## 25. Open Clarifications

Carried forward (not resolved without evidence):
- **CLAR-PROD-002** — Quantity reconciliation (Processed=Accepted+Rejected+Rework+Scrap; Pending/WIP derived).
- **CLAR-PROD-005** — Subjob ↔ route operation mapping (1:1 default; free only under auth).
- **CLAR-PROD-012** — Quality-gate override authorization level/policy.
- **CLAR-PROD-013** — SAMPLING vs PPM (no functionality designed).

---

## 26. Assumptions and Development Proposals

### Confirmed Customer Requirements
- Production Entry records operation-level execution and quantities (FR-PROD-ENTRY-001).
- Rework entry (FR-PROD-ENTRY-002), Multiple-Output (FR-PROD-ENTRY-003), Final-part workspace (FR-PROD-ENTRY-004, DEC-PROD-001).
- Numbering rule (BR-NUM-001), stock boundary (DEC-PROD-004), quality boundary (DOC_07 §14).
- Committed status vocabulary and quantity terms.

### Derived Requirements
- WIP/Pending derived read-only (ASM-PROD-001).
- Route/BOM read-only from Engineering (ASM-PROD-005).

### Development Proposals
- Entry-level idle-time capture (if not explicitly confirmed).
- Attachments on the entry screen.
- Exact role-permission matrix (until confirmed).

### Open Decisions
- Quantity reconciliation formula (CLAR-PROD-002).
- Subjob mapping (CLAR-PROD-005).
- Quality-gate override (CLAR-PROD-012).
- Sampling functionality (CLAR-PROD-013).

---

## 27. Explicit Scope Exclusions

Explicitly excluded from DOCUMENT_46 and its disposition:
- Backend implementation
- Frontend implementation
- Database implementation / entities / tables
- Inventory posting implementation
- Stock mutation
- Production Entry code changes
- P4 normalized execution engine
- P3.4 backfill changes
- Quarantine resolution
- Migration creation
- Configuration / application.yaml / SecurityConfig changes
- Git staging / commit / push

---

## 28. Gap Analysis

| Gap ID | Description | Impact | Required Decision |
| --- | --- | --- | --- |
| GAP-46-01 | Quantity reconciliation formula (Processed vs Accepted+Rejected+Rework+Scrap; Pending/WIP) | Inconsistent WIP/pending unless resolved | Confirm formula (CLAR-PROD-002) |
| GAP-46-02 | Subjob ↔ route operation mapping | Job context ambiguity | Confirm mapping (CLAR-PROD-005) |
| GAP-46-03 | Quality-gate override authorization | HOLD override policy undefined | Confirm override level (CLAR-PROD-012) |
| GAP-46-04 | SAMPLING vs PPM semantics | No sampling functionality defined | Confirm semantics (CLAR-PROD-013) |
| GAP-46-05 | Submitted/Approved entry editing & reversal rules | Correction path undefined | Confirm edit/reversal rule (DOC_11 §5.2) |
| GAP-46-06 | Exact role-permission matrix | Authorization map undefined | Confirm roles/permissions |

---

## 29. Acceptance Criteria

Functional acceptance criteria (not code tests):
- Production Entry can be created, saved as Draft, and submitted for execution-recording.
- Entry captures operation, machine, operator, shift, timing, and the quantity set (accepted/rejected/rework/scrap) with non-negative validation.
- Reconciliation and Pending/WIP derivation behave per the confirmed formula once CLAR-PROD-002 is resolved.
- Entry does not mutate inventory/stock; only emits posting intents (DEC-PROD-004).
- Quality disposition (scrap/HOLD/NCR) remains Quality-owned; Production only records/references.
- Duplicate entries and duplicate submissions are prevented; numbering is stable across refresh and never reused after reservation.
- Audit records creation/modification/transitions/reasons.
- Status lifecycle follows the documented transitions.

---

## 30. Recommended Next Documentation Sequence

**Recommended next document: DOCUMENT_47 — Production Job Card Functional Requirement Specification** (Job Card is the direct parent/execution context of Production Entry; its requirements (including subjob mapping, CLAR-PROD-005) must be specified to fully anchor Production Entry's context). Do not create it now.

---

## STEP — FINAL REPORT

1. **Document created:**
   `ProductionFRS/DOCUMENT_46_Production_Entry_Functional_Requirement_Specification.md`

2. **Sections completed:** 30 (Document Control, Purpose, Functional Scope, Source Requirement Evidence, Business Objective, Workflow Position, Entry Types, Header Information, Quantity Information, Quantity Reconciliation, Operation/Route Validation, Status Lifecycle, Quality Boundary, Inventory Boundary, Validation Rules, Duplicate/Idempotency, Numbering Rules, Edit/Cancel/Correction, Error/Exception, Audit/Traceability, Role Matrix, Integration Matrix, Functional Workflow, Screen-Level, Open Clarifications, Assumptions/Proposals, Scope Exclusions, Gap Analysis, Acceptance Criteria, Recommended Next).

3. **Production Entry scope summary:** Operation-level execution-recording function capturing machine/operator/shift/timing and quantities (processed, accepted, rejected, rework, scrap) against an authorized production context; Draft/Submit lifecycle; numbering, idempotency, validation, and audit requirements; emits downstream intents only.

4. **Confirmed ownership boundaries:** Production records execution facts/quantities; **Quality** owns disposition/NCR/CAPA/release/approval; **Inventory** owns ledger/stock postings (Production emits intents, DEC-PROD-004); **Engineering** owns BOM/Route; **Costing** owns valuation; **Maintenance** owns breakdown. Production does not mutate stock or decide quality disposition.

5. **Open dependencies / clarifications:** CLAR-PROD-002, CLAR-PROD-005, CLAR-PROD-012, CLAR-PROD-013, plus GAP-46-05/06.

6. **Recommended next document:** DOCUMENT_47 — Production Job Card Functional Requirement Specification (not created).

7. **Exact Git/file modification summary:** Created exactly one file: `ProductionFRS/DOCUMENT_46_Production_Entry_Functional_Requirement_Specification.md` (untracked). **No tracked files were modified.**

8. **No implementation performed:** Confirmed — no backend/frontend/database/config/migration/API changes.

9. **Existing P3.3/P3.4 files:** Confirmed untouched — all 8 P3.4 untracked files remain unchanged and unstaged.

10. **STOP:** Explicitly confirmed — DOCUMENT_47 not started; no implementation, staging, commit, push, migrations, flags, backfill, or rollback.

---

## MANDATORY FINAL STOP

STOPPED. Awaiting explicit authorization before any next document (DOCUMENT_47) or any implementation.
