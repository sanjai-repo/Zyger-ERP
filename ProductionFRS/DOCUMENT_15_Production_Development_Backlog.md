# DOCUMENT 15 — PRODUCTION DEVELOPMENT BACKLOG (Implementation-Ready Task Breakdown)

| Field | Value |
|---|---|
| Document ID | DOCUMENT_15 |
| Title | Production Development Backlog |
| Source of Truth | DOCUMENTS 01–14 (Approved Production FRS Baseline v1.0) |
| Technology Stack | React (Frontend) · Spring Boot/Gradle (Backend) · PostgreSQL (DB) · REST (API) |
| Baseline Version | 1.0 — Approved for Development |
| Last Status | Controlled bridge between the approved FRS and implementation |

> **Mandatory guards.** This document does **not** add, remove, or redesign requirements. It only
> converts the approved FRS (DOCUMENTS 01–14) into an implementation backbone. All traceability
> fields (Req ID, Screen ID, Field ID, BR ID, API ID, DB Table) point back to DOCUMENTS 01–14.
> If a documented requirement conflicts with this breakdown, DOCUMENTS 01–14 win. Nothing here
> overrides an approved DEC-PROD-* decision.

---

## 1. HIERARCHY & TRACEABILITY MODEL

```
MODULE
  ↓
EPIC
  ↓
FEATURE
  ↓
USER STORY
  ↓
TECHNICAL TASK
  ↓
TEST CASE (DOC 14)
```

### 1.1 Task Record Schema

Every task in this backlog carries the following attributes, mapped to source documents:

| Attribute | Source |
|---|---|
| Task ID | This document |
| Title | This document |
| Description | This document |
| Source Document | DOC 01–14 |
| Requirement ID | DOC 01/07 (R-PROD-*, FR-PROD-*) |
| Screen ID | DOC 08/09 (SCR-PROD-*) |
| Field ID(s) | DOC 09 (FLD-*) |
| Business Rule ID(s) | DOC 10 (BR-PROD-*) |
| Workflow ID(s) | DOC 11 (transaction + status) |
| API ID(s) | DOC 13 (API-*) |
| Database Table(s) | DOC 12 (prod_*) |
| Priority | P0–P3 |
| Dependency | Task IDs that must precede |
| Frontend / Backend / DB / QA | Yes/No markers |
| Acceptance Criteria | From DOC 14 + DOC 09 validation |
| Definition of Done | Phase exit criteria (Section 14) |

### 1.2 Task-ID Convention

- **EP-###** — Epic
- **FE-###** — Feature
- **US-###** — User Story
- **BK-###** — Backend Technical Task
- **FT-###** — Frontend Technical Task
- **DB-###** — Database Task
- **API-###** — API Contract Task (maps to DOC 13 `API-*`)
- **QA-###** — QA / Test Task (maps to DOC 14 `TC-*`)
- **DV-###** — DevOps / CI-CD Task

---

## 2. BACKLOG → EPIC MAP (20 CLASSIFICATIONS)

The backlog is organized into the 20 mandated classifications. Each maps to one or more epics.

| # | Classification | Epic(s) |
|---|---|---|
| 1 | Foundation and Shared Services | EP-01 Foundation, EP-02 Masters & Numbering, EP-03 Workflow/Status, EP-04 Audit & AuthZ |
| 2 | Production Order Management | EP-05 Production Order |
| 3 | Job Card and Job Execution | EP-06 Job Card / Execution |
| 4 | Core Production Entry | EP-07 Production Entry |
| 5 | Material and Consumption | EP-08 Material Request & Consumption |
| 6 | Production Output and WIP | EP-09 Output & WIP |
| 7 | Rework | EP-10 Rework |
| 8 | Rejection and Scrap | EP-11 Rejection & Scrap |
| 9 | Idle Time and Line Stoppage | EP-12 Idle & Stoppage |
| 10 | Production Return | EP-13 Production Return |
| 11 | Conversion / Item Change / Disassembly | EP-14 Conversion & Disassembly |
| 12 | Production Planning Layer | EP-15 Planning Layer |
| 13 | Capacity and Manpower | EP-16 Capacity & Manpower |
| 14 | Quality Integration | EP-17 Quality Integration |
| 15 | Inventory Integration | EP-18 Inventory Integration |
| 16 | Engineering Integration | EP-19 Engineering Integration |
| 17 | Maintenance Integration | EP-20 Maintenance Integration |
| 18 | Costing Integration | EP-21 Costing Integration |
| 19 | OEE and Performance Analytics | EP-22 OEE & Analytics |
| 20 | Reports and Dashboards | EP-23 Reports & Dashboards |

---

## 3. EPICS

