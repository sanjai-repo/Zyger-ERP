# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 08 — SCREEN-WISE SPECIFICATION

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 08 — Screen-wise Specification |
| Baseline | DOCUMENT 06; Architecture DEC-PROD-001 |
| FRS detail | DOCUMENT 07 (module-level FR/BR/workflow/numbering/integration) |
| Status | SCREEN-WISE SPEC — field tables per screen |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

**Field table columns (mandatory for every screen):**
Field ID | Field Name | Label | Data Type | Mandatory | Default | Editable Status | Source | Validation | Business Rule Ref | API Field | Database Field | Audit Requirement

Avoid vague terms in validation; every validation is explicit (cross-referenced to a BR where
applicable). Screen groups A–J mirror DOC 07 domains for clean future splitting.

---

## TABLE OF CONTENTS

- A. Production Order Screens
- B. Job Card Screens
- C. Production Execution Screens
- D. Material Request & Consumption Screens
- E. WIP and Output Screens
- F. Rework / Rejection / Scrap Screens
- G. Conversion / Disassembly Screens
- H. Idle Time / Stoppage Screens
- I. Planning Screens
- J. Exception and Deviation Screens
- DOCUMENT PACKAGE STATUS

Each screen defines: SCREEN ID, NAME, SOURCE (CR/REF/ZYGER/PROPOSED), PURPOSE, BUSINESS PURPOSE,
ROLES (view/create/edit/save-draft/submit/approve/reject/cancel/reverse/close/export), LAYOUT,
SECTIONS, STATUS, plus a FIELD SPECIFICATION table. Layout/sections are described concisely and
cross-referenced to avoid duplicating DOC 07 logic.

---

# A. PRODUCTION ORDER SCREENS

## SCR-PROD-ORDER-001 — Production Order (Single)
- **SOURCE:** ZYGER. **FRS:** FR-PROD-ORDER-001; NUM-PROD-ORDER.
- **PURPOSE:** Authorize manufacturing of a final item in a planned quantity against a demand,
  with approved BOM + route.
- **ROLES:** View = all; Create/Edit/Save-Draft = Planner; Submit = Planner/Supervisor; Approve/
  Reject = Plant Head; Cancel/Reverse = Plant Head (audited); Short-Close = Plant Head; Export = all.
- **LAYOUT:** Header (Order No, Type, Item, Qty, UOM, Priority, Dates, Plant, Status) → Item/BOM/
  Route panel → Operations preview (from route) → Lines (material requirement from BOM) →
  Approvals → Audit trail.
- **STATUS:** Draft → Released → In Progress → Completed → Closed (+ Short-Close, Cancelled, Reversed).

| Field ID | Name | Label | Type | Mand | Default | Editable | Source | Validation | BR | API | DB | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-ORDER-001 | orderNo | Production Order No | Text(auto) | Yes | (preview) | No | Num engine | must be unique; preview repeatable | BR-NUM-001 | prod-order|num | prod_order.order_no | Yes |
| FLD-PROD-ORDER-002 | orderType | Type | Enum | Yes | SINGLE | On create only | Catalogue | SINGLE/COMPOSITE/REWORK | BR-PROD-001 | type | prod_order.type | Yes |
| FLD-PROD-ORDER-003 | itemId | Final Item | FK | Yes | — | On create | Item Master | active, approved | BR-PROD-010 | itemId | prod_order.item_id | Yes |
| FLD-PROD-ORDER-004 | plannedQty | Planned Qty | Decimal>0 | Yes | BOM/na | Until release | Demand/Plan | >0 | BR-PROD-010 | plannedQty | prod_order.planned_qty | Yes |
| FLD-PROD-ORDER-005 | uom | UOM | FK | Yes | item UOM | On create | Item Master | valid UOM | — | uom | prod_order.uom | Yes |
| FLD-PROD-ORDER-006 | priority | Priority | Enum | Yes | Medium | Until release | Catalogue | Low/Med/High/Critical | — | priority | prod_order.priority | Yes |
| FLD-PROD-ORDER-007 | startDate | Start Date | Date | Yes | today | Until release | User | not after dueDate | — | startDate | prod_order.start_date | Yes |
| FLD-PROD-ORDER-008 | dueDate | Due Date | Date | Yes | — | Until release | User | ≥ startDate | — | dueDate | prod_order.due_date | Yes |
| FLD-PROD-ORDER-009 | plantId | Plant | FK | Yes | user plant | Never | Plant | assigned to user | — | plantId | prod_order.plant_id | Yes |
| FLD-PROD-ORDER-010 | bomRev | BOM Revision | FK | Yes | active rev | On create | Engineering | approved BOM required | BR-PROD-010 | bomRev | prod_order.bom_rev | Yes |
| FLD-PROD-ORDER-011 | routeRev | Route Revision | FK | Yes | active rev | On create | Engineering | approved route required | BR-PROD-010 | routeRev | prod_order.route_rev | Yes |
| FLD-PROD-ORDER-012 | demandRef | Demand Ref | Text | No | — | On create | Plan/Sales | optional | — | demandRef | prod_order.demand_ref | No |
| FLD-PROD-ORDER-013 | status | Status | Enum | Yes | DRAFT | System | Lifecycle | lifecycle transitions | BR-WF-001 | status | prod_order.status | Yes |

## SCR-PROD-ORDER-002 — Composite Production Order
- **SOURCE:** ZYGER. **FRS:** FR-PROD-ORDER-002.
- Same as single, plus a member-orders list (each member independent status). Release releases
  members. Field set reuses FLD-PROD-ORDER-* with `parentCompositeId` on members; numbering
  NUM-PROD-ORDER-COMP.

## SCR-PROD-ORDER-003 — Rework Production Order
- **SOURCE:** ZYGER + CFL-PROD-002. **FRS:** FR-PROD-ORDER-003.
- Adds mandatory: `sourceOrderId`, `sourceEntryId`, `ncrRef`, `authorizedQty`, `reworkRouteRev`.
- **Validation (BR-PROD-REWORK-001):** rework order qty ≤ authorized NCR qty; source references
  required.

## SCR-PROD-ORDER-004 — Production Order Short Close
- **SOURCE:** ZYGER. **FRS:** FR-PROD-ORDER-004.
- Adds `closeReason` (catalogue), `remainingQtyDisposition` (cancel/scrap/return), `authorizedBy`.
- **Validation:** only on Released/In-Progress; reason mandatory; reconciles WIP/pending.

---

# B. JOB CARD SCREENS

## SCR-PROD-JOBCARD-001 — Job Card
- **SOURCE:** CR-PROD-005. **FRS:** FR-PROD-JOBCARD-001..004.
- **PURPOSE:** controlled job execution document from a Production Order.
- **ROLES:** View all; Create/Edit/Save-Draft = Supervisor; Submit = Supervisor; Release = Planner;
  Complete/Close = Supervisor; Export = all.
- **LAYOUT:** Header (Job No, Order ref, Item, Planned Qty, Priority, Start/Due dates, Status) →
  Material availability panel → Operations/Subjobs tree → Output summary → Audit trail.
- **STATUS:** Draft → Released → In Progress → (Hold) → Completed → Closed.

| Field ID | Name | Label | Type | Mand | Default | Editable | Source | Validation | BR | API | DB | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-JOBCARD-001 | jobNo | Job Card No | Text(auto) | Yes | (preview) | No | Num | unique; preview repeatable | BR-NUM-001 | jobNo | prod_job_card.job_no | Yes |
| FLD-PROD-JOBCARD-002 | orderId | Production Order | FK | Yes | — | On create | Order | Released order required | — | orderId | prod_job_card.order_id | Yes |
| FLD-PROD-JOBCARD-003 | itemId | Final Item | FK | Yes | from order | Never | Order/Item | matches order item | — | itemId | prod_job_card.item_id | Yes |
| FLD-PROD-JOBCARD-004 | plannedQty | Planned Qty | Decimal>0 | Yes | from order | Until release | Order | ≤ order pending qty | BR-PROD-PEND-001 | plannedQty | prod_job_card.planned_qty | Yes |
| FLD-PROD-JOBCARD-005 | materialOk | Material Availability | Boolean | No | false | System | Inventory | partial allowed | ASM-PROD-003 | materialOk | — (derived) | No |
| FLD-PROD-JOBCARD-006 | status | Status | Enum | Yes | DRAFT | System | Lifecycle | lifecycle | BR-WF-001 | status | prod_job_card.status | Yes |
| FLD-PROD-JOBCARD-007 | workCenterId | Work Center | FK | Yes | — | On create | Master | active, eligible | BR-PROD-020 | workCenterId | prod_job_card.wc_id | Yes |
| FLD-PROD-JOBCARD-008 | machineId | Initial Machine | FK | No | — | On create | Master | eligible for ops | BR-PROD-020 | machineId | prod_job_card.machine_id | Yes |
| FLD-PROD-JOBCARD-009 | startDate | Start Date | Date | Yes | today | Until release | User | ≤ dueDate | — | startDate | prod_job_card.start_date | Yes |
| FLD-PROD-JOBCARD-010 | dueDate | Due Date | Date | Yes | — | Until release | User | ≥ startDate | — | dueDate | prod_job_card.due_date | Yes |

## SCR-PROD-JOBCARD-002 — Job Entry
- **SOURCE:** CR-PROD-005. **FRS:** FR-PROD-JOBCARD-002.
- Sub-screen/data-entry within job creation. Fields: planned qty, machine, operator, shift,
  output plan per subjob, material requirement snapshot. Validates partial material availability.

## SCR-PROD-JOBCARD-003 — Subjob Entry
- **SOURCE:** CR-PROD-005. **FRS:** FR-PROD-JOBCARD-003.
- Add/review subjobs (operations). Map subjob ↔ route operation (1:1 default; CLAR-PROD-005).
- Fields mirror operation events (see SCR-PROD-ENTRY-001): operation, machine, operator,
  input/output qty, quality gate, runtime/idle.

## SCR-PROD-JOBCARD-004 — Job Completion
- **SOURCE:** CR-PROD-005. **FRS:** FR-PROD-JOBCARD-004.
- Shows completion check per subjob; if all complete → final quality → FG/SFG receipt → job
  closed (BR-PROD-JOBCARD-001). Pending subjobs → Hold with reason.

---

# C. PRODUCTION EXECUTION SCREENS

## SCR-PROD-ENTRY-001 — Final-Part Production Workspace
- **SOURCE:** ZYGER + DEC-PROD-001. **FRS:** FR-PROD-ENTRY-004.
- **PURPOSE:** single workspace for a final part / work order / batch showing all operations and
  their outcome; creates/updates operation events without leaving the screen.
- **ROLES:** View all; Create/Edit/Save-Draft = Operator, Supervisor; Submit = Supervisor; Approve =
  Supervisor/Plant; Record output/time/material = Operator; Override (sequence/quality) =
  Supervisor/Engineer + reason; Reverse/Cancel = Supervisor + reason; Export = all.
- **LAYOUT:** Header → Summary (planned/completed/pending/accepted/rejected/rework/scrap) →
  Operation Timeline/Process Tree (per-op status chip) → Operation detail (selected op: machine,
  operator, shift, times, idle, output, inspection, material consumption) → Status bar → Audit.
- **STATUS:** Per operation: NOT STARTED / IN PROGRESS / COMPLETED / QUALITY HOLD / REWORK /
  SKIPPED-AUTHORIZED / REJECTED. Header session statuses per BR-WF-001.
- **MODES:** quick final-part / op-by-op / batch-job / multi-op single session (ASM-PROD-001,
  DEC-PROD-001-§3.5).

| Field ID | Name | Label | Type | Mand | Default | Editable | Source | Validation | BR | API | DB | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-ENTRY-001 | sessionNo | Production Entry No | Text(auto) | Yes | (preview) | No | Num | unique; preview repeatable | BR-NUM-001 | sessionNo | prod_execution_session.session_no | Yes |
| FLD-PROD-ENTRY-002 | jobCardId | Job Card / Batch | FK | Yes | — | On create | Job Card | Released job required | — | jobCardId | prod_execution_session.job_card_id | Yes |
| FLD-PROD-ENTRY-003 | itemId | Final Item | FK | Yes | from job | Never | Order/Item | matches job | BR-PROD-010 | itemId | session.item_id | Yes |
| FLD-PROD-ENTRY-004 | workOrderId | Work Order | FK | Yes | from job | Never | Order | — | — | workOrderId | session.wo_id | Yes |
| FLD-PROD-ENTRY-005 | entryType | Entry Type | Enum | Yes | PRODUCTION | On create only | Catalogue | PRODUCTION/REWORK/MULTI_OUTPUT | BR-PROD-001 | entryType | session.entry_type | Yes |
| FLD-PROD-ENTRY-006 | prodType | Production Type | Enum | Yes | GENERAL | On create only | Catalogue | GENERAL/REWORK | BR-PROD-002 | prodType | session.prod_type | Yes |
| FLD-PROD-ENTRY-007 | shiftId | Shift | FK | Yes | current | On create | Master | valid shift | — | shiftId | session.shift_id | Yes |
| FLD-PROD-ENTRY-008 | supervisorId | Supervisor | FK | Yes | — | On create | Employee | active, plant, authorized | — | supervisorId | session.supervisor_id | Yes |
| FLD-PROD-ENTRY-009 | entryDate | Entry Date | Date | Yes | today | Until submit | User | — | — | entryDate | session.entry_date | Yes |
| FLD-PROD-ENTRY-010 | prodDate | Actual Production Date | DateTime | Yes | today | Until submit | User | = actual production occurrence | BR-PROD-004 | prodDate | session.actual_prod_ts | Yes |
| FLD-PROD-ENTRY-011 | status | Status | Enum | Yes | DRAFT | System | Lifecycle | transitions | BR-WF-001 | status | session.status | Yes |
| FLD-PROD-ENTRY-012 (per-op group) | operationId | Operation | FK | Yes | route seq | — | Route Sheet | from approved route; control seq | BR-PROD-010 | operationId | op_event.operation_id | Yes |
| FLD-PROD-ENTRY-013 | machineId | Machine | FK | Yes | — | — | Master | work center, active, not breakdown, eligible | BR-PROD-020 | machineId | op_event.machine_id | Yes |
| FLD-PROD-ENTRY-014 | operatorId | Operator | FK | Yes | — | — | Employee | active, plant, skill, machine auth, shift | BR-PROD-020 | operatorId | op_event.operator_id | Yes |
| FLD-PROD-ENTRY-015 | startTs | Actual Start | DateTime | Yes | — | — | User/scan | = recorded start | — | startTs | op_event.start_ts | Yes |
| FLD-PROD-ENTRY-016 | endTs | Actual End | DateTime | Yes | — | — | User/scan | ≥ startTs | — | endTs | op_event.end_ts | Yes |
| FLD-PROD-ENTRY-017 | runtime | Runtime | Duration | Derived | — | No (system) | calc | endTs−startTs−idle | — | (derived) | op_event.runtime_s | Yes |
| FLD-PROD-ENTRY-018 | inputQty | Input Qty | Decimal | Yes | — | — | Sys/prev op accepted | ≥ 0 | BR-PROD-WIP-001 | inputQty | op_event.input_qty | Yes |
| FLD-PROD-ENTRY-019 | processedQty | Processed Qty | Decimal | Derived | — | No (system) | Rederived | = acc+rej+rew+scrap | BR-PROD-ENTRY-001 | (derived) | op_event.processed_qty | Yes |
| FLD-PROD-ENTRY-020 | acceptedQty | Accepted Qty | Decimal | Yes | — | Until submit | User/system | ≤ processed | BR-PROD-ENTRY-001 | acceptedQty | op_event.accepted_qty | Yes |
| FLD-PROD-ENTRY-021 | rejectedQty | Rejected Qty | Decimal | Yes | 0 | Until submit | User/system | ≤ processed | BR-PROD-REJ-001 | rejectedQty | op_event.rejected_qty | Yes |
| FLD-PROD-ENTRY-022 | reworkQty | Rework Qty | Decimal | Yes | 0 | Until submit | User/system | ≤ processed | BR-PROD-REWORK-001 | reworkQty | op_event.rework_qty | Yes |
| FLD-PROD-ENTRY-023 | scrapQty | Scrap Qty | Decimal | Yes | 0 | Until submit | User/system | ≤ processed | BR-PROD-SCRAP-001 | scrapQty | op_event.scrap_qty | Yes |
| FLD-PROD-ENTRY-024 | inspectionRequired | Inspection Required | Boolean | Yes | from route | Never | Route | route-defined | BR-PROD-QA-001 | inspectionRequired | op_event.insp_required | Yes |
| FLD-PROD-ENTRY-025 | inspectionStatus | Inspection Status | Enum | Yes | PENDING | System/Quality | Quality | PENDING/PASS/FAIL/HELD | BR-PROD-QA-001 | inspectionStatus | op_event.insp_status | Yes |
| FLD-PROD-ENTRY-026 | inspRef | Inspection Reference | Text | No | — | After insp | Quality | reference to inspection doc | — | inspRef | op_event.insp_ref | Yes |
| FLD-PROD-ENTRY-027 | qualityHold | Quality Hold | Boolean | No | false | System | Quality | true disables next stage | BR-PROD-QA-001 | qualityHold | op_event.quality_hold | Yes |
| FLD-PROD-ENTRY-028 | reworkRef | Rework Reference | Text | No | — | On rework | System | rework entry/NCR ref | BR-PROD-REWORK-001 | reworkRef | op_event.rework_ref | Yes |
| FLD-PROD-ENTRY-029 | ncrRef | NCR Reference | Text | No | — | On reject | Quality | NCR no. if reject | BR-PROD-REJ-001 | ncrRef | op_event.ncr_ref | Yes |

## SCR-PROD-ENTRY-002 — Rework Production Entry
- **SOURCE:** ZYGER + CFL-PROD-002. **FRS:** FR-PROD-ENTRY-002.
- Fields: source entry, source op event, authorizedQty (≤ NCR/quality authorization), rework route,
  rework op output, scrap/hold split. Reuses FLD-PROD-ENTRY-*. Traced (never bare radio).

## SCR-PROD-ENTRY-003 — Multiple-Output Production Entry
- **SOURCE:** ZYGER + CFL-PROD-012. **FRS:** FR-PROD-ENTRY-003.
- Adds output lines: type (PRIMARY/COEY/BY), item, qty, lot/batch, weight, dest stage. Validation:
  primary output required; co/by optional; sum of outputs reconciled with input per routing rules.

## SCR-PROD-LOG-001 — Production Log Sheet
- **SOURCE:** CR-PROD-004. **FRS:** FR-PROD-LOG-001.
- Fields: logNo, shiftId, machineId, operatorId, supervisorId, activity (catalogue), startTs/endTs,
  duration (derived), qty (if any), note. Can generate/summarize a production entry. Reasons per
  CLAR-PROD-004.

---

# D. MATERIAL REQUEST & CONSUMPTION SCREENS

## SCR-PROD-MREQ-001 — Production Material Request
- **SOURCE:** ZYGER. **FRS:** FR-PROD-MATL-001.
- Header (reqNo, jobCardId, reqDate, status) + lines (item, requiredQty from BOM, issuedQty,
  available, store/rack, batch/lot, uom). Partial issue supported (ASM-PROD-003). Posts a
  MATERIAL_ISSUE intent (DOC 07-§15).

## SCR-PROD-MREQ-002 — Production Additional Material Request
- **SOURCE:** ZYGER. **FRS:** FR-PROD-MATL-002.
- Adds: justification, deviationQty vs BOM, approve/reject by authorized role, link to
  consumption/deviation. Validation: deviation beyond tolerance requires approval
  (BR-PROD-MATL-001).

## SCR-PROD-MREQ-003 — Other Material Request
- **SOURCE:** ZYGER. **FRS:** FR-PROD-MATL-003.
- Non-BOM material request with authorization; posts issue intent.

## SCR-PROD-CONSUMABLE-001 — Consumable Consumption
- **SOURCE:** ZYGER. **FRS:** FR-PROD-MATL-004.
- Records consumable usage (item, qty, uom, machine/op, job). Feeds consumable cost + consumption
  reports. Consists of a controlled inventory issue/consumption intent.

## SCR-PROD-CONSUME-001 — Material Consumption Posting
- **SOURCE:** CR + REF + ZYGER. **FRS:** FR-PROD-MATL-005.
- Per operation/material line: requiredQty (BOM-derived), issuedQty, availableQty, consumedQty,
  deviationQty, returnedQty, rate (cost snapshot), batch/lot. Validation: consumed ≤ available
  unless approved (ASM-PROD-003). Creates PRODUCTION_CONSUMPTION stock transaction.

| Field ID | Name | Label | Type | Mand | Default | Editable | Source | Validation | BR | API | DB | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-MATL-001 | opEventId | Operation Event | FK | Yes | — | On create | Session | active op required | — | opEventId | prod_consumption_event.op_event_id | Yes |
| FLD-PROD-MATL-002 | itemId | Material (RM Code) | FK | Yes | — | On create | BOM/Item | the made/consumed item | — | itemId | consumption_event.item_id | Yes |
| FLD-PROD-MATL-003 | itemName | Material Name | Text | Derived | — | No | Item | auto from item master | — | (derived) | — | No |
| FLD-PROD-MATL-004 | requiredQty | Required Qty | Decimal | Yes | BOM calc | No | BOM | = output × rate | — | requiredQty | consumption_event.required_qty | Yes |
| FLD-PROD-MATL-005 | issuedQty | Total Issued | Decimal | Yes | — | No (sys) | Inventory | from issue txn | BR-PROD-INV-001 | issuedQty | consumption_event.issued_qty | Yes |
| FLD-PROD-MATL-006 | availableQty | Available Qty | Decimal | Derived | — | No (sys) | Rederived | issued−consumed+returned | ASM-PROD-001 | (derived) | — | Yes |
| FLD-PROD-MATL-007 | consumedQty | Consumed Qty | Decimal | Yes | 0 | Until submit | User | ≤ available unless approved | BR-PROD-INV-001 | consumedQty | consumption_event.consumed_qty | Yes |
| FLD-PROD-MATL-008 | deviationQty | Deviation Qty | Decimal | Derived | — | No (sys) | calc | consumed−standard | BR-PROD-MATL-001 | (derived) | consumption_event.deviation_qty | Yes |
| FLD-PROD-MATL-009 | returnedQty | Returned Qty | Decimal | Yes | 0 | Until submit | User | ≤ issued−consumed | BR-PROD-INV-003 | returnedQty | consumption_event.returned_qty | Yes |
| FLD-PROD-MATL-010 | rate | Rate | Decimal | Yes | — | No | Costing | cost snapshot, not editable | CFL-PROD-011 | rate | consumption_event.rate_snapshot | Yes |
| FLD-PROD-MATL-011 | batch | Batch | Text | Cond | — | Until submit | User | required if batch-controlled | CLAR-PROD-011 | batch | consumption_event.batch | Yes |
| FLD-PROD-MATL-012 | lot | Lot | Text | Cond | — | Until submit | User | required if lot-controlled | CLAR-PROD-011 | lot | consumption_event.lot | Yes |

---

# E. WIP AND OUTPUT SCREENS

## SCR-PROD-OUT-001 — Production Output View
- **SOURCE:** CR + REF. **FRS:** FR-PROD-OUT-001.
- Read-mostly: operation output block (accepted/rejected/rework/scrap, weight, lot/batch, dest
  stage). Used to feed FG/SFG receipt via BR-PROD-INV-002.

## SCR-PROD-WIP-001 — WIP Tracking
- **SOURCE:** PROPOSED. **FRS:** FR-PROD-WIP-001.
- Read-mostly: WIP by item/order/operation/batch/lot/qty/status/location. Derived read-only.

## SCR-PROD-PEND-001 — Production Pending
- **SOURCE:** CR-PROD-007. **FRS:** FR-PROD-PEND-001.
- Read-mostly: planned vs completed vs pending by order/operation; stopped-here reason; action
  required. Backend-derived (ASM-PROD-001).

---

# F. REWORK / REJECTION / SCRAP SCREENS

## SCR-PROD-REJ-001 — Rejection Recording
- **SOURCE:** CR + ZYGER. **FRS:** FR-PROD-REJ-001.
- Fields: source entry/op, rejectedQty, classification (REWORKABLE/SCRAP/HOLD-MRB), ncrRef,
  disposition. Validation: rejectedQty ≤ processed; classification per CLAR-PROD-002.

## SCR-PROD-SCRAP-001 — Scrap Generation
- **SOURCE:** ZYGER. **FRS:** FR-PROD-SCRAP-001.
- Fields: source entry/op, scrapQty, reason (catalogue), scrapType, batch/lot, value-context.
  Posts a SCRAP stock transaction. Validation: scrapQty ≤ processed; reason required.

## SCR-PROD-REWORK-001 — Rework Workspace
- **SOURCE:** ZYGER + CFL-PROD-002. **FRS:** FR-PROD-ENTRY-002/003.
- Combines rework order/entry source linkage, authorized qty, rework route ops, output and
  scrap/hold split. Validates BR-PROD-REWORK-001 (qty ≤ authorized, sourced).

---

# G. CONVERSION / DISASSEMBLY SCREENS

## SCR-PROD-CONV-001 — Product / Item Conversion
- **SOURCE:** CR-PROD-002 + ZYGER. **FRS:** FR-PROD-CONV-001.
- Header (convNo, type [PRODUCT/ITEM_CHANGE], inputItem, outputItem, inputQty, outputQty,
  lossQty, scrapQty, batch/lot) → verification → stock intents (input decrease, output increase,
  loss/scrap posting). Costing owns value (CLAR-PROD-008). Validation: output+loss+scrap = input
  (within tolerance); stock availability checked.

## SCR-PROD-ITEMCHG-001 — Item Change
- **SOURCE:** ZYGER. **FRS:** FR-PROD-ITEMCHG-001. Sub-case of conversion (item identifier/state).

## SCR-PROD-DISASM-001 — Disassembly
- **SOURCE:** ZYGER. **FRS:** FR-PROD-DISASM-001.
- Parent → components (reverse BOM) + by-products + loss/scrap. Posts parent decrease + component
  receipts. Validation: component+by+loss ≤ parent input within tolerance.

---

# H. IDLE TIME / STOPPAGE SCREENS

## SCR-PROD-IDLE-001 — Idle Time
- **SOURCE:** CR-PROD-006. **FRS:** FR-PROD-IDLE-001.
- Fields: idleNo, machineId, shiftId, startTs, endTs, duration (derived), idleReason (catalogue).
- Validation: reason required from catalogue; "Other" needs text (CLAR-PROD-006). Feeds OEE.

## SCR-PROD-STOP-001 — Line / Machine Stoppage
- **SOURCE:** ZYGER. **FRS:** FR-PROD-STOP-001.
- Stoppage type; if machine-failure linked → hand-off to Maintenance. Duration derived.

---

# I. PLANNING SCREENS

## SCR-PROD-PLAN-001 — Planning Demand
- **SOURCE:** ZYGER. **FRS:** FR-PROD-PLAN-001. Demand input screen (orders/forecast/MRP).

## SCR-PROD-PLAN-002 — Item-wise Daily Plan
- **SOURCE:** ZYGER. **FRS:** FR-PROD-PLAN-002. Daily plan by item.

## SCR-PROD-PLAN-003 — Time Bucket Definition & Schedule for Next Bucket
- **SOURCE:** ZYGER. **FRS:** FR-PROD-PLAN-003/004. Define buckets; generate rolling schedule.

## SCR-PROD-PLAN-004 — Production Budget / Forecast (Core, Split, Updation, Revision)
- **SOURCE:** ZYGER. **FRS:** FR-PROD-PLAN-005..009. Budget+forecast with time-bucket split and
  revision control. Engine flagged FUTURE (ASI/APS migration).

## SCR-PROD-PLAN-005 — PO Day/Week/Month-wise Schedule
- **SOURCE:** ZYGER. **FRS:** FR-PROD-PLAN-010. Schedule granularity views.

## SCR-PROD-PLAN-006 — Schedule Updation
- **SOURCE:** ZYGER. **FRS:** FR-PROD-PLAN-011. Revise schedule with change request + audit.

## SCR-PROD-WC-001 — Work Center Daily / Period Plan
- **SOURCE:** ZYGER. **FRS:** FR-PROD-WC-001/002. Resource load per day/period.

## SCR-PROD-WC-002 — Work Center Re-Allocation
- **SOURCE:** ZYGER. **FRS:** FR-PROD-WC-003. Reassign work w/ reason+authorization (BR-PROD-WC-001).

## SCR-PROD-CAP-001 — Capacity Assessment
- **SOURCE:** ZYGER. **FRS:** FR-PROD-CAP-001. Machine + manpower load vs capacity.

---

# J. EXCEPTION AND DEVIATION SCREENS

## SCR-PROD-DEV-001 — Production Plan Deviation
- **SOURCE:** ZYGER. **FRS:** FR-PROD-EXCP-001. Deviation reason + responsible area + action.

## SCR-PROD-DLVY-001 — Delay to Customer Delivery
- **SOURCE:** ZYGER. **FRS:** FR-PROD-PLAN-012 / FR-PROD-EXCP-002. Delay reason + attributed period.

## SCR-PROD-NCONF-001 — Production Non-Conformity
- **SOURCE:** ZYGER. **FRS:** FR-PROD-EXCP-003. Records production-level non-conformity; links/
  creates NCR in Quality (not owned here).

---

# DOCUMENT PACKAGE STATUS

| Item | Status |
|---|---|
| DOCUMENTS 01–08 | COMPLETE |
| Requirement Baseline | ESTABLISHED (DOCUMENT 06 gate) |
| DEC-PROD-001 | APPROVED FOR FRS DESIGN |
| Open clarifications | CLAR-PROD-001 (MSL) — **RESOLVED = Minimum Stock Level** (ASM-PROD-015; Inventory/Store, Production integration-only) · CLAR-PROD-002..013 (open, proceeding via ASM-PROD-* assumptions) |
| NEXT STAGE | DOCUMENT 09+ — Field-wise detail, Business Rules (DOC 10), Workflow & Transactions (DOC 11), Database (DOC 12), API (DOC 13), Tests & Traceability (DOC 14) |
| READY | READY FOR FRS DEVELOPMENT REVIEW AND APPROVAL |

**Constraint check:** DOCUMENTS 07/08 use stable IDs (FR-PROD-*, BR-PROD-*, WF/BR/NUM-*,
SCR-PROD-*, FLD-PROD-*) and independently addressable submodule sections — split-ready for future
per-submodule files without renumbering or breaking traceability.

**END OF DOCUMENT 08**