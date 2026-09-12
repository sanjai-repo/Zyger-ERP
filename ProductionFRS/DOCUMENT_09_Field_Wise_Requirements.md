# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 09 — FIELD-WISE REQUIREMENTS AND VALIDATION

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 09 — Field-wise Requirements and Validation |
| Baseline | DOCUMENT 06; Architecture DEC-PROD-001; DOCUMENT 07 (FRS); DOCUMENT 08 (screen baseline) |
| Status | AUTHORITATIVE FIELD-WISE SPECIFICATION (supersedes bullet-level detail in DOC 08) |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |
| Corrections | Resolves FLD-GAP-001..010 of DOCUMENT 08A |

**Relationship to DOCUMENT 08.** DOCUMENT 08 remains the screen-baseline (per-screen purpose,
roles, layout, status, source classification). DOCUMENT 09 is the authoritative, exhaustive
field-wise detail. Fields defined in DOC 08 are restated here at full depth (single source of
detail; DOC 08 keeps the concise baseline).

---

## TABLE OF CONTENTS

- General Field Conventions and Validation
- Group A — Production Order Screens
- Group B — Job Card Screens
- Group C — Production Execution Screens
- Group D — Material Request & Consumption Screens
- Group E — WIP and Output Screens
- Group F — Rework / Rejection / Scrap Screens
- Group G — Conversion / Disassembly Screens
- Group H — Idle Time / Stoppage Screens
- Group I — Planning Screens
- Group J — Exception and Deviation Screens
- Cross-Field and Cross-Screen Validations

## FIELD TABLE COLUMN CONTRACT

| Column | Meaning |
|---|---|
| Field ID | stable, split-ready, unique |
| Screen ID | owning screen (DOC 08) |
| Section | logical screen area |
| Field Name | API/DB-safe name (snake_case) |
| Label | UI label |
| Description | purpose |
| Data Type | DB/API type |
| Mandatory | Y/N/Cond |
| Default | initial value |
| Editable When | doc state permitting edit |
| Locked When | doc state that locks |
| Source | CR/REF/ZYGER/PROPOSED/System/Calc/Catalogue |
| Validation | explicit rule / constraint |
| BR | Business Rule ID (DOC 10) |
| DB Table / Column | DOC 12 mapping |
| API Request / Response | DOC 13 mapping |
| Audit | audit requirement |

---

# CONVENTIONS

- **Concise notation:** `edit(until=SUBMIT)`, `lock(≥APPROVE)`, `uid(unique)`, `fk(table)`,
  `enum(a|b|c)`, `derived(calc)`, `cost_snapshot(ro)`.
- **Status vocabulary** follows the Workflow Status Dictionary (DOC 11). Where a screen refers
  to `Released`/`In Progress` etc., these map to canonical codes defined there.
- **All field tables use the same 18-column contract above**; repeated boilerplate appears once
  per table.
- **Backend-derived read-only:** pending, WIP, available, processed, runtime, deviation are
  system-computed (ASM-PROD-001) — never user-editable; they are audit-required because they are
  derived from audited events.

---

# GROUP A — PRODUCTION ORDER SCREENS

## SCR-PROD-ORDER-001 — Production Order (Single)

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API Req/Resp | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-ORDER-001 | ORDER-001 | Header | order_no | Production Order No | auto number | varchar(30) | Y | preview | never | always | Num engine | unique; preview repeatable | BR-NUM-001 | prod_order.order_no | req(orderNo)/resp | Y |
| FLD-PROD-ORDER-002 | ORDER-001 | Header | order_type | Type | SINGLE/COMPOSITE/REWORK | enum | Y | SINGLE | on-create | ≥create | Catalogue | enum(SINGLE|COMPOSITE|REWORK) | BR-PROD-001 | prod_order.type | req(type)/resp | Y |
| FLD-PROD-ORDER-003 | ORDER-001 | Header | item_id | Final Item | made item | fk(item) | Y | — | on-create | ≥create | Item Master | active+approved item | BR-PROD-010 | prod_order.item_id | req(itemId)/resp | Y |
| FLD-PROD-ORDER-004 | ORDER-001 | Header | planned_qty | Planned Qty | qty to make | numeric(18,3) | Y | BOM default | until RELEASED | ≥RELEASED | User | >0 | BR-PROD-010 | prod_order.planned_qty | req(plannedQty)/resp | Y |
| FLD-PROD-ORDER-005 | ORDER-001 | Header | uom | UOM | item unit | fk(uom) | Y | item UOM | on-create | ≥create | Item Master | valid UOM | — | prod_order.uom | req(uom)/resp | Y |
| FLD-PROD-ORDER-006 | ORDER-001 | Header | priority | Priority | Low/Med/High/Crit | enum | Y | MEDIUM | until RELEASED | ≥RELEASED | Catalogue | enum | — | prod_order.priority | req(priority)/resp | Y |
| FLD-PROD-ORDER-007 | ORDER-001 | Header | start_date | Start Date | plan start | date | Y | today | until RELEASED | ≥RELEASED | User | ≤ due_date | — | prod_order.start_date | req(startDate)/resp | Y |
| FLD-PROD-ORDER-008 | ORDER-001 | Header | due_date | Due Date | plan due | date | Y | — | until RELEASED | ≥RELEASED | User | ≥ start_date | — | prod_order.due_date | req(dueDate)/resp | Y |
| FLD-PROD-ORDER-009 | ORDER-001 | Header | plant_id | Plant | plant | fk(plant) | Y | user plant | never | always | Plant | assigned to user | — | prod_order.plant_id | req(plantId)/resp | Y |
| FLD-PROD-ORDER-010 | ORDER-001 | Body | bom_rev | BOM Revision | engineering BOM rev | fk(bom_rev) | Y | active rev | on-create | ≥create | Engineering | approved BOM required | BR-PROD-010 | prod_order.bom_rev | req(bomRev)/resp | Y |
| FLD-PROD-ORDER-011 | ORDER-001 | Body | route_rev | Route Revision | engineering route rev | fk(route_rev) | Y | active rev | on-create | ≥create | Engineering | approved route required | BR-PROD-010 | prod_order.route_rev | req(routeRev)/resp | Y |
| FLD-PROD-ORDER-012 | ORDER-001 | Header | demand_ref | Demand Ref | sales/plan ref | varchar(60) | N | — | on-create | ≥create | Plan/Sales | optional | — | prod_order.demand_ref | req(demandRef)/resp | N |
| FLD-PROD-ORDER-013 | ORDER-001 | Header | status | Status | doc status | enum | Y | DRAFT | system | system | Lifecycle | transitions (DOC 11) | BR-WF-001 | prod_order.status | resp(status) | Y |
| FLD-PROD-ORDER-014 | ORDER-001 | Body | work_order_id | Work Order | execution WO ref | fk(wo) | N | — | on-create | ≥create | System/Sales | per TERM-PROD-001 | BR-PROD-010 | prod_order.wo_id | req(workOrderId)/resp | Y |

## SCR-PROD-ORDER-002 — Composite Production Order
Same header/body as ORDER-001 (reuses FLD-PROD-ORDER-001..014) plus:

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-ORDER-020 | ORDER-002 | Member | member_order_ids | Member Orders | sub-orders | fk[] | Y | — | until RELEASED | ≥RELEASED | User | ≥1 member; each valid order | BR-PROD-010 | prod_order_x_member | req(memberOrderIds)/resp | Y |
| FLD-PROD-ORDER-021 | ORDER-002 | Header | parent_composite_id | Parent Composite | reverse ref | fk(order) | N | — | on-create | ≥create | System | for members only | — | prod_order.parent_composite_id | resp(parentCompositeId) | Y |
| FLD-PROD-ORDER-022 | ORDER-002 | Header | release_mode | Release Mode | release composite+members | enum | Y | ATOMIC | until RELEASED | ≥RELEASED | User | enum(ATOMIC|MEMBERS_ONLY) | BR-WF-001 | prod_order.release_mode | req(releaseMode)/resp | Y |

## SCR-PROD-ORDER-003 — Rework Production Order
Adds to ORDER-001:

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-ORDER-030 | ORDER-003 | Header | source_order_id | Source Order | original order | fk(order) | Y | — | on-create | ≥create | System | valid + completed/rejected origin | BR-PROD-REWORK-001 | prod_order.source_order_id | req(sourceOrderId)/resp | Y |
| FLD-PROD-ORDER-031 | ORDER-003 | Header | source_entry_id | Source Entry | original entry | fk(entry) | Y | — | on-create | ≥create | System | valid entry | BR-PROD-REWORK-001 | prod_order.source_entry_id | req(sourceEntryId)/resp | Y |
| FLD-PROD-ORDER-032 | ORDER-003 | Header | ncr_ref | NCR Reference | quality NCR no | varchar(60) | Y | — | on-create | ≥create | Quality | required for rework | BR-PROD-REWORK-001 | prod_order.ncr_ref | req(ncrRef)/resp | Y |
| FLD-PROD-ORDER-033 | ORDER-003 | Header | authorized_qty | Authorized Qty | qty allowed | numeric(18,3) | Y | — | until RELEASED | ≥RELEASED | Quality | ≤ NCR authorized; >0 | BR-PROD-REWORK-001 | prod_order.authorized_qty | req(authorizedQty)/resp | Y |
| FLD-PROD-ORDER-034 | ORDER-003 | Body | rework_route_rev | Rework Route Rev | rework route | fk(route_rev) | Y | — | on-create | ≥create | Engineering | approved rework route | BR-PROD-REWORK-001 | prod_order.rework_route_rev | req(reworkRouteRev)/resp | Y |

## SCR-PROD-ORDER-004 — Production Order Short Close
Adds to ORDER-001:

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-ORDER-040 | ORDER-004 | Header | close_reason | Close Reason | catalogue | fk(reason) | Y | — | at-close | after | Catalogue | reason mandatory | BR-PROD-ENTRY-001 | prod_order.close_reason | req(closeReason)/resp | Y |
| FLD-PROD-ORDER-041 | ORDER-004 | Body | remaining_qty_disposition | Remaining Disposition | cancel/scrap/return | enum | Y | CANCEL | at-close | after | User | enum(CANCEL|SCRAP|RETURN) | BR-PROD-ORDER-004 | prod_order.rem_qty_disp | req(remainingQtyDisposition)/resp | Y |
| FLD-PROD-ORDER-042 | ORDER-004 | Header | authorized_by | Authorized By | approving user | fk(user) | Y | — | at-close | after | System | plant head/planner only | BR-WF-001 | prod_order.close_authorized_by | resp(authorizedBy) | Y |

---

# GROUP B — JOB CARD SCREENS

## SCR-PROD-JOBCARD-001 — Job Card

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-JOBCARD-001 | JOB-001 | Header | job_no | Job Card No | auto number | varchar(30) | Y | preview | never | always | Num | unique; preview repeatable | BR-NUM-001 | prod_job_card.job_no | req(jobNo)/resp | Y |
| FLD-PROD-JOBCARD-002 | JOB-001 | Header | order_id | Production Order | parent | fk(order) | Y | — | on-create | ≥create | Order | released order | — | prod_job_card.order_id | req(orderId)/resp | Y |
| FLD-PROD-JOBCARD-003 | JOB-001 | Header | item_id | Final Item | made item | fk(item) | Y | from order | never | always | Order/Item | matches order item | — | prod_job_card.item_id | req(itemId)/resp | Y |
| FLD-PROD-JOBCARD-004 | JOB-001 | Header | planned_qty | Planned Qty | qty | numeric(18,3) | Y | from order | until RELEASED | ≥RELEASED | Order | ≤ order pending qty | BR-PROD-PEND-001 | prod_job_card.planned_qty | req(plannedQty)/resp | Y |
| FLD-PROD-JOBCARD-005 | JOB-001 | Body | material_ok | Material Availability | indicator | boolean | N | false | never | always | derived(Inventory) | partial allowed | ASM-PROD-003 | — (derived) | resp(materialOk) | N |
| FLD-PROD-JOBCARD-006 | JOB-001 | Header | status | Status | doc status | enum | Y | CREATED | system | system | Lifecycle | transitions (DOC 11) | BR-WF-001 | prod_job_card.status | resp(status) | Y |
| FLD-PROD-JOBCARD-007 | JOB-001 | Body | work_center_id | Work Center | WC | fk(wc) | Y | — | on-create | ≥create | Master | active+eligible | BR-PROD-020 | prod_job_card.wc_id | req(workCenterId)/resp | Y |
| FLD-PROD-JOBCARD-008 | JOB-001 | Body | machine_id | Initial Machine | machine | fk(machine) | N | — | on-create | ≥create | Master | eligible for ops | BR-PROD-020 | prod_job_card.machine_id | req(machineId)/resp | Y |
| FLD-PROD-JOBCARD-009 | JOB-001 | Header | start_date | Start Date | plan start | date | Y | today | until RELEASED | ≥RELEASED | User | ≤ due_date | — | prod_job_card.start_date | req(startDate)/resp | Y |
| FLD-PROD-JOBCARD-010 | JOB-001 | Header | due_date | Due Date | plan due | date | Y | — | until RELEASED | ≥RELEASED | User | ≥ start_date | — | prod_job_card.due_date | req(dueDate)/resp | Y |
| FLD-PROD-JOBCARD-011 | JOB-001 | Header | operator_id | Operator | operator | fk(employee) | N | — | on-create | ≥create | Master | active/plant/auth | BR-PROD-020 | prod_job_card.operator_id | req(operatorId)/resp | Y |
| FLD-PROD-JOBCARD-012 | JOB-001 | Header | shift_id | Shift | shift | fk(shift) | N | current | on-create | ≥create | Master | valid shift | — | prod_job_card.shift_id | req(shiftId)/resp | Y |

## SCR-PROD-JOBCARD-002 — Job Entry
Subscreen of JOB-001 creation (reuses fields above); adds per-subjob plan:

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-JOBCARD-020 | JOB-002 | Entry | subjob_plan | Subjob Plan | planned output/subjob | array | Y | from route | until RELEASED | ≥RELEASED | Route | each maps to one op (1:1) | CLAR-PROD-005 | prod_subjob_plan | req(subjobPlan)/resp | Y |
| FLD-PROD-JOBCARD-021 | JOB-002 | Entry | material_snapshot | Material Snapshot | BOM req snapshot | array | Y | BOM calc | never | always | BOM | derived | — | prod_job_mat_snapshot | resp(materialSnapshot) | Y |

## SCR-PROD-JOBCARD-003 — Subjob Entry
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-JOBCARD-030 | JOB-003 | Subjob | subjob_no | Subjob No | subjob id | varchar(30) | Y | seq | never | always | Num | unique per job | BR-NUM-001 | prod_subjob.subjob_no | req(subjobNo)/resp | Y |
| FLD-PROD-JOBCARD-031 | JOB-003 | Subjob | operation_id | Operation | route op | fk(operation) | Y | route seq | on-create | ≥create | Route | op in approved route | BR-PROD-010 | prod_subjob.operation_id | req(operationId)/resp | Y |
| FLD-PROD-JOBCARD-032 | JOB-003 | Subjob | machine_id | Machine | op machine | fk(machine) | Y | — | until SUBMIT | ≥SUBMIT | Master | eligible | BR-PROD-020 | prod_subjob.machine_id | req(machineId)/resp | Y |
| FLD-PROD-JOBCARD-033 | JOB-003 | Subjob | operator_id | Operator | op operator | fk(employee) | Y | — | until SUBMIT | ≥SUBMIT | Master | active/auth | BR-PROD-020 | prod_subjob.operator_id | req(operatorId)/resp | Y |
| FLD-PROD-JOBCARD-034 | JOB-003 | Subjob | input_qty | Input Qty | op input | numeric(18,3) | Y | prev accepted | until SUBMIT | ≥SUBMIT | calc | ≥0 | BR-PROD-WIP-001 | prod_subjob.input_qty | req(inputQty)/resp | Y |
| FLD-PROD-JOBCARD-035 | JOB-003 | Subjob | output_qty | Output Qty | op output | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User | ≤ input (reconciled) | BR-PROD-ENTRY-001 | prod_subjob.output_qty | req(outputQty)/resp | Y |
| FLD-PROD-JOBCARD-036 | JOB-003 | Subjob | quality_gate | Quality Gate | gate flag | boolean | Y | from route | never | always | Route | per BR-PROD-QA-001 | BR-PROD-QA-001 | prod_subjob.quality_gate | resp(qualityGate) | Y |

## SCR-PROD-JOBCARD-004 — Job Completion
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-JOBCARD-040 | JOB-004 | Complete | completion_check | Completion Check | per-subjob status | derived | Y | — | never | always | calc | all COMPLETED or HPV | BR-PROD-JOBCARD-001 | — (derived) | resp(completionCheck) | Y |
| FLD-PROD-JOBCARD-041 | JOB-004 | Complete | final_quality | Final Quality | final gate result | enum | Y | PENDING | at-close | after | Quality | PASS/FAIL/HELD | BR-PROD-QA-001 | prod_job_card.final_quality | req(finalQuality)/resp | Y |
| FLD-PROD-JOBCARD-042 | JOB-004 | Complete | hold_reason | Hold Reason | if any subjob pending | fk(reason) | Cond | — | at-close | after | Catalogue | required if ON_HOLD | BR-PROD-JOBCARD-001 | prod_job_card.hold_reason | req(holdReason)/resp | Y |

---

# GROUP C — PRODUCTION EXECUTION SCREENS

## SCR-PROD-ENTRY-001 — Final-Part Production Workspace

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-ENTRY-001 | ENTRY-001 | Header | session_no | Production Entry No | auto number | varchar(30) | Y | preview | never | always | Num | unique; preview repeatable | BR-NUM-001 | prod_execution_session.session_no | req(sessionNo)/resp | Y |
| FLD-PROD-ENTRY-002 | ENTRY-001 | Header | job_card_id | Job Card / Batch | job | fk(job_card) | Y | — | on-create | ≥create | Job Card | released job | — | prod_execution_session.job_card_id | req(jobCardId)/resp | Y |
| FLD-PROD-ENTRY-003 | ENTRY-001 | Header | item_id | Final Item | made item | fk(item) | Y | from job | never | always | Order/Item | matches job | BR-PROD-010 | session.item_id | req(itemId)/resp | Y |
| FLD-PROD-ENTRY-004 | ENTRY-001 | Header | work_order_id | Work Order | WO | fk(wo) | Y | from job | never | always | Order | per TERM-PROD-001 | — | session.wo_id | req(workOrderId)/resp | Y |
| FLD-PROD-ENTRY-005 | ENTRY-001 | Header | entry_type | Entry Type | doc category | enum | Y | PRODUCTION | on-create only | ≥create | Catalogue | PRODUCTION\|REWORK\|MULTI_OUTPUT | BR-PROD-001 | session.entry_type | req(entryType)/resp | Y |
| FLD-PROD-ENTRY-006 | ENTRY-001 | Header | prod_type | Production Type | General/Rework | enum | Y | GENERAL | on-create only | ≥create | Catalogue | GENERAL\|REWORK | BR-PROD-002 | session.prod_type | req(prodType)/resp | Y |
| FLD-PROD-ENTRY-007 | ENTRY-001 | Header | shift_id | Shift | shift | fk(shift) | Y | current | on-create | ≥create | Master | valid shift | — | session.shift_id | req(shiftId)/resp | Y |
| FLD-PROD-ENTRY-008 | ENTRY-001 | Header | supervisor_id | Supervisor | supervisor | fk(employee) | Y | — | on-create | ≥create | Employee | active+plant+auth | — | session.supervisor_id | req(supervisorId)/resp | Y |
| FLD-PROD-ENTRY-009 | ENTRY-001 | Header | entry_date | Entry Date | tx date | date | Y | today | until SUBMIT | ≥SUBMIT | User | — | — | session.entry_date | req(entryDate)/resp | Y |
| FLD-PROD-ENTRY-010 | ENTRY-001 | Header | prod_date | Actual Production Date | when work occurred | timestamp | Y | today | until SUBMIT | ≥SUBMIT | User | = actual production occurrence | BR-PROD-004 | session.actual_prod_ts | req(prodDate)/resp | Y |
| FLD-PROD-ENTRY-011 | ENTRY-001 | Header | status | Status | doc status | enum | Y | DRAFT | system | system | Lifecycle | transitions (DOC 11) | BR-WF-001 | session.status | resp(status) | Y |
| FLD-PROD-ENTRY-012 | ENTRY-001 | Op | operation_id | Operation | route op | fk(op) | Y | route seq | — | — | Route | from approved route; seq control | BR-PROD-010 | op_event.operation_id | req(operationId)/resp | Y |
| FLD-PROD-ENTRY-013 | ENTRY-001 | Op | machine_id | Machine | machine | fk(machine) | Y | — | until SUBMIT | ≥SUBMIT | Master | wc+active+not-down+eligible | BR-PROD-020 | op_event.machine_id | req(machineId)/resp | Y |
| FLD-PROD-ENTRY-014 | ENTRY-001 | Op | operator_id | Operator | operator | fk(employee) | Y | — | until SUBMIT | ≥SUBMIT | Employee | active+plant+skill+machine+shift | BR-PROD-020 | op_event.operator_id | req(operatorId)/resp | Y |
| FLD-PROD-ENTRY-015 | ENTRY-001 | Op | start_ts | Actual Start | op start | timestamp | Y | recorded | until SUBMIT | ≥SUBMIT | User/scan | ≥0 | BR-PROD-004 | op_event.start_ts | req(startTs)/resp | Y |
| FLD-PROD-ENTRY-016 | ENTRY-001 | Op | end_ts | Actual End | op end | timestamp | Y | recorded | until SUBMIT | ≥SUBMIT | User/scan | ≥ start_ts | BR-PROD-004 | op_event.end_ts | req(endTs)/resp | Y |
| FLD-PROD-ENTRY-017 | ENTRY-001 | Op | runtime | Runtime | derived | interval | derived | — | never | always | calc | end_ts−start_ts−idle | — | op_event.runtime_s | resp(runtime) | Y |
| FLD-PROD-ENTRY-018 | ENTRY-001 | Op | input_qty | Input Qty | op input | numeric(18,3) | Y | prev accepted | — | — | calc | ≥0 | BR-PROD-WIP-001 | op_event.input_qty | req(inputQty)/resp | Y |
| FLD-PROD-ENTRY-019 | ENTRY-001 | Op | processed_qty | Processed Qty | derived | numeric | derived | — | never | always | calc | = acc+rej+rew+scrap | BR-PROD-ENTRY-001 | op_event.processed_qty | resp(processedQty) | Y |
| FLD-PROD-ENTRY-020 | ENTRY-001 | Op | accepted_qty | Accepted Qty | net good | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User/system | ≤ processed | BR-PROD-ENTRY-001 | op_event.accepted_qty | req(acceptedQty)/resp | Y |
| FLD-PROD-ENTRY-021 | ENTRY-001 | Op | rejected_qty | Rejected Qty | reject | numeric(18,3) | Y | 0 | until SUBMIT | ≥SUBMIT | User/system | ≤ processed; reconciled | BR-PROD-REJ-001 | op_event.rejected_qty | req(rejectedQty)/resp | Y |
| FLD-PROD-ENTRY-022 | ENTRY-001 | Op | rework_qty | Rework Qty | rework | numeric(18,3) | Y | 0 | until SUBMIT | ≥SUBMIT | User/system | ≤ processed | BR-PROD-REWORK-001 | op_event.rework_qty | req(reworkQty)/resp | Y |
| FLD-PROD-ENTRY-023 | ENTRY-001 | Op | scrap_qty | Scrap Qty | scrap | numeric(18,3) | Y | 0 | until SUBMIT | ≥SUBMIT | User/system | ≤ processed; reconciled | BR-PROD-SCRAP-001 | op_event.scrap_qty | req(scrapQty)/resp | Y |
| FLD-PROD-ENTRY-024 | ENTRY-001 | Op | inspection_required | Inspection Required | gate flag | boolean | Y | from route | never | always | Route | route-defined | BR-PROD-QA-001 | op_event.insp_required | resp(inspectionRequired) | Y |
| FLD-PROD-ENTRY-025 | ENTRY-001 | Op | inspection_status | Inspection Status | qual result | enum | Y | PENDING | post-insp | after PASS/FAIL | Quality | PENDING\|PASS\|FAIL\|HELD | BR-PROD-QA-001 | op_event.insp_status | resp(inspectionStatus) | Y |
| FLD-PROD-ENTRY-026 | ENTRY-001 | Op | inspection_ref | Inspection Reference | QC doc | varchar(60) | N | — | after insp | after | Quality | ref to QC doc | — | op_event.insp_ref | resp(inspectionRef) | Y |
| FLD-PROD-ENTRY-027 | ENTRY-001 | Op | quality_hold | Quality Hold | hold flag | boolean | N | false | system | system | Quality | true blocks next stage | BR-PROD-QA-001 | op_event.quality_hold | resp(qualityHold) | Y |
| FLD-PROD-ENTRY-028 | ENTRY-001 | Op | rework_ref | Rework Reference | rework/NCR | varchar(60) | N | — | on rework | after | System | rework entry/NCR ref | BR-PROD-REWORK-001 | op_event.rework_ref | resp(reworkRef) | Y |
| FLD-PROD-ENTRY-029 | ENTRY-001 | Op | ncr_ref | NCR Reference | NCR no | varchar(60) | N | — | on reject | after | Quality | required if reject | BR-PROD-REJ-001 | op_event.ncr_ref | resp(ncrRef) | Y |

## SCR-PROD-ENTRY-002 — Rework Production Entry
Adds to ENTRY-001:

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-ENTRY-030 | ENTRY-002 | Rework | source_entry_id | Source Entry | origin | fk(entry) | Y | — | on-create | ≥create | System | valid origin | BR-PROD-REWORK-001 | session.source_entry_id | req(sourceEntryId)/resp | Y |
| FLD-PROD-ENTRY-031 | ENTRY-002 | Rework | authorized_qty | Authorized Qty | cap | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | Quality | ≤ NCR authorized | BR-PROD-REWORK-001 | session.authorized_qty | req(authorizedQty)/resp | Y |
| FLD-PROD-ENTRY-032 | ENTRY-002 | Rework | rework_route_rev | Rework Route Rev | rework route | fk(route_rev) | Y | — | on-create | ≥create | Engineering | approved rework route | BR-PROD-REWORK-001 | session.rework_route_rev | req(reworkRouteRev)/resp | Y |

## SCR-PROD-ENTRY-003 — Multiple-Output Production Entry
Adds output lines:

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-ENTRY-040 | ENTRY-003 | Output | output_type | Output Type | primary/co/by | enum | Y | PRIMARY | until SUBMIT | ≥SUBMIT | User | PRIMARY\|CO\|BY | BR-PROD-ENTRY-003 | output_event.type | req(outputType)/resp | Y |
| FLD-PROD-ENTRY-041 | ENTRY-003 | Output | output_item_id | Output Item | co/by item | fk(item) | Cond | PRIMARY item | until SUBMIT | ≥SUBMIT | User | item at dest stage | — | output_event.item_id | req(outputItemId)/resp | Y |
| FLD-PROD-ENTRY-042 | ENTRY-003 | Output | output_qty | Output Qty | qty | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User | ≥0; sum reconciled | BR-PROD-ENTRY-003 | output_event.qty | req(outputQty)/resp | Y |
| FLD-PROD-ENTRY-043 | ENTRY-003 | Output | lot | Lot | lot | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if lot-controlled | CLAR-PROD-011 | output_event.lot | req(lot)/resp | Y |
| FLD-PROD-ENTRY-044 | ENTRY-003 | Output | batch | Batch | batch | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if batch-controlled | CLAR-PROD-011 | output_event.batch | req(batch)/resp | Y |
| FLD-PROD-ENTRY-045 | ENTRY-003 | Output | weight | Weight | output weight | numeric(12,3) | N | — | until SUBMIT | ≥SUBMIT | User | ≥0 | — | output_event.weight | req(weight)/resp | Y |
| FLD-PROD-ENTRY-046 | ENTRY-003 | Output | dest_stage | Destination Stage | next stage | varchar(60) | N | — | until SUBMIT | ≥SUBMIT | Route | valid stage | — | output_event.dest_stage | req(destStage)/resp | Y |

## SCR-PROD-LOG-001 — Production Log Sheet

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-LOG-001 | LOG-001 | Header | log_no | Log Sheet No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_log_entry.log_no | req(logNo)/resp | Y |
| FLD-PROD-LOG-002 | LOG-001 | Header | shift_id | Shift | shift | fk(shift) | Y | current | on-create | ≥create | Master | valid | — | prod_log_entry.shift_id | req(shiftId)/resp | Y |
| FLD-PROD-LOG-003 | LOG-001 | Header | machine_id | Machine | machine | fk(machine) | Y | — | on-create | ≥create | Master | active | BR-PROD-020 | prod_log_entry.machine_id | req(machineId)/resp | Y |
| FLD-PROD-LOG-004 | LOG-001 | Header | operator_id | Operator | operator | fk(employee) | N | — | until SUBMIT | ≥SUBMIT | Master | active | BR-PROD-020 | prod_log_entry.operator_id | req(operatorId)/resp | Y |
| FLD-PROD-LOG-005 | LOG-001 | Header | supervisor_id | Supervisor | super | fk(employee) | N | — | until SUBMIT | ≥SUBMIT | Employee | active | — | prod_log_entry.supervisor_id | req(supervisorId)/resp | Y |
| FLD-PROD-LOG-006 | LOG-001 | Line | activity | Activity | activity code | fk(activity) | Y | — | until SUBMIT | ≥SUBMIT | Catalogue | activity+quantity coherence | CLAR-PROD-004 | prod_log_entry.activity | req(activity)/resp | Y |
| FLD-PROD-LOG-007 | LOG-001 | Line | start_ts | Start | start | timestamp | Y | — | until SUBMIT | ≥SUBMIT | User/scan | ≤ end_ts | BR-PROD-004 | prod_log_entry.start_ts | req(startTs)/resp | Y |
| FLD-PROD-LOG-008 | LOG-001 | Line | end_ts | End | end | timestamp | Y | — | until SUBMIT | ≥SUBMIT | User/scan | ≥ start_ts | BR-PROD-004 | prod_log_entry.end_ts | req(endTs)/resp | Y |
| FLD-PROD-LOG-009 | LOG-001 | Line | duration | Duration | derived | interval | derived | — | never | always | calc | end_ts−start_ts | — | prod_log_entry.duration_s | resp(duration) | Y |
| FLD-PROD-LOG-010 | LOG-001 | Line | qty | Qty | qty (if prod activity) | numeric(18,3) | Cond | 0 | until SUBMIT | ≥SUBMIT | User | required if production activity | BR-PROD-LOG-001 | prod_log_entry.qty | req(qty)/resp | Y |

---

# GROUP D — MATERIAL REQUEST & CONSUMPTION SCREENS

## SCR-PROD-MREQ-001 — Production Material Request

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-MREQ-001 | MREQ-001 | Header | req_no | Material Req No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_req_material.req_no | req(reqNo)/resp | Y |
| FLD-PROD-MREQ-002 | MREQ-001 | Header | job_card_id | Job Card | job | fk(job_card) | Y | — | on-create | ≥create | Job Card | released job | — | prod_req_material.job_card_id | req(jobCardId)/resp | Y |
| FLD-PROD-MREQ-003 | MREQ-001 | Header | req_date | Req Date | tx date | date | Y | today | until SUBMIT | ≥SUBMIT | User | — | — | prod_req_material.req_date | req(reqDate)/resp | Y |
| FLD-PROD-MREQ-004 | MREQ-001 | Header | status | Status | doc status | enum | Y | DRAFT | system | system | Lifecycle | transitions | BR-WF-001 | prod_req_material.status | resp(status) | Y |
| FLD-PROD-MREQ-005 | MREQ-001 | Line | item_id | RM Code | material | fk(item) | Y | BOM | on-create | ≥create | BOM | in approved BOM | BR-PROD-MATL-001 | prod_req_material_line.item_id | req(itemId)/resp | Y |
| FLD-PROD-MREQ-006 | MREQ-001 | Line | required_qty | Required Qty | BOM req | numeric(18,3) | Y | BOM calc | never | always | BOM | = output×rate | BR-PROD-ENTRY-001 | prod_req_material_line.required_qty | req(requiredQty)/resp | Y |
| FLD-PROD-MREQ-007 | MREQ-001 | Line | issued_qty | Issued Qty | tx issue | numeric(18,3) | N | 0 | until SUBMIT | ≥SUBMIT | Inventory | partial allowed | ASM-PROD-003 | prod_req_material_line.issued_qty | req(issuedQty)/resp | Y |
| FLD-PROD-MREQ-008 | MREQ-001 | Line | store | Store | store | fk(store) | Y | — | until SUBMIT | ≥SUBMIT | Master | valid store | — | prod_req_material_line.store | req(store)/resp | Y |
| FLD-PROD-MREQ-009 | MREQ-001 | Line | rack | Rack | rack | varchar(20) | N | — | until SUBMIT | ≥SUBMIT | Master | — | — | prod_req_material_line.rack | req(rack)/resp | Y |
| FLD-PROD-MREQ-010 | MREQ-001 | Line | bin | Bin | bin | varchar(20) | N | — | until SUBMIT | ≥SUBMIT | Master | — | — | prod_req_material_line.bin | req(bin)/resp | Y |
| FLD-PROD-MREQ-011 | MREQ-001 | Line | lot | Lot | lot | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if lot-controlled | CLAR-PROD-011 | prod_req_material_line.lot | req(lot)/resp | Y |
| FLD-PROD-MREQ-012 | MREQ-001 | Line | batch | Batch | batch | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if batch-controlled | CLAR-PROD-011 | prod_req_material_line.batch | req(batch)/resp | Y |
| FLD-PROD-MREQ-013 | MREQ-001 | Line | uom | UOM | unit | fk(uom) | Y | item UOM | on-create | ≥create | Item | valid | — | prod_req_material_line.uom | req(uom)/resp | Y |

## SCR-PROD-MREQ-002 — Production Additional Material Request
Adds to MREQ-001:

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-MREQ-020 | MREQ-002 | Header | justification | Justification | why excess | text | Y | — | until SUBMIT | ≥SUBMIT | User | mandatory | BR-PROD-MATL-001 | prod_req_addl.justification | req(justification)/resp | Y |
| FLD-PROD-MREQ-021 | MREQ-002 | Line | deviation_qty | Deviation Qty | vs BOM | numeric(18,3) | Y | 0 | until SUBMIT | ≥SUBMIT | calc | consumed−standard | BR-PROD-MATL-001 | prod_req_addl_line.deviation_qty | req(deviationQty)/resp | Y |
| FLD-PROD-MREQ-022 | MREQ-002 | Header | approval_status | Approval Status | approve path | enum | Y | PENDING | review | approved/rejected | Approval | PENDING\|APPROVED\|REJECTED | BR-PROD-MATL-001 | prod_req_addl.approval_status | resp(approvalStatus) | Y |
| FLD-PROD-MREQ-023 | MREQ-002 | Header | approved_by | Approved By | approver | fk(user) | N | — | review | after | System | authorized role | BR-WF-001 | prod_req_addl.approved_by | resp(approvedBy) | Y |
| FLD-PROD-MREQ-024 | MREQ-002 | Header | approved_at | Approved At | stamp | timestamp | N | — | review | after | System | — | BR-WF-001 | prod_req_addl.approved_at | resp(approvedAt) | Y |

## SCR-PROD-MREQ-003 — Other Material Request
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-MREQ-030 | MREQ-003 | Header | req_no | Material Req No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_req_other.req_no | req(reqNo)/resp | Y |
| FLD-PROD-MREQ-031 | MREQ-003 | Header | purpose | Purpose | non-BOM purpose | fk(activity)/text | Y | — | until SUBMIT | ≥SUBMIT | User | mandatory | BR-PROD-MATL-003 | prod_req_other.purpose | req(purpose)/resp | Y |
| FLD-PROD-MREQ-032 | MREQ-003 | Header | authorized_by | Authorized By | approver | fk(user) | Y | — | review | after | System | authorized role | BR-WF-001 | prod_req_other.authorized_by | req(authorizedBy)/resp | Y |
| FLD-PROD-MREQ-033 | MREQ-003 | Line | item_id | Material | material | fk(item) | Y | — | until SUBMIT | ≥SUBMIT | User | valid item | — | prod_req_other_line.item_id | req(itemId)/resp | Y |
| FLD-PROD-MREQ-034 | MREQ-003 | Line | qty | Qty | qty | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User | >0 | — | prod_req_other_line.qty | req(qty)/resp | Y |

## SCR-PROD-CONSUMABLE-001 — Consumable Consumption

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-CONSUMABLE-001 | CONSUMABLE-001 | Header | cno | Consumable Entry No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_consumable_consumption.cno | req(cno)/resp | Y |
| FLD-PROD-CONSUMABLE-002 | CONSUMABLE-001 | Line | item_id | Consumable Item | consumable | fk(item) | Y | — | until SUBMIT | ≥SUBMIT | Master | consumable type | — | prod_consumable_consumption.item_id | req(itemId)/resp | Y |
| FLD-PROD-CONSUMABLE-003 | CONSUMABLE-001 | Line | qty | Qty | consumed | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User | >0 | BR-PROD-INV-001 | prod_consumable_consumption.qty | req(qty)/resp | Y |
| FLD-PROD-CONSUMABLE-004 | CONSUMABLE-001 | Line | uom | UOM | unit | fk(uom) | Y | item UOM | on-create | ≥create | Item | valid | — | prod_consumable_consumption.uom | req(uom)/resp | Y |
| FLD-PROD-CONSUMABLE-005 | CONSUMABLE-001 | Line | job_card_id | Job | job | fk(job_card) | N | — | until SUBMIT | ≥SUBMIT | Job Card | optional | — | prod_consumable_consumption.job_card_id | req(jobCardId)/resp | Y |
| FLD-PROD-CONSUMABLE-006 | CONSUMABLE-001 | Line | machine_id | Machine | machine | fk(machine) | N | — | until SUBMIT | ≥SUBMIT | Master | active | BR-PROD-020 | prod_consumable_consumption.machine_id | req(machineId)/resp | Y |

## SCR-PROD-CONSUME-001 — Material Consumption Posting

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-MATL-001 | CONSUME-001 | Line | op_event_id | Operation Event | op | fk(op_event) | Y | — | on-create | ≥create | Session | active op | — | prod_consumption_event.op_event_id | req(opEventId)/resp | Y |
| FLD-PROD-MATL-002 | CONSUME-001 | Line | item_id | Material (RM Code) | material | fk(item) | Y | — | on-create | ≥create | BOM/Item | made/consumed item | — | prod_consumption_event.item_id | req(itemId)/resp | Y |
| FLD-PROD-MATL-003 | CONSUME-001 | Line | item_name | Material Name | derived | varchar | derived | — | never | always | Item | auto | — | — (derived) | resp(itemName) | N |
| FLD-PROD-MATL-004 | CONSUME-001 | Line | required_qty | Required Qty | BOM req | numeric(18,3) | Y | BOM calc | never | always | BOM | = output×rate | BR-PROD-ENTRY-001 | prod_consumption_event.required_qty | resp(requiredQty) | Y |
| FLD-PROD-MATL-005 | CONSUME-001 | Line | issued_qty | Total Issued | issued | numeric(18,3) | Y | — | never | always | Inventory | from issue TXN | BR-PROD-INV-001 | prod_consumption_event.issued_qty | resp(issuedQty) | Y |
| FLD-PROD-MATL-006 | CONSUME-001 | Line | available_qty | Available Qty | derived | numeric | derived | — | never | always | calc | issued−consumed+returned | ASM-PROD-001 | — (derived) | resp(availableQty) | Y |
| FLD-PROD-MATL-007 | CONSUME-001 | Line | consumed_qty | Consumed Qty | consumed | numeric(18,3) | Y | 0 | until SUBMIT | ≥SUBMIT | User | ≤ available unless approved | BR-PROD-INV-001 | prod_consumption_event.consumed_qty | req(consumedQty)/resp | Y |
| FLD-PROD-MATL-008 | CONSUME-001 | Line | deviation_qty | Deviation Qty | derived | numeric | derived | — | never | always | calc | consumed−standard | BR-PROD-MATL-001 | prod_consumption_event.deviation_qty | resp(deviationQty) | Y |
| FLD-PROD-MATL-009 | CONSUME-001 | Line | returned_qty | Returned Qty | returned | numeric(18,3) | Y | 0 | until SUBMIT | ≥SUBMIT | User | ≤ issued−consumed | BR-PROD-INV-003 | prod_consumption_event.returned_qty | req(returnedQty)/resp | Y |
| FLD-PROD-MATL-010 | CONSUME-001 | Line | rate | Rate | cost snapshot | numeric | Y | — | never | always | Costing | cost snapshot, ro | CFL-PROD-011 | prod_consumption_event.rate_snapshot | resp(rate) | Y |
| FLD-PROD-MATL-011 | CONSUME-001 | Line | batch | Batch | batch | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if batch-controlled | CLAR-PROD-011 | prod_consumption_event.batch | req(batch)/resp | Y |
| FLD-PROD-MATL-012 | CONSUME-001 | Line | lot | Lot | lot | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if lot-controlled | CLAR-PROD-011 | prod_consumption_event.lot | req(lot)/resp | Y |

---

# GROUP E — WIP AND OUTPUT SCREENS

## SCR-PROD-OUT-001 — Production Output View (read-mostly)
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-OUT-001 | OUT-001 | Op | op_event_id | Operation Event | op | fk(op_event) | Y | — | never | always | derived | active op | — | output_event.op_event_id | resp(opEventId) | Y |
| FLD-PROD-OUT-002 | OUT-001 | Op | accepted_qty | Accepted | derived | numeric | Y | — | never | always | calc | from op output | BR-PROD-ENTRY-001 | output_event.accepted_qty | resp(acceptedQty) | Y |
| FLD-PROD-OUT-003 | OUT-001 | Op | rejected_qty | Rejected | derived | numeric | Y | — | never | always | calc | — | BR-PROD-REJ-001 | output_event.rejected_qty | resp(rejectedQty) | Y |
| FLD-PROD-OUT-004 | OUT-001 | Op | rework_qty | Rework | derived | numeric | N | — | never | always | calc | — | BR-PROD-REWORK-001 | output_event.rework_qty | resp(reworkQty) | Y |
| FLD-PROD-OUT-005 | OUT-001 | Op | scrap_qty | Scrap | derived | numeric | N | — | never | always | calc | — | BR-PROD-SCRAP-001 | output_event.scrap_qty | resp(scrapQty) | Y |
| FLD-PROD-OUT-006 | OUT-001 | Op | weight | Weight | derived | numeric | N | — | never | always | calc | from output | — | output_event.weight | resp(weight) | Y |
| FLD-PROD-OUT-007 | OUT-001 | Op | lot | Lot | derived | varchar | N | — | never | always | calc | — | CLAR-PROD-011 | output_event.lot | resp(lot) | Y |
| FLD-PROD-OUT-008 | OUT-001 | Op | dest_stage | Dest Stage | derived | varchar | N | — | never | always | calc | — | — | output_event.dest_stage | resp(destStage) | Y |

## SCR-PROD-WIP-001 — WIP Tracking (read-mostly)
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-WIP-001 | WIP-001 | WIP | item_id | Item | item | fk(item) | Y | filter | never | always | derived | filter | — | wip_agg | resp(itemId) | N |
| FLD-PROD-WIP-002 | WIP-001 | WIP | work_order_id | Work Order | WO | fk(wo) | N | filter | never | always | derived | filter | — | wip_agg | resp(workOrderId) | N |
| FLD-PROD-WIP-003 | WIP-001 | WIP | operation_id | Operation | op | fk(op) | N | filter | never | always | derived | filter | — | wip_agg | resp(operationId) | N |
| FLD-PROD-WIP-004 | WIP-001 | WIP | wip_qty | WIP Qty | derived | numeric | Y | — | never | always | calc | = accepted-in − processed | BR-PROD-WIP-001 | wip_agg | resp(wipQty) | Y |
| FLD-PROD-WIP-005 | WIP-001 | WIP | batch | Batch | filter | varchar | N | filter | never | always | derived | filter | CLAR-PROD-011 | wip_agg | resp(batch) | N |
| FLD-PROD-WIP-006 | WIP-001 | WIP | lot | Lot | filter | varchar | N | filter | never | always | derived | filter | CLAR-PROD-011 | wip_agg | resp(lot) | N |
| FLD-PROD-WIP-007 | WIP-001 | WIP | wip_status | WIP Status | derived | enum | Y | — | never | always | calc | NORMAL\|HOLD\|BLOCKED | BR-PROD-WIP-001 | wip_agg | resp(wipStatus) | Y |

## SCR-PROD-PEND-001 — Production Pending (read-mostly)
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-PEND-001 | PEND-001 | Pending | order_id | Order | order | fk(order) | Y | filter | never | always | derived | filter | — | pend_agg | resp(orderId) | N |
| FLD-PROD-PEND-002 | PEND-001 | Pending | planned_qty | Planned | derived | numeric | Y | — | never | always | calc | order planned | — | pend_agg | resp(plannedQty) | Y |
| FLD-PROD-PEND-003 | PEND-001 | Pending | completed_qty | Completed | derived | numeric | Y | — | never | always | calc | output delivered | BR-PROD-PEND-001 | pend_agg | resp(completedQty) | Y |
| FLD-PROD-PEND-004 | PEND-001 | Pending | pending_qty | Pending | derived | numeric | Y | — | never | always | calc | planned−completed | BR-PROD-PEND-001 | pend_agg | resp(pendingQty) | Y |
| FLD-PROD-PEND-005 | PEND-001 | Pending | stop_op | Stopped At | op | fk(op) | N | — | never | always | derived | where pending | BR-PROD-PEND-001 | pend_agg | resp(stopOp) | Y |
| FLD-PROD-PEND-006 | PEND-001 | Pending | stop_reason | Stopped Reason | reason | fk(reason) | N | — | never | always | derived | last idle/deviation | CLAR-PROD-006 | pend_agg | resp(stopReason) | Y |

---

# GROUP F — REWORK / REJECTION / SCRAP SCREENS

## SCR-PROD-REJ-001 — Rejection Recording

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-REJ-001 | REJ-001 | Header | rejection_no | Rejection No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_rejection.rejection_no | req(rejectionNo)/resp | Y |
| FLD-PROD-REJ-002 | REJ-001 | Header | op_event_id | Operation Event | source op | fk(op_event) | Y | — | on-create | ≥create | Session | valid op | BR-PROD-REJ-001 | prod_rejection.op_event_id | req(opEventId)/resp | Y |
| FLD-PROD-REJ-003 | REJ-001 | Line | rejected_qty | Rejected Qty | qty | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User/system | ≤ processed; reconciled | BR-PROD-REJ-001 | prod_rejection_line.qty | req(rejectedQty)/resp | Y |
| FLD-PROD-REJ-004 | REJ-001 | Line | classification | Classification | bucket | enum | Y | REWORKABLE | until CLASSIFIED | classify | User | REWORKABLE\|SCRAP\|HOLD_MRB | BR-PROD-REJ-001 | prod_rejection_line.classification | req(classification)/resp | Y |
| FLD-PROD-REJ-005 | REJ-001 | Line | reason | Reason | reject reason | fk(reason) | Y | — | until SUBMIT | ≥SUBMIT | Catalogue | reason mandatory | BR-PROD-REJ-001 | prod_rejection_line.reason | req(reason)/resp | Y |
| FLD-PROD-REJ-006 | REJ-001 | Line | ncr_ref | NCR Reference | NCR | varchar(60) | Cond | — | on-reject | after | Quality | required for scrap/hold | BR-PROD-REJ-001 | prod_rejection_line.ncr_ref | req(ncrRef)/resp | Y |
| FLD-PROD-REJ-007 | REJ-001 | Line | disposition | Disposition | outcome | enum | N | PENDING | after classify | after | Quality/User | REWORKROUTE\|SCRAP\|QUARANTINE | BR-PROD-REJ-001 | prod_rejection_line.disposition | req(disposition)/resp | Y |
| FLD-PROD-REJ-008 | REJ-001 | Line | disposition_date | Disposition Date | stamp | date | N | — | after classify | after | System | ≥ record date | BR-PROD-REJ-001 | prod_rejection_line.disposition_date | resp(dispositionDate) | Y |

## SCR-PROD-SCRAP-001 — Scrap Generation

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-SCRAP-001 | SCRAP-001 | Header | scrap_no | Scrap No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_scrap.scrap_no | req(scrapNo)/resp | Y |
| FLD-PROD-SCRAP-002 | SCRAP-001 | Header | op_event_id | Operation Event | source op | fk(op_event) | Y | — | on-create | ≥create | Session | valid op | BR-PROD-SCRAP-001 | prod_scrap.op_event_id | req(opEventId)/resp | Y |
| FLD-PROD-SCRAP-003 | SCRAP-001 | Line | scrap_qty | Scrap Qty | qty | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User/system | ≤ processed; reconciled | BR-PROD-SCRAP-001 | prod_scrap_line.qty | req(scrapQty)/resp | Y |
| FLD-PROD-SCRAP-004 | SCRAP-001 | Line | reason | Reason | scrap reason | fk(reason) | Y | — | until SUBMIT | ≥SUBMIT | Catalogue | reason mandatory | BR-PROD-SCRAP-001 | prod_scrap_line.reason | req(reason)/resp | Y |
| FLD-PROD-SCRAP-005 | SCRAP-001 | Line | scrap_type | Scrap Type | type | enum | Y | PROCESS | until SUBMIT | ≥SUBMIT | User | PROCESS\|REJECT\|END_OF_LIFE | BR-PROD-SCRAP-001 | prod_scrap_line.scrap_type | req(scrapType)/resp | Y |
| FLD-PROD-SCRAP-006 | SCRAP-001 | Line | value_context | Value Context | cost | numeric | N | — | never | always | Costing | cost snapshot | CFL-PROD-011 | prod_scrap_line.value_context | resp(valueContext) | Y |
| FLD-PROD-SCRAP-007 | SCRAP-001 | Line | authorization | Authorization | approve | enum | Y | AUTO | review | after | Approval | AUTO\|MANUAL_PENDING\|APPROVED | BR-PROD-SCRAP-001 | prod_scrap_line.authorization | resp(authorization) | Y |
| FLD-PROD-SCRAP-008 | SCRAP-001 | Line | authorized_by | Authorized By | approver | fk(user) | Cond | — | review | after | System | required if MANUAL | BR-PROD-SCRAP-001 | prod_scrap_line.authorized_by | resp(authorizedBy) | Y |
| FLD-PROD-SCRAP-009 | SCRAP-001 | Line | batch | Batch | batch | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if batch-controlled | CLAR-PROD-011 | prod_scrap_line.batch | req(batch)/resp | Y |
| FLD-PROD-SCRAP-010 | SCRAP-001 | Line | lot | Lot | lot | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if lot-controlled | CLAR-PROD-011 | prod_scrap_line.lot | req(lot)/resp | Y |

## SCR-PROD-REWORK-001 — Rework Workspace
Composes source linkage (SCR-PROD-ORDER-003) + rework entry (SCR-PROD-ENTRY-002) fields. Reuses
FLD-PROD-ORDER-030..034, FLD-PROD-ENTRY-030..032 plus:

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-REWORK-001 | REWORK-001 | Line | rework_qty | Rework Qty | output | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User | ≤ authorized_qty | BR-PROD-REWORK-001 | prod_rework_event.rework_qty | req(reworkQty)/resp | Y |
| FLD-PROD-REWORK-002 | REWORK-001 | Line | scrap_split | Scrap Split | from rework | numeric(18,3) | N | 0 | until SUBMIT | ≥SUBMIT | User | ≤ rework qty | BR-PROD-SCRAP-001 | prod_rework_event.scrap_split | req(scrapSplit)/resp | Y |
| FLD-PROD-REWORK-003 | REWORK-001 | Line | hold_split | Hold Split | quarantined | numeric(18,3) | N | 0 | until SUBMIT | ≥SUBMIT | User | ≤ rework qty | BR-PROD-REJ-001 | prod_rework_event.hold_split | req(holdSplit)/resp | Y |

---

# GROUP G — CONVERSION / DISASSEMBLY SCREENS

## SCR-PROD-CONV-001 — Product / Item Conversion

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-CONV-001 | CONV-001 | Header | conv_no | Conversion No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_conversion.conv_no | req(convNo)/resp | Y |
| FLD-PROD-CONV-002 | CONV-001 | Header | conv_type | Type | PRODUCT/ITEM_CHANGE | enum | Y | PRODUCT | on-create only | ≥create | Catalogue | PRODUCT\|ITEM_CHANGE | — | prod_conversion.type | req(convType)/resp | Y |
| FLD-PROD-CONV-003 | CONV-001 | Header | input_item | Input Item | source | fk(item) | Y | — | on-create | ≥create | Item | active | — | prod_conversion.input_item | req(inputItem)/resp | Y |
| FLD-PROD-CONV-004 | CONV-001 | Header | output_item | Output Item | target | fk(item) | Y | — | on-create | ≥create | Item | active | — | prod_conversion.output_item | req(outputItem)/resp | Y |
| FLD-PROD-CONV-005 | CONV-001 | Line | input_qty | Input Qty | source qty | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User | stock available | BR-PROD-INV-001 | prod_conversion_line.input_qty | req(inputQty)/resp | Y |
| FLD-PROD-CONV-006 | CONV-001 | Line | output_qty | Output Qty | target qty | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User | ≥0 | — | prod_conversion_line.output_qty | req(outputQty)/resp | Y |
| FLD-PROD-CONV-007 | CONV-001 | Line | loss_qty | Loss Qty | process loss | numeric(18,3) | Y | 0 | until SUBMIT | ≥SUBMIT | User | ≤ input_qty | — | prod_conversion_line.loss_qty | req(lossQty)/resp | Y |
| FLD-PROD-CONV-008 | CONV-001 | Line | scrap_qty | Scrap Qty | scrap | numeric(18,3) | Y | 0 | until SUBMIT | ≥SUBMIT | User | ≤ input_qty | BR-PROD-SCRAP-001 | prod_conversion_line.scrap_qty | req(scrapQty)/resp | Y |
| FLD-PROD-CONV-009 | CONV-001 | Line | batch | Batch | batch | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if batch-controlled | CLAR-PROD-011 | prod_conversion_line.batch | req(batch)/resp | Y |
| FLD-PROD-CONV-010 | CONV-001 | Line | lot | Lot | lot | varchar(40) | Cond | — | until SUBMIT | ≥SUBMIT | User | if lot-controlled | CLAR-PROD-011 | prod_conversion_line.lot | req(lot)/resp | Y |

**Reconciliation (BR-PROD-CONV-001):** `input_qty = output_qty + loss_qty + scrap_qty`
within tolerance (default ±0% loss unless a conversion yield/CO defines a permitted band).

## SCR-PROD-ITEMCHG-001 — Item Change
Identical to CONV-001 with `conv_type = ITEM_CHANGE`, `output_item = new item id`,
`output_qty = input_qty` (state/identifier change, no material loss by default). Reuses
FLD-PROD-CONV-001..010. Numbering NUM-PROD-CONV.

## SCR-PROD-DISASM-001 — Disassembly

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-DISASM-001 | DISASM-001 | Header | disasm_no | Disassembly No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_disassembly.disasm_no | req(disasmNo)/resp | Y |
| FLD-PROD-DISASM-002 | DISASM-001 | Header | parent_item | Parent Item | source | fk(item) | Y | — | on-create | ≥create | Item | active | — | prod_disassembly.parent_item | req(parentItem)/resp | Y |
| FLD-PROD-DISASM-003 | DISASM-001 | Header | parent_qty | Parent Qty | source qty | numeric(18,3) | Y | — | until SUBMIT | ≥SUBMIT | User | stock available | BR-PROD-INV-001 | prod_disassembly.parent_qty | req(parentQty)/resp | Y |
| FLD-PROD-DISASM-004 | DISASM-001 | Header | bom_rev | BOM Revision | reverse BOM | fk(bom_rev) | Y | active | on-create | ≥create | Engineering | approved BOM | BR-PROD-010 | prod_disassembly.bom_rev | req(bomRev)/resp | Y |
| FLD-PROD-DISASM-005 | DISASM-001 | Line | component_item | Component | part | fk(item) | Y | BOM | on-create | ≥create | BOM | in BOM | — | prod_disassembly_line.component_item | req(componentItem)/resp | Y |
| FLD-PROD-DISASM-006 | DISASM-001 | Line | component_qty | Component Qty | qty | numeric(18,3) | Y | BOM | until SUBMIT | ≥SUBMIT | User | ≥0 | — | prod_disassembly_line.component_qty | req(componentQty)/resp | Y |
| FLD-PROD-DISASM-007 | DISASM-001 | Line | by_product | By-Product | co-out | numeric(18,3) | N | 0 | until SUBMIT | ≥SUBMIT | User | ≥0 | — | prod_disassembly_line.by_product | req(byProduct)/resp | Y |
| FLD-PROD-DISASM-008 | DISASM-001 | Line | loss_qty | Loss Qty | loss | numeric(18,3) | N | 0 | until SUBMIT | ≥SUBMIT | User | ≥0 | — | prod_disassembly_line.loss_qty | req(lossQty)/resp | Y |

**Reconciliation (BR-PROD-DISASM-001):** parent_qty ≥ Σ(components+by+loss) within tolerance.

---

# GROUP H — IDLE TIME / STOPPAGE SCREENS

## SCR-PROD-IDLE-001 — Idle Time

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-IDLE-001 | IDLE-001 | Header | idle_no | Idle No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_idle.idle_no | req(idleNo)/resp | Y |
| FLD-PROD-IDLE-002 | IDLE-001 | Header | machine_id | Machine | machine | fk(machine) | Y | — | on-create | ≥create | Master | active | BR-PROD-020 | prod_idle.machine_id | req(machineId)/resp | Y |
| FLD-PROD-IDLE-003 | IDLE-001 | Header | shift_id | Shift | shift | fk(shift) | Y | current | on-create | ≥create | Master | valid | — | prod_idle.shift_id | req(shiftId)/resp | Y |
| FLD-PROD-IDLE-004 | IDLE-001 | Line | start_ts | Start | start | timestamp | Y | — | until SUBMIT | ≥SUBMIT | User/scan | ≤ end_ts | BR-PROD-004 | prod_idle.start_ts | req(startTs)/resp | Y |
| FLD-PROD-IDLE-005 | IDLE-001 | Line | end_ts | End | end | timestamp | Y | — | until SUBMIT | ≥SUBMIT | User/scan | ≥ start_ts | BR-PROD-004 | prod_idle.end_ts | req(endTs)/resp | Y |
| FLD-PROD-IDLE-006 | IDLE-001 | Line | duration | Duration | derived | interval | derived | — | never | always | calc | end_ts−start_ts | — | prod_idle.duration_s | resp(duration) | Y |
| FLD-PROD-IDLE-007 | IDLE-001 | Line | idle_reason | Idle Reason | catalogue | fk(reason) | Y | — | until SUBMIT | ≥SUBMIT | Catalogue | from catalogue; Other=text | CLAR-PROD-006 | prod_idle.reason_code | req(idleReason)/resp | Y |
| FLD-PROD-IDLE-008 | IDLE-001 | Line | reason_text | Reason Detail | details | text | Cond | — | until SUBMIT | ≥SUBMIT | User | required if Other | CLAR-PROD-006 | prod_idle.reason_text | req(reasonText)/resp | Y |

## SCR-PROD-STOP-001 — Line / Machine Stoppage

| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-STOP-001 | STOP-001 | Header | stoppage_no | Stoppage No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_stoppage.stoppage_no | req(stoppageNo)/resp | Y |
| FLD-PROD-STOP-002 | STOP-001 | Header | stoppage_type | Type | LINE/MACHINE | enum | Y | LINE | on-create only | ≥create | Catalogue | LINE\|MACHINE | — | prod_stoppage.type | req(stoppageType)/resp | Y |
| FLD-PROD-STOP-003 | STOP-001 | Header | machine_id | Machine | machine | fk(machine) | Cond | — | on-create | ≥create | Master | required if MACHINE | BR-PROD-020 | prod_stoppage.machine_id | req(machineId)/resp | Y |
| FLD-PROD-STOP-004 | STOP-001 | Header | line_id | Line | line | fk(line) | Cond | — | on-create | ≥create | Master | required if LINE | — | prod_stoppage.line_id | req(lineId)/resp | Y |
| FLD-PROD-STOP-005 | STOP-001 | Line | start_ts | Start | start | timestamp | Y | — | until SUBMIT | ≥SUBMIT | User/scan | ≤ end_ts | BR-PROD-004 | prod_stoppage.start_ts | req(startTs)/resp | Y |
| FLD-PROD-STOP-006 | STOP-001 | Line | end_ts | End | end | timestamp | Y | — | until SUBMIT | ≥SUBMIT | User/scan | ≥ start_ts | BR-PROD-004 | prod_stoppage.end_ts | req(endTs)/resp | Y |
| FLD-PROD-STOP-007 | STOP-001 | Line | duration | Duration | derived | interval | derived | — | never | always | calc | end_ts−start_ts | — | prod_stoppage.duration_s | resp(duration) | Y |
| FLD-PROD-STOP-008 | STOP-001 | Line | reason | Reason | stoppage reason | fk(reason) | Y | — | until SUBMIT | ≥SUBMIT | Catalogue | mandatory | CLAR-PROD-006 | prod_stoppage.reason_code | req(reason)/resp | Y |
| FLD-PROD-STOP-009 | STOP-001 | Line | maintenance_link | Maintenance Link | breakdown WO | fk(maint) | Cond | — | on-breakdown | after | Maintenance | required if breakdown | BR-PROD-STOP-001 | prod_stoppage.maintenance_ref | resp(maintenanceLink) | Y |

---

# GROUP I — PLANNING SCREENS

Planning screens are **planning-layer** artifacts. Their field tables below cover the plan
records in scope (transactions/plans owned by Production Planning Layer; the optimization engine
is external/FUTURE per DOC 03 §6.2). All share base fields: id, company/division/plant, status,
created/updated by/at.

## SCR-PROD-PLAN-001 — Planning Demand
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-PLAN-001 | PLAN-001 | Header | demand_id | Demand | id | uuid | Y | auto | never | always | auto | unique | — | prod_plan_demand.id | resp(demandId) | Y |
| FLD-PROD-PLAN-002 | PLAN-001 | Header | item_id | Item | item | fk(item) | Y | — | until PUBLISH | ≥PUBLISH | Item | active | — | prod_plan_demand.item_id | req(itemId)/resp | Y |
| FLD-PROD-PLAN-003 | PLAN-001 | Header | demand_qty | Demand Qty | qty | numeric(18,3) | Y | — | until PUBLISH | ≥PUBLISH | Plan/MRP/Sales | >0 | — | prod_plan_demand.demand_qty | req(demandQty)/resp | Y |
| FLD-PROD-PLAN-004 | PLAN-001 | Header | source_ref | Source Ref | order/Forecast/MRP | varchar(60) | N | — | until PUBLISH | ≥PUBLISH | MRP/Sales | optional | — | prod_plan_demand.source_ref | req(sourceRef)/resp | Y |
| FLD-PROD-PLAN-005 | PLAN-001 | Header | period | Period | bucket | date | Y | period | until PUBLISH | ≥PUBLISH | Plan | valid period | — | prod_plan_demand.period | req(period)/resp | Y |
| FLD-PROD-PLAN-006 | PLAN-001 | Header | status | Status | plan status | enum | Y | DRAFT | system | system | Lifecycle | transitions | BR-WF-001 | prod_plan_demand.status | resp(status) | Y |

## SCR-PROD-PLAN-002 — Item-wise Daily Plan
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-PLAN-010 | PLAN-002 | Header | plan_date | Plan Date | day | date | Y | today | until PUBLISH | ≥PUBLISH | Plan | ≤ due | — | prod_plan_item_daily.plan_date | req(planDate)/resp | Y |
| FLD-PROD-PLAN-011 | PLAN-002 | Line | item_id | Item | item | fk(item) | Y | — | until PUBLISH | ≥PUBLISH | Item | active | — | prod_plan_item_daily.item_id | req(itemId)/resp | Y |
| FLD-PROD-PLAN-012 | PLAN-002 | Line | plan_qty | Planned Qty | qty | numeric(18,3) | Y | — | until PUBLISH | ≥PUBLISH | Plan | >0 | — | prod_plan_item_daily.plan_qty | req(planQty)/resp | Y |
| FLD-PROD-PLAN-013 | PLAN-002 | Line | work_center_id | Work Center | WC | fk(wc) | N | — | until PUBLISH | ≥PUBLISH | Master | active | — | prod_plan_item_daily.wc_id | req(workCenterId)/resp | Y |

## SCR-PROD-PLAN-003 — Time Bucket Definition & Schedule for Next Bucket
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-PLAN-020 | PLAN-003 | Header | bucket_type | Bucket Type | day/week/month | enum | Y | DAY | on-create only | ≥create | Catalogue | DAY\|WEEK\|MONTH | FUT-PROD-003 | prod_plan_bucket.bucket_type | req(bucketType)/resp | Y |
| FLD-PROD-PLAN-021 | PLAN-003 | Header | bucket_start | Bucket Start | start | date | Y | — | until PUBLISH | ≥PUBLISH | Plan | < bucket_end | — | prod_plan_bucket.bucket_start | req(bucketStart)/resp | Y |
| FLD-PROD-PLAN-022 | PLAN-003 | Header | bucket_end | Bucket End | end | date | Y | — | until PUBLISH | ≥PUBLISH | Plan | > bucket_start | — | prod_plan_bucket.bucket_end | req(bucketEnd)/resp | Y |
| FLD-PROD-PLAN-023 | PLAN-003 | Line | schedule_item | Scheduled Item | item+qty | array | Y | from demand | until PUBLISH | ≥PUBLISH | Plan | demand-backed | — | prod_plan_bucket_line | req(scheduleItem)/resp | Y |
| FLD-PROD-PLAN-024 | PLAN-003 | Header | generate_mode | Generate Mode | rolling | enum | Y | SCHEDULE | until PUBLISH | ≥PUBLISH | User | SCHEDULE\|SIMULATE | FUT-PROD-003 | prod_plan_bucket.generate_mode | req(generateMode)/resp | Y |

## SCR-PROD-PLAN-004 — Production Budget / Forecast
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-PLAN-030 | PLAN-004 | Header | budget_id | Budget | id | uuid | Y | auto | never | always | auto | unique | — | prod_plan_budget.id | resp(budgetId) | Y |
| FLD-PROD-PLAN-031 | PLAN-004 | Header | budget_year | Year | FY | varchar(9) | Y | current FY | on-create | ≥create | Plan | format FY | — | prod_plan_budget.fy | req(budgetYear)/resp | Y |
| FLD-PROD-PLAN-032 | PLAN-004 | Line | bucket_split | Bucket Split | qty per bucket | array | Y | — | until PUBLISH | ≥PUBLISH | Plan | Σ = budget total | BR-PROD-PLAN-005 | prod_plan_budget_line | req(bucketSplit)/resp | Y |
| FLD-PROD-PLAN-033 | PLAN-004 | Header | rev_no | Revision No | rev | int | Y | 1 | system | system | Lifecycle | increments on updation | BR-PROD-PLAN-007 | prod_plan_budget.rev_no | resp(revNo) | Y |
| FLD-PROD-PLAN-034 | PLAN-004 | Header | basis | Basis | forecast/engine flag | enum | Y | MANUAL | on-create | ≥create | Plan | MANUAL\|ENGINE(FUT) | FUT-PROD-003 | prod_plan_budget.basis | req(basis)/resp | Y |

## SCR-PROD-PLAN-005 — PO Day/Week/Month-wise Schedule
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-PLAN-040 | PLAN-005 | Header | view_granularity | Granularity | day/week/month | enum | Y | DAY | always | always | User | DAY\|WEEK\|MONTH | FR-PROD-PLAN-010 | — (view) | req(viewGranularity)/resp | N |
| FLD-PROD-PLAN-041 | PLAN-005 | Line | order_schedule | Order Schedule | po qty by bucket | array | Y | from plan | never | always | derived | plan-backed | BR-PROD-PLAN-010 | prod_plan_order_schedule | resp(orderSchedule) | N |

## SCR-PROD-PLAN-006 — Schedule Updation
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-PLAN-050 | PLAN-006 | Header | change_req | Change Request | CR ref | varchar(60) | Y | — | until PUBLISH | ≥PUBLISH | User | mandatory | BR-PROD-PLAN-011 | prod_plan_rev.change_req | req(changeReq)/resp | Y |
| FLD-PROD-PLAN-051 | PLAN-006 | Header | change_reason | Reason | reason | text | Y | — | until PUBLISH | ≥PUBLISH | User | mandatory | BR-PROD-PLAN-011 | prod_plan_rev.change_reason | req(changeReason)/resp | Y |
| FLD-PROD-PLAN-052 | PLAN-006 | Header | base_rev | Base Revision | from rev | int | Y | current | on-create | ≥create | System | valid base | BR-PROD-PLAN-011 | prod_plan_rev.base_rev | req(baseRev)/resp | Y |

## SCR-PROD-WC-001 — Work Center Daily / Period Plan
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-WC-001 | WC-001 | Header | work_center_id | Work Center | WC | fk(wc) | Y | — | until PUBLISH | ≥PUBLISH | Master | active | — | prod_plan_wc.wc_id | req(workCenterId)/resp | Y |
| FLD-PROD-WC-002 | WC-001 | Header | from_date | From | period start | date | Y | — | until PUBLISH | ≥PUBLISH | Plan | ≤ to_date | — | prod_plan_wc.from_date | req(fromDate)/resp | Y |
| FLD-PROD-WC-003 | WC-001 | Header | to_date | To | period end | date | Y | — | until PUBLISH | ≥PUBLISH | Plan | ≥ from_date | — | prod_plan_wc.to_date | req(toDate)/resp | Y |
| FLD-PROD-WC-004 | WC-001 | Line | load | Load | planned qty/hrs | array | Y | — | until PUBLISH | ≥PUBLISH | Plan | within capacity | BR-PROD-CAP-001 | prod_plan_wc_load | req(load)/resp | Y |

## SCR-PROD-WC-002 — Work Center Re-Allocation
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-WC-010 | WC-002 | Header | from_wc | From Work Center | source | fk(wc) | Y | — | on-create | ≥create | Master | active | BR-PROD-WC-001 | prod_plan_wc_realloc.from_wc | req(fromWc)/resp | Y |
| FLD-PROD-WC-011 | WC-002 | Header | to_wc | To Work Center | target | fk(wc) | Y | — | on-create | ≥create | Master | active; ≠ from_wc | BR-PROD-WC-001 | prod_plan_wc_realloc.to_wc | req(toWc)/resp | Y |
| FLD-PROD-WC-012 | WC-002 | Header | reason | Reason | rc | text | Y | — | until SUBMIT | ≥SUBMIT | User | mandatory | BR-PROD-WC-001 | prod_plan_wc_realloc.reason | req(reason)/resp | Y |
| FLD-PROD-WC-013 | WC-002 | Header | authorized_by | Authorized By | approver | fk(user) | Y | — | review | after | System | authorized role | BR-PROD-WC-001 | prod_plan_wc_realloc.authorized_by | resp(authorizedBy) | Y |

## SCR-PROD-CAP-001 — Capacity Assessment
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-CAP-001 | CAP-001 | Header | scope | Scope | machine/wc | fk(machine/wc) | Y | filter | never | always | derived | filter | — | cap_view | resp(scope) | N |
| FLD-PROD-CAP-002 | CAP-001 | Header | period | Period | date range | date | Y | period | never | always | derived | filter | — | cap_view | resp(period) | N |
| FLD-PROD-CAP-003 | CAP-001 | Line | load_hrs | Load Hrs | planned | numeric | Y | — | never | always | calc | from plans | BR-PROD-CAP-001 | cap_view | resp(loadHrs) | Y |
| FLD-PROD-CAP-004 | CAP-001 | Line | available_hrs | Available Hrs | capacity | numeric | Y | — | never | always | calc | shift−maint | BR-PROD-CAP-001 | cap_view | resp(availableHrs) | Y |
| FLD-PROD-CAP-005 | CAP-001 | Line | utilization | Utilization % | derived | numeric | Y | — | never | always | calc | load/avail | BR-PROD-CAP-001 | cap_view | resp(utilization) | Y |

---

# GROUP J — EXCEPTION AND DEVIATION SCREENS

## SCR-PROD-DEV-001 — Production Plan Deviation
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-DEV-001 | DEV-001 | Header | dev_no | Deviation No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_deviation.dev_no | req(devNo)/resp | Y |
| FLD-PROD-DEV-002 | DEV-001 | Header | order_id | Order | order | fk(order) | Y | — | on-create | ≥create | Order | valid order | — | prod_deviation.order_id | req(orderId)/resp | Y |
| FLD-PROD-DEV-003 | DEV-001 | Line | reason | Reason | deviation reason | fk(reason) | Y | — | until SUBMIT | ≥SUBMIT | Catalogue | mandatory | — | prod_deviation_line.reason | req(reason)/resp | Y |
| FLD-PROD-DEV-004 | DEV-001 | Line | responsible_area | Responsible Area | area | enum | Y | — | until SUBMIT | ≥SUBMIT | User | MATERIAL\|MACHINE\|LABOUR\|PLANNING\|QUALITY\|OTHER | — | prod_deviation_line.responsible_area | req(responsibleArea)/resp | Y |
| FLD-PROD-DEV-005 | DEV-001 | Line | action | Required Action | action | text | N | — | until SUBMIT | ≥SUBMIT | User | optional | — | prod_deviation_line.action | req(action)/resp | Y |
| FLD-PROD-DEV-006 | DEV-001 | Header | deviation_qty | Deviation Qty | derived | numeric | Y | — | never | always | calc | plan−actual | BR-PROD-PEND-001 | prod_deviation.deviation_qty | resp(deviationQty) | Y |

## SCR-PROD-DLVY-001 — Delay to Customer Delivery
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-DLVY-001 | DLVY-001 | Header | delay_no | Delay No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_delay_customer.delay_no | req(delayNo)/resp | Y |
| FLD-PROD-DLVY-002 | DLVY-001 | Header | order_id | Order | order | fk(order) | Y | — | on-create | ≥create | Order | valid | — | prod_delay_customer.order_id | req(orderId)/resp | Y |
| FLD-PROD-DLVY-003 | DLVY-001 | Header | delay_reason | Delay Reason | reason | fk(reason) | Y | — | until SUBMIT | ≥SUBMIT | Catalogue | mandatory | — | prod_delay_customer.reason | req(delayReason)/resp | Y |
| FLD-PROD-DLVY-004 | DLVY-001 | Header | attributed_period | Attributed Period | days | int | Y | — | until SUBMIT | ≥SUBMIT | User | ≥0 | — | prod_delay_customer.attributed_days | req(attributedPeriod)/resp | Y |

## SCR-PROD-NCONF-001 — Production Non-Conformity
| Field ID | Screen | Section | Name | Label | Desc | Type | Mand | Default | Editable | Locked | Source | Validation | BR | DB Tbl/Col | API | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLD-PROD-NCONF-001 | NCONF-001 | Header | nconf_no | Non-Conformity No | auto | varchar(30) | Y | preview | never | always | Num | unique | BR-NUM-001 | prod_nconf.nconf_no | req(nconfNo)/resp | Y |
| FLD-PROD-NCONF-002 | NCONF-001 | Header | op_event_id | Operation Event | source op | fk(op_event) | Y | — | on-create | ≥create | Session | valid op | — | prod_nconf.op_event_id | req(opEventId)/resp | Y |
| FLD-PROD-NCONF-003 | NCONF-001 | Header | ncr_ref | NCR Reference | created/linked | varchar(60) | Cond | — | on-create | after | Quality | required to link/raise NCR | FR-PROD-EXCP-003 | prod_nconf.ncr_ref | req(ncrRef)/resp | Y |
| FLD-PROD-NCONF-004 | NCONF-001 | Header | description | Description | nc detail | text | Y | — | until SUBMIT | ≥SUBMIT | User | mandatory | — | prod_nconf.description | req(description)/resp | Y |
| FLD-PROD-NCONF-005 | NCONF-001 | Header | status | Status | doc status | enum | Y | OPEN | system | system | Lifecycle | OPEN\|NCR_LINKED\|CLOSED | BR-WF-001 | prod_nconf.status | resp(status) | Y |

---

# CROSS-FIELD AND CROSS-SCREEN VALIDATIONS

### XF-001 Quantity reconciliation (BR-PROD-ENTRY-001)
For a machining/single-output operation: `ProcessedQty = AcceptedQty + RejectedQty + ReworkQty +
ScrapQty`. Additionally `InputQty ≥ ProcessedQty`; carry-forward WIP = `InputQty − ProcessedQty`
(remains at operation). Enforced at submit on ENTRY-001.

### XF-002 Multi-output reconciliation (BR-PROD-ENTRY-003)
`InputQty ≥ PRIMARY_output + CO_output + BY_output + ScrapQty` (per routing tolerance). At least
one PRIMARY output required. Enforced on ENTRY-003.

### XF-003 Conversion reconciliation (BR-PROD-CONV-001)
`InputQty = OutputQty + LossQty + ScrapQty` (within tolerance). CONV-001.

### XF-004 Disassembly reconciliation (BR-PROD-DISASM-001)
`ParentQty ≥ Σ Components + Σ ByProducts + LossQty` (within tolerance). DISASM-001.

### XF-005 Rework cap (BR-PROD-REWORK-001)
`ReworkQty ≤ AuthorizedQty` and `ReworkQty ≤ RejectedQty(reworkable)`; `ScrapSplit+HoldSplit ≤
ReworkQty`. Entry/Rework/Rejection jointly validate.

### XF-006 Reference validations
- Operation must belong to the approved route of the job (FLD-PROD-ENTRY-012 | BR-PROD-010).
- Machine/operator eligibility (FLD-PROD-ENTRY-013/014 | BR-PROD-020).
- Material item must be in the approved BOM for consumed item (FLD-PROD-MATL-002).
- All fk references validated for existence + active status + plant scope.

### XF-007 Duplicate prevention
- Document number uniqueness enforced server-side (BR-NUM-001). Re-submit of same logical entry
  blocked by idempotency key (API DOC 13) — a client-generated request key prevents duplicate
  production-entry submission.

### XF-008 Permission validation
- Screen/action RBAC per DOC 08 roles; every API enforces the action's role at service layer.

### XF-009 Status-based edit restrictions
- Editable-until/`Locked-when` in every field table map to workflow status (DOC 11 Lifecycle).
  After SUBMIT, target-quantity/timing fields lock; non-mutating fields (status, derived) are
  system-owned.

### XF-010 Approval restrictions
- APPROVE action requires plant head/planner role and REF already-complete state; REJECT returns
  to DRAFT (re-editable). Additional-material, rework, scrap-beyond-tolerance, gross deviation,
  and WC re-allocation each gate on their documented approval role.

### XF-011 Cancellation restrictions
- CANCELLED permitted only from DRAFT/SUBMITTED/PENDING_APPROVAL (never after APPROVED with
  postings) unless a full reversal is also performed. Reason mandatory.

### XF-012 Reversal restrictions
- REVERSAL permitted from APPROVED/PARTIALLY_COMPLETED/COMPLETED only; requires reason + ordered
  reversal of all dependent inventory transactions (BR-WF-001); blocked if downstream
  disposition/costing was capitalized (scrap write-off, FG sold).

### XF-013 Permission & field reference completeness
- Every FLD-PROD-* above has an owning screen, a DB mapping (DOC 12), an API mapping (DOC 13),
  a BR (DOC 10) or explicit "—", and an audit requirement. Any field marked future must state
  "FUTURE" (none in DOC 09).

### XF-014 Planning-layer validations
- Plan records validate demand-backing, capacity within limit (BR-PROD-CAP-001), bucket
  integrity, revision attribution (BR-PROD-PLAN-011). Forecast/budget engine paths flagged
  FUTURE (FUT-PROD-003).

---

# FIELD REFERENCE INTEGRITY

This document defines **every referenced FLD-PROD-\*** for all in-scope screens. The set of
screens covered equals the DOC 08 screen baseline (groups A–J). No in-scope screen remains at
bullet-description level; all carry a full field table here. Field IDs used in DOC 08
(FLD-PROD-ORDER-\*, FLD-PROD-JOBCARD-\*, FLD-PROD-ENTRY-\*, FLD-PROD-MATL-\*) are retained and
expanded (no renumbering). New field IDs introduced (e.g., FLD-PROD-REJ-\*, FLD-PROD-SCRAP-\*,
FLD-PROD-CONV-\*, FLD-PROD-DISASM-\*, FLD-PROD-IDLE-\*, FLD-PROD-STOP-\*, FLD-PROD-PLAN-\*,
FLD-PROD-WC-\*, FLD-PROD-CAP-\*, FLD-PROD-DEV-\*, FLD-PROD-DLVY-\*, FLD-PROD-NCONF-\*,
FLD-PROD-LOG-\*, FLD-PROD-OUT-\*, FLD-PROD-WIP-\*, FLD-PROD-PEND-\*, FLD-PROD-CONSUMABLE-\*,
FLD-PROD-ORDER-\* extensions, FLD-PROD-REWORK-\*) are stable and split-ready.

Cross-check to DOCUMENTS 01–08: source classifications preserved (no CR/REF/ZYGER/PROPOSED/
FUTURE re-tagging); requirement IDs, screen IDs, and BR/FR/NUM IDs remain backward-traceable.

**END OF DOCUMENT 09**