| Epic ID | Title | Classification | Scope summary | Depends on |
|---|---|---|---|---|
| EP-01 | Foundation & Shared Infrastructure | 1 | Numbering engine, workflow/status engine, audit trail, permission framework, common error envelope | — |
| EP-02 | Masters & Reference Integration | 1 | Item/Machine/Work-Center/Operator/Route/BOM/Customer/Plant integrations; type dictionaries; batch/lot | EP-01 |
| EP-03 | Production Order Management | 2 | PO, Composite PO, Rework PO, Short Close; demand→BOM→route→availability→capacity→PO | EP-01, EP-02 |
| EP-04 | Job Card & Execution | 3 | JC, Job Entry, Subjob Entry, Job Completion; operation/machine/operator allocation | EP-03 |
| EP-05 | Core Production Entry (DEC-PROD-001) | 4 | Production/Rework/Multiple-Output/Log entries = final-part workspace over normalized op-level events | EP-03, EP-04 |
| EP-06 | Work Order Execution Engine | 3/4 | Operation events, execution sessions, quality decision at each operation, next-operation routing | EP-04, EP-05 |
| EP-07 | Material Request & Consumption | 5 | Material/Additional/Other Requests, Consumable Request & Consumption, Consumption, Issue via Inventory | EP-02, EP-05 |
| EP-08 | Output & WIP | 6/10/11 | Output events, WIP tracking, Production Pending, Production Return | EP-05, EP-07 |
| EP-09 | Rework / Rejection / Scrap | 7/8 | Rework entry, Rejection control, Scrap control, NCR hand-off | EP-05, EP-08 |
| EP-10 | Idle / Stoppage / Deviation / Delay / NC | 9 | Idle time, Line Stoppage, Plan Deviation, Delay to Customer, Non-Conformity | EP-05, EP-08 |
| EP-11 | Conversion / Item Change / Disassembly | 11 | Product Conversion, Item Change, Disassembly, Multiple Output | EP-05, EP-08 |
| EP-12 | Planning Layer | 12 | Daily/Weekly/Monthly/Time-Bucket planning, Work-Center planning, reallocation, budget, forecast | EP-03, EP-08 |
| EP-13 | Capacity & Manpower | 13 | Capacity planning/utilization, Manpower planning, work-center load | EP-12 |
| EP-14 | Integration Rails (Quality/Inv/Engg/Maint/Costing) | 14–18 | Third-party contracts: Quality, Inventory Tx, Engineering, Maintenance, Costing | EP-01, EP-08 |
| EP-15 | OEE & Analytics | 19 | OEE, PPM, Manpower Efficiency, Machine Capacity, Output, Consumable, Cost, KPI, 6M, CIP, MIS, Plant Performance | EP-09, EP-10, EP-13 |
| EP-16 | Reports & Dashboards | 20 | Plan vs Actual, MFG cost, KPI dashboards, MIS | EP-15 |

> **All epics require EP-01 (Foundation) as a precondition** for numbering/workflow/audit/authz.

---

## 4. FEATURES, USER STORIES AND TECHNICAL TASKS

### 4.1 EP-01 — Foundation & Shared Infrastructure (Classification 1)

#### FE-01.1 — Document Numbering Engine
- **US-01.1.** As a Production user I want every Production document auto-numbered so numbers are
  unique, server-assigned and never reused.
  - Source: DOC 07 §21 (NUM-PROD-*), DOC 12 `num_reservation`, DEC-PROD-004.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-001 | `NumberGenerator` service: server-side, concurrency-safe, reserved-on-Draft/Submit, never reused | R-PROD-001 | BR-PROD-ORDER | API-SUPPORT-001 | num_reservation | — | P0 | N | Y | N | QA-001 | numbers persist across refresh; UUID tx_id + sequential doc no |
| DB-001 | `num_reservation` + `prod_document_audit` DDL with UNIQUE constraints + row-lock reservation | R-PROD-001 | — | — | num_reservation | — | P0 | N | N | Y | QA-001 | unique doc no; FK to source doc |
| API-001 | `POST /numbers/reserve` contract (DOC 13 API-SUPPORT-001) | R-PROD-001 | — | API-SUPPORT-001 | num_reservation | BK-001 | P0 | N | Y | N | QA-001 | returns reserved no without reuse |
| FT-001 | Number display component (read-only, front-end never generates) | R-PROD-001 | — | — | — | API-001 | P0 | Y | N | N | QA-001 | refresh keeps same number |

#### FE-01.2 — Workflow / Status Engine
- **US-01.2.** As a user I want a single status dictionary driving every entity so DOC 11
  workflow transitions are enforced uniformly.
  - Source: DOC 11 §1–2, DEC-PROD-005, WF-GAP-001..006.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-002 | Workflow/state-machine engine (document-status + execution-status dims) | R-PROD-001 | BR-PROD-ORDER | API-SUPPORT-002 | prod_order_status | — | P0 | N | Y | N | QA-002 | enforces DOC 11 transition table; invalid transition rejected |
| DB-002 | Status dictionary tables + per-entity status columns | R-PROD-001 | — | — | prod_order_status | — | P0 | N | N | Y | QA-002 | matches DOC 11 single dictionary |
| FT-002 | Status badge + transition buttons gated by authorization | R-PROD-001 | — | — | — | BK-002 | P0 | Y | N | N | QA-002 | on-hold requires reason/hold_by/hold_at |

#### FE-01.3 — Audit Trail
- **US-01.3.** As an auditor I want every change logged so I can trace mutations.
  - Source: DOC 12 `prod_document_audit`, DOC 11 reversal locking, DOC 09 Audit column.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-003 | Audit capture aspect on all write services (who/what/when/field-lock) | R-PROD-001 | BR-PROD-001 | API-SUPPORT-003 | prod_document_audit | EP-01 | P0 | N | Y | N | QA-003 | immutable append; field-lock map from DOC 11 §5.3 |
| DB-003 | `prod_document_audit` DDL | R-PROD-001 | — | — | prod_document_audit | — | P0 | N | N | Y | QA-003 | append-only; size-indexed by doc |

#### FE-01.4 — Permission & Authorization Framework
- **US-01.4.** As an Admin I want role-based permissions so actions are authorized.
  - Source: DOC 09 roles per screen, DOC 11 authorization.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-004 | Authorization filter (permission on action + screen) | R-PROD-001 | BR-PROD-010 | API-SUPPORT-003 | existing RBAC | BK-003 | P0 | N | Y | N | QA-004 | unauthorized action 403; VALIDATED role applies |
| FT-003 | Route guards + action-level permission in React | R-PROD-001 | — | — | — | BK-004 | P0 | Y | N | N | QA-004 | hidden/disabled per role |

#### FE-01.5 — Common Envelope & Error Handling
- **US-01.5.** As a frontend I want a uniform envelope/error/pagination contract.
  - Source: DOC 13 §envelope/error/pagination.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-005 | Common API envelope (data/errors/ref, pagination meta) | R-PROD-001 | — | all API | — | — | P0 | N | Y | N | QA-005 | DOC 13 envelope shape; optimistic-lock 409 handling |

---

### 4.2 EP-02 — Masters & Reference Integration (Classification 1)

#### FE-02.1 — Master Data Integration
- **US-02.1.** As a user I want item, machine, work-center, operator, route, BOM, customer and
  plant master data available so Production documents reference them.
  - Source: DOC 07 masters, DOC 12 `prod_type`, `prod_order_x_member`, DOC 08 groups.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-006 | Masters lookup/validate integration (Item, Machine, Work-Center, Operator, Route, BOM, Customer, Plant) | R-PROD-* | BR-PROD-MATL | API-QUERY-001/2/3 | master views | EP-01 | P0 | N | Y | N | QA-006 | item/batch/lot source (DOC 12 prod_batch_card/prod_batch_move) |
| DB-004 | Type/reference dictionary tables (`prod_type`) | R-PROD-* | — | — | prod_type | — | P0 | N | N | Y | QA-006 | reference integrity for all type columns |

---

### 4.3 EP-03 — Production Order Management (Classification 2)

#### FE-03.1 — Production Order
- **US-03.1.** As a planner I want to create and release a Production Order from demand so the
  shop floor can execute it. Validation: Demand → BOM → Route → Material Availability → Capacity →
  Order.
  - Source: DOC 07 §02, DOC 08 SCR-PROD-ORDER-*, DOC 09

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-007 | PO create/update/validate/lock service (PO + lines, dates, members) | FR-PROD-PO-* | BR-PROD-ORDER | API-PO-001..004 | prod_order, prod_order_line, prod_order_dates, prod_order_x_member | EP-02+05 | P0 | N | Y | N | QA-007 | validation chain (DOC 09 XF-001..014) |
| DB-005 | PO DDL (+ order_status state machine) | R-PROD-* | — | — | prod_order, prod_order_item, prod_order_dates | — | P0 | N | N | Y | QA-007 | matches DOC 12 §7 |
| API-002 | API-PO-001..004 REST contracts | R-PROD-* | — | API-PO-001..004 | prod_order | BK-007 | P0 | N | Y | N | QA-007 | DOC 13 table |
| FT-004 | PO screen (create/composite/rework/short-close) React forms | FR-PROD-PO-* | — | API-PO-* | — | API-002 | P0 | Y | N | N | QA-007 | all fields per DOC 09 §77–126 |

#### FE-03.2 — Rework PO & Short Close
- **US-03.2.** As a planner I want rework orders and short-close so partial orders are controlled.
  - Source: SCR-PROD-ORDER-003/004, DOC 09 §77–126.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-008 | Rework PO + Short-Close service with reconciliation | FR-PROD-PO-REWORK | BR-PROD-ORDER | API-PO-003/004 | prod_order(+line) | BK-007 | P1 | N | Y | N | QA-008 | short-close requires pending reconciliation (BR) |

---

### 4.4 EP-04 — Job Card & Execution (Classification 3)

#### FE-04.1 — Job Card, Subjob, Completion
- **US-04.1.** As a supervisor I want to issue a Job Card with operation/machine/operator
  allocation so execution is tracked.
  - Source: SCR-PROD-JOBCARD-*, DOC 09 §144–173, DOC 12 prod_job_card, prod_subjob, prod_execution_session.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-009 | Job Card issue/update/complete; subjob 1:1 route-op default, free under auth | FR-PROD-JC-* | BR-PROD-JOBCARD | API-JC-001..003 | prod_job_card, prod_subjob, prod_execution_session | EP-03 | P0 | N | Y | N | QA-009 | operation/machine/operator assignment; CLAR-PROD-005 assumption |
| FT-005 | Job Card screen + allocation UI | FR-PROD-JC-* | — | API-JC-* | — | BK-009 | P1 | Y | N | N | QA-009 | DOC 09 §144–173 fields |

---

### 4.5 EP-05 / EP-06 — Core Production Entry (DEC-PROD-001) (Classification 4/3)

Implements the approved hybrid architecture:

```
Final-Part Production Screen → Operation Events → {Material|Machine|Manpower} → Execution →
Quality Decision → Next Operation → Finished Good
```

#### FE-05.1 — Production Entry (final-part workspace over op-level events)
- **US-05.1.** As an operator I want a final-part workspace that writes normalized operation-level
  events so all effort is captured for WIP/OEE/costing, while I keep a part-centric view.
  - Source: DEC-PROD-001, DOC 03 §8, SCR-PROD-ENTRY-*, DOC 09 §208–248, DOC 12 prod_operation_event,
    prod_execution_session, prod_output_event.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-010 | Operation-event engine: material/machine/manpower sub-records per operation | FR-PROD-ENTRY-* | BR-PROD-ENTRY, BR-PROD-004 | API-ENTRY-001..006 | prod_operation_event, prod_execution_session | EP-04 | P0 | N | Y | N | QA-010 | DEC-PROD-001; qty reconcile (QTY-RECONCILE) |
| API-003 | API-ENTRY-001..006 contracts | FR-PROD-ENTRY-* | — | API-ENTRY-* | prod_operation_event | BK-010 | P0 | N | Y | N | QA-010 | late-entry guard (BR-PROD-004; ≥SUBMIT lock) |
| FT-006 | Final-part Production Entry screen | FR-PROD-ENTRY-* | — | API-ENTRY-* | — | API-003 | P0 | Y | N | N | QA-010 | part-centric workspace; DOC 09 §208–248 |
| BK-011 | Quality decision + next-operation routing within entry | FR-PROD-ENTRY-* | BR-PROD-QA | API-ENTRY-* | prod_operation_event | BK-010 | P0 | N | Y | N | QA-010 | per-op quality gate before next-op |

#### FE-05.2 — Rework Entry / Multiple Output / Log Sheet
- **US-05.2.** As an operator I want rework entries, multiple-output entries and a Production Log
  Sheet so non-standard and logged output is captured.
  - Source: SCR-PROD-REWORK-*, SCR-PROD-LOG-*, SCR-PROD-OUT-*, DOC 09.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-012 | Rework entry service | FR-PROD-REWORK-* | BR-PROD-REWORK | API-ENTRY-* | prod_rework_event | BK-010 | P1 | N | Y | N | QA-011 | reversal rules per DOC 11 §5.2 |
| BK-013 | Multiple Output entry (weighted; weight/dest columns) | FR-PROD-OUT-* | BR-PROD-PEND | API-ENTRY-* | prod_output_event | BK-010 | P1 | N | Y | N | QA-011 | output weight + dest_stage (DOC 12) |
| BK-014 | Production Log Sheet service | FR-PROD-LOG-001 | BR-PROD-LOG | API-ENTRY-* | prod_log_entry | BK-010 | P1 | N | Y | N | QA-011 | FR-PROD-LOG-001; MRG-002 label note |

---

### 4.6 EP-07 — Material & Consumption (Classification 5)

#### FE-07.1 — Material Requests & Issues
- **US-07.1.** As a store user I want material/additional/other/consumable requests and issues so
  material is consumed through the controlled inventory engine.
  - Source: SCR-PROD-MREQ-*, SCR-PROD-CONSUMABLE-*, DOC 09 §249–318, DOC 12 prod_req_*, prod_consumption_event.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-015 | Material/Addl/Other Request service | FR-PROD-MATL-* | BR-PROD-MATL | API-MREQ-001..004 | prod_req_material(+line) | EP-07 | P0 | N | Y | N | QA-012 | request→issue→stock-ledger chain |
| BK-016 | Consumable request + consumption | FR-PROD-MATL-* | BR-PROD-MATL | API-CONSUME-001/2 | prod_consumable_consumption, prod_consumption_event | EP-07 | P0 | N | Y | N | QA-012 | controlled consumption |

**Inventory-transaction integrity (differential of this backlog):**
- **RULES:** Production never issues `UPDATE stock_balance` directly. Every movement goes:
  `Production Transaction → Inventory Transaction → Stock Ledger Entry → Controlled Balance Update`.
  Implemented via FK hand-off to the Inventory module (EP-18). See DEC-PROD-003, DOC 12 §13.
  - **BK-017** — Inventory hand-off for issues/receipts/returns (never direct stock write). PRI P0. QA-013.

---

### 4.7 EP-08 — Output & WIP / Return (Classification 6/10/11)

#### FE-08.1 — WIP, Pending, Output, Return
- **US-08.1.** As a planner I want WIP tracking and Production Pending so in-process and short
  quantities are visible; as a store user I want Production Return for rejects/holds.
  - Source: SCR-PROD-WIP-*, SCR-PROD-PEND-*, DOC 09 §319–355, DOC 12 prod_output_event.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-018 | WIP derived view + pending reconciliation | FR-PROD-WIP-* | BR-PROD-WIP, BR-PROD-PEND | API-QUERY-* | prod_output_event (view) | EP-05 | P0 | N | Y | N | QA-014 | pending = planned − accepted − rejected − rework − scrap (BR-PROD-ENTRY-001) |
| BK-019 | Production Return service (Good/QC-Hold/Rejected + override) | FR-PROD-INV-* | BR-PROD-INV-003 | API-INV / API-ENTRY | prod_output_event, stock hand-off | EP-05 | P1 | N | Y | N | QA-014 | override requires supervisor (CLAR-PROD-003) |

---

### 4.8 EP-09 — Rework / Rejection / Scrap (Classification 7/8)

- **US-09.1.** As QA I want rejection and scrap control with authorization/reconciliation and
  reversal limits.
  - Source: SCR-PROD-REJ-*, SCR-PROD-SCRAP-*, SCR-PROD-REWORK-*, DOC 09 §356–397, DOC 12
    prod_rejection, prod_scrap, prod_rework_event.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-020 | Rejection control (qty/reason/NCR/disposition; reconciles) | FR-PROD-REJ-001 | BR-PROD-REJ-001 | API-REJ-001/2 | prod_rejection(+line) | EP-05,08 | P0 | N | Y | N | QA-015 | TC-12; reversal (no reversal post-capitalization) |
| BK-021 | Scrap control (AUTO/MANUAL auth; reversal restricted after capitalization) | FR-PROD-SCRAP-001 | BR-PROD-SCRAP-001 | API-SCRAP-001/2 | prod_scrap(+line) | EP-05,08 | P0 | N | Y | N | QA-015 | TC-13 |
| BK-022 | Rework routing on rejection/rework decision | FR-PROD-REWORK-* | BR-PROD-REWORK | API-ENTRY/REWORK | prod_rework_event | BK-020 | P1 | N | Y | N | QA-015 | NCR link |

---

### 4.9 EP-10 — Idle / Stoppage / Deviation / Delay / NC (Classification 9)

- **US-10.1.** As a supervisor I want idle, stoppage, deviation, delay-to-customer and
  non-conformity to be recorded for OEE and tracing.
  - Source: SCR-PROD-IDLE-*, SCR-PROD-STOP-*, SCR-PROD-DEV-*, SCR-PROD-DLVY-*, SCR-PROD-NCONF-*,
    DOC 09 §440–475, 554–578, DOC 12 prod_idle, prod_stoppage, prod_deviation, prod_delay_customer,
    prod_nconf.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-023 | Idle time entry (reason/code/duration) | FR-PROD-IDLE-* | BR-PROD-STOP | API-IDLE-001 | prod_idle | EP-05 | P1 | N | Y | N | QA-016 | feeds Availability |
| BK-024 | Line stoppage + maintenance hand-off (maintenance_ref) | FR-PROD-STOP-* | BR-PROD-STOP | API-STOP-001 | prod_stoppage | EP-05 | P1 | N | Y | N | QA-016 | INT-GAP-004 external contract |
| BK-025 | Deviation + delay-to-customer + NC records | FR-PROD-DEV/DLVY/NCONF | BR-PROD-STOP | API-* | prod_deviation(+line), prod_delay_customer, prod_nconf | EP-05 | P2 | N | Y | N | QA-016 | non-conformity → quality (Classification 14) |

---

### 4.10 EP-11 — Conversion / Item Change / Disassembly (Classification 11)

- **US-11.1.** As a manager I want conversion, item-change and disassembly so product/item
  transformations and their qty/loss are captured (valuation by Costing).
  - Source: SCR-PROD-CONV-*, SCR-PROD-ITEMCHG-*, SCR-PROD-DISASM-*, DOC 09 §398–439.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-026 | Product Conversion (qty/loss; Costing values) | FR-PROD-CONV-* | BR-PROD-CONV | API-CONV-001..003 | prod_conversion(+line) | EP-05,08 | P1 | N | Y | N | QA-017 | CLAR-PROD-008 (record qty/loss only) |
| BK-027 | Item Change | FR-PROD-ITEMCHG-* | BR-PROD-CONV | API-CONV-* | prod_item_change | EP-05,08 | P2 | N | Y | N | QA-017 | item-change reconciliation |
| BK-028 | Disassembly (DISASM-RECONCILE) | FR-PROD-DISASM-* | BR-PROD-DISASM | API-CONV-* | prod_disassembly(+line) | EP-05,08 | P1 | N | Y | N | QA-017 | parent→child reconcile |

---

### 4.11 EP-12/EP-13 — Planning Layer + Capacity (Classification 12/13)

**Planning Layer must only be built after execution data is reliable (Phase P8).**
- **US-12.1.** As a planner I want daily/weekly/monthly/time-bucket planning, work-center planning,
  reallocation, budget and forecasting.
  - Source: SCR-PROD-PLAN-*, SCR-PROD-WC-*, SCR-PROD-CAP-*, DOC 09 §476–553, DOC 12 prod_plan_*,
    prod_plan_wc_load, prod_plan_budget.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-029 | Planning bucket engine + revision model | FR-PROD-PLAN-* | BR-PROD-PLAN | API-PLAN-001..008 | prod_plan_rev, prod_plan_bucket(+line), prod_plan_item_daily, prod_plan_demand | EP-03,08 | P2 | N | Y | N | QA-018 | revision/approval lifecycle |
| BK-030 | Work-center load + realloc + capacity utilization | FR-PROD-CAP-* | BR-PROD-WC, BR-PROD-CAP | API-PLAN-* | prod_plan_wc(+load,realloc) | BK-029 | P2 | N | Y | N | QA-018 | CAPACITY-UTIL fn; no overload without alert |
| BK-031 | Manpower planning; budget + forecast | FR-PROD-CAP-* | BR-PROD-CAP | API-PLAN-* | prod_plan_budget(+line) | BK-029 | P2 | N | Y | N | QA-018 | capacity vs manpower reconciled |

---

### 4.12 EP-14 — Integration Rails (Quality/Inv/Engg/Maint/Costing) (Classification 14–18)

- **US-14.1.** As a system I want integration contracts for external modules so Production stays
  bounded (DEC-PROD-002).
  - Source: DOC 03 §8, DOC 12 §12, DOC 13 integration APIs.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-032 | Quality integration rail (PPAP status, inspection pending, NCR) | FR-PROD-QA-* | BR-PROD-QA | API-QUERY/REJ | prod_nconf, rejection NCR | EP-08 | P1 | N | Y | N | QA-019 | PPAP-gated blocks where mandatory (INT) |
| BK-033 | Inventory transaction hand-off (never direct stock write) | FR-PROD-INV-* | BR-PROD-INV-001/2/3 | API hand-off | stock ledger (external) | EP-07 | P0 | N | Y | N | QA-013 | controlled balance update; no bypass |
| BK-034 | Engineering (BOM/Route/Item) read-integration | FR-PROD-* | BR-PROD-MATL | API-QUERY-* | master/cad views | EP-02 | P1 | N | Y | N | QA-019 | BOM/route version alignment |
| BK-035 | Maintenance hand-off (prod_stoppage.maintenance_ref) | FR-PROD-STOP-* | BR-PROD-STOP | API-STOP-001 | prod_stoppage | EP-10 | P2 | N | Y | N | QA-016 | external contract (INT-GAP-004) |
| BK-036 | Costing integration (valuation consumed; Production posts qty/loss) | FR-PROD-CONV-* | BR-PROD-CONV | API-* | prod_conversion | EP-11 | P2 | N | Y | N | QA-019 | CLAR-PROD-008 |

---

### 4.13 EP-15 — OEE & Analytics (Classification 19)

- **US-15.1.** As a manager I want OEE (Availability × Performance × Quality), PPM, manpower
  efficiency, machine capacity, output, consumable, manufacturing cost, KPI, 6M, CIP, MIS, plant
  performance.
  - Source: DOC 03 §8 (OEE/PPAP/MSL), DOC 12 derived views, DOC 14.

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-037 | OEE engine from Availability (idle/stoppage) × Performance (output/theoretical) × Quality (rej/scrap) | FR-PROD-* | BR-PROD-QA; DOC 03 §8 OEE capability | API-QUERY-* | derived views | EP-09,10 | P1 | N | Y | N | QA-020 | single engine; formula DOC 07 §19 |
| BK-038 | PPM + manpower efficiency + machine capacity analytics | FR-PROD-* | BR-PROD-* | API-QUERY-* | prod_operation_event | EP-15 | P2 | N | Y | N | QA-020 | per-workcenter/timebucket |
| DB-006 | Derived views: WIP, pending, capacity, OEE, PPM | FR-PROD-* | — | — | derived views | EP-05 | P1 | N | N | Y | QA-020 | DOC 12 views; performance-indexed |

---

### 4.14 EP-16 — Reports & Dashboards (Classification 20)

- **US-16.1.** As a manager I want plan-vs-actual, cost, KPI dashboards and MIS reports.
  - Source: DOC 14 report-level traceability (report→FR ID column).

| Task ID | Title | Req | BR | API | DB | Dep | Pri | FE | BE | DB | QA | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BK-039 | Plan vs Actual + manufacturing cost report APIs | FR-PROD-* | BR-PROD-* | API-QUERY-* | prod_order, prod_operation_event | EP-15 | P2 | N | Y | N | QA-021 | reconcile planned vs accepted |
| FT-007 | KPI dashboard + MIS + plant performance screens | FR-PROD-* | — | API-QUERY-* | — | BK-039 | P2 | Y | N | N | QA-021 | DR role-gated; report→FR traceability |

---

## 5. BLOCKED TASKS

> **None are blocked.** The former single blocking clarification (CLAR-PROD-001, MSL) was
> **RESOLVED** by the customer as **Minimum Stock Level** (ASM-PROD-015). Under this resolution,
> MSL is an **Inventory/Store** reorder-level concept; Production is **integration-only**
> (material availability + shortage alert via **BR-PROD-MATL-001**). No Production UI or MRP
> engine is built on a guessed MSL meaning.

Consequently:
- **MSL reports (Classification 19 area)** remain a thin integration/report (availability + shortage
  alert); no custom MSL UI. Traced to ASM-PROD-015 / BR-PROD-MATL-001.
- If the business later wants a **deep MSL reorder/buying workflow**, that is owned by the
  **Inventory/Store module FRS** (out of Production scope), per ASM-PROD-015 / FUT-PROD-005.

If a deep MSL workflow is ever requested inside Production, the task must be marked
`BLOCKED — BUSINESS CLARIFICATION REQUIRED (Inventory/Store owns MSL)`. None such exists today.

---

## 6. FINAL COMPLETION SUMMARY — DOCUMENT 15

| Metric | Count |
|---|---|
| Epics | 16 (EP-01..EP-16) |
| Classifications | 20 |
| Features | 25 (FE-01.1..16.1) |
| User Stories | 25 (US-01.1..16.1) |
| Backend tasks (BK) | 39 (BK-001..039) |
| Frontend tasks (FT) | 07 (FT-001..007) |
| Database tasks (DB) | 06 (DB-001..006) |
| API contract tasks (API) | 03 primary (API-001..003) + mapped to DOC 13 API-* per task |
| QA tasks (QA) | 21 (QA-001..021) |
| DevOps tasks (DV) | None scoped (deferred to implementation plan) |
| Blocked tasks | **0** |
| Blocking clarifications | **None** (CLAR-PROD-001 RESOLVED = Minimum Stock Level) |
| MSL tasks requiring business clarification | 0 (resolved; Inventory/Store-owned) |

> Note: Several BR/API/table references in the tables above reuse documented `BR-PROD-*`,
> `API-*` and `prod_*` IDs directly from DOC 10/13/12; a task may reference multiple IDs. The
> enumerated *task* IDs (BK/FT/DB/API/QA) are this backlog's own denominator and are the ones
> counted in the completion report.

---

## 7. DEVELOPMENT PHASE PLAN (P1–P10)

### PHASE P1 — Foundation
- **Objective:** Shared infrastructure before any business screen.
- **Features:** FE-01.1..01.5 (numbering, workflow/status, audit, authz, envelope).
- **Dependencies:** none.
- **Frontend:** envelope components, status badge, route guards (FT-001..003).
- **Backend:** NumberGenerator, workflow engine, audit aspect, authz, envelope (BK-001..005).
- **Database:** num_reservation, prod_document_audit, status tables (DB-001..003).
- **API:** API-SUPPORT-*, API-001.
- **QA:** QA-001..005 (numbering concurrency, workflow transitions, audit immutability, authorization).
- **Integration tests:** numbering reserve→draft→submit continuity; authz 403; audit append.
- **Risks:** number reservation races — mitigated by row-lock + unique constraint.
- **Exit criteria:** all P1 QA green; numbering never reuses; all entities carry status+audit.

### PHASE P2 — Production Order Management
- **Objective:** Authorized POs.
- **Features:** FE-03.1..03.2.
- **Dependencies:** P1.
- **Backend:** BK-007, BK-008; **DB:** DB-005; **API:** API-002/API-PO-*; **Frontend:** FT-004.
- **QA:** QA-007, QA-008.
- **Exit criteria:** create/release/composite/rework/short-close; validation chain enforced.

### PHASE P3 — Job Card and Execution
- **Objective:** Issue and allocate jobs.
- **Features:** FE-04.1.
- **Backend:** BK-009 (job card/subjob); **Frontend:** FT-005; **QA:** QA-009.
- **Exit criteria:** JC issued with op/machine/operator assignment; subjob 1:1 with auth override.

### PHASE P4 — Core Production Entry
- **Objective:** Hybrid architecture (DEC-PROD-001) — final-part workspace over op-level events.
- **Features:** FE-05.1, FE-05.2.
- **Backend:** BK-010..014; **API:** API-003; **Frontend:** FT-006; **QA:** QA-010, QA-011.
- **Exit criteria:** part-centric screen writes normalized op-events; quality decision gates next-op;
  rework entry, multiple output, log sheet functional; qty reconcile holds.

### PHASE P5 — Material and Inventory Integration
- **Objective:** Controlled material through inventory engine.
- **Features:** FE-07.1.
- **Backend:** BK-015, BK-016, BK-017, BK-033; **QA:** QA-012, QA-013.
- **Exit criteria:** no direct stock write; every movement via inventory hand-off; consumables controlled.

### PHASE P6 — Rework, Rejection and Scrap
- **Objective:** Exception control on the shop floor.
- **Features:** FE-09 (EP-09).
- **Backend:** BK-020..022; **QA:** QA-015.
- **Exit criteria:** rejection/scrap authorization, reconciliation, reversal limits; NCR link.

### PHASE P7 — WIP, Return, Conversion and Disassembly
- **Objective:** In-process visibility + transformations.
- **Features:** FE-08.1, FE-11 (EP-11).
- **Backend:** BK-018, BK-019, BK-026..028; **QA:** QA-014, QA-017.
- **Exit criteria:** WIP/pending views correct; return dispositions; conversion/disassembly reconcile.

### PHASE P8 — Production Planning Layer
- **Objective:** Planning only after reliable execution data.
- **Features:** FE-12 (EP-12).
- **Backend:** BK-029..031; **QA:** QA-018.
- **Exit criteria:** bucket planning, WC load/realloc, capacity utilization, budget, forecast.

### PHASE P9 — Capacity, OEE and Analytics
- **Objective:** Performance + exceptions feed OEE/analytics.
- **Features:** EP-10 (idle/stoppage/deviation), EP-15 (OEE/analytics).
- **Backend:** BK-023..025, BK-037..038; **DB:** DB-006; **QA:** QA-016, QA-020.
- **Exit criteria:** OEE/PPM/manpower/machine from reliable events; single OEE engine.

### PHASE P10 — Reports and Production Go-Live Preparation
- **Objective:** Reporting, KPI, MIS, plant performance; go-live.
- **Features:** EP-16 (reports/dashboards), EP-14 integration rails finalization (BK-032..036 as applicable).
- **Backend:** BK-039; **Frontend:** FT-007; **QA:** QA-021.
- **Exit criteria:** plan-vs-actual, cost, KPI dashboards, MIS; integration rails verified; go-live runbook.

---

## 8. DEFINITION OF DONE (per phase)

1. All tasks in the phase pass their **Acceptance Criteria** (from DOC 09 validations + DOC 14 tests).
2. Every task's **traceability chain** (Req → Screen → Field → BR → API → DB → Test) is complete and
   no orphan exists.
3. **DEC-PROD-001** honored (Phase P4): final-part workspace persists normalize op-level events.
4. **Inventory integrity** honored (Phase P5): no direct stock write; all via inventory hand-off.
5. **Numbering** honored: server-side, concurrency-safe, reserved-not-reused.
6. **Workflow/status** honored: only DOC 11 dictionary terms; no conflicting status names.
7. **API** honors DOC 13 contracts; **DB** honors DOC 12 (no duplicate tables).
8. Backend/API unit + integration tests green; frontend builds without type errors; lint clean.
9. QA acceptance signed per phase; exit criteria from Section 7 met.
10. No new requirement added; no approved requirement removed.

---

**END OF DOCUMENT 15 — PRODUCTION DEVELOPMENT BACKLOG**

This document is the controlled bridge between the approved Production FRS (DOCUMENTS 01–14,
Baseline v1.0) and the React + Spring Boot + PostgreSQL / Gradle implementation. It contains no
new business requirements and does not override approved DEC-PROD-* decisions.