# Planning Module - Functional Requirements Specification (FRS)

**Version:** 3.0  
**Date:** August 26, 2026  
**Module:** Planning (Manufacturing ERP)  
**Status:** Active Development  

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Production Bill of Materials (BOM)](#2-production-bill-of-materials-bom)
3. [Route Sheet](#3-route-sheet)
4. [Work Order](#4-work-order)
5. [Master Data](#5-master-data)
6. [MRP / Material Planning](#6-mrp--material-planning)
7. [Shop Floor Entry](#7-shop-floor-entry)
8. [FG Possible Check](#8-fg-possible-check)
9. [Cost Estimation](#9-cost-estimation)
10. [Machine Load Planning](#10-machine-load-planning)
11. [Dispatch Planning](#11-dispatch-planning)
12. [Engineering Change (ECR/ECO)](#12-engineering-change-ecreco)
13. [Gap Analysis](#13-gap-analysis)
14. [Work Order Reports](#14-work-order-reports)
15. [Print & Export](#15-print--export)
16. [API Reference](#16-api-reference)
17. [Workflow State Machines](#17-workflow-state-machines)
18. [Validation Rules](#18-validation-rules)
19. [Data Model](#19-data-model)

---

## 1. Module Overview

### 1.1 Purpose
The Planning module manages the full manufacturing planning lifecycle from defining what to make (BOM), how to make it (Route Sheet), and executing production (Work Order). It integrates with Inventory, Quality, Purchase, and Sales modules.

### 1.2 Architecture
- **Backend:** Spring Boot 4.1.0, Java 25, PostgreSQL
- **Frontend:** React 19 + Vite 8 + TypeScript
- **Generic Screen:** `PlanningDocScreen` renders BOM, Route Sheet, and Shop Floor Entry via config objects
- **Dedicated Screen:** `WorkOrderScreen` is a custom component with tabbed operations/materials/history

### 1.3 Navigation
- Planning module under Manufacturing menu
- Tabs: Dashboard | Production BOM | Route Sheet | Work Order | Shop Floor | Material Plan | Dispatch | Machine Load | ECR/ECO | Cost Estimation | FG Possible | Gap Analysis | Work Order Reports

---

## 2. Production Bill of Materials (BOM)

### 2.1 Document Number
- **Format:** BOM-{YYYY}-{seq} (e.g., BOM-2026-0001)
- **Auto-generated** on creation

### 2.2 Header Fields

| # | Field | Type | Editable | Mandatory | Default | Description |
|---|-------|------|----------|-----------|---------|-------------|
| 1 | BOM Code | Text | Read-only | Auto | Auto-gen | Unique BOM identifier |
| 2 | Date | Date | Yes | Yes | Today | Document date |
| 3 | Item Code | Text | Yes (Lookup) | Yes | - | FG or Semi-FG item code |
| 4 | Item Type | Select | Yes | Yes | - | FG / SEMI_FG / RAW_MATERIAL |
| 5 | Item Revision | Text | Yes | Yes | - | Item revision level |
| 6 | BOM Version | Text | Yes | No | "1.0" | Version string (e.g., "1.0", "2.0") |
| 7 | BOM Type | Select | Yes | No | Primary | Primary / Alternate |
| 8 | Description | Text | Yes | No | - | Free-text description |
| 9 | Base Quantity | Number | Yes | No | 1 | Basis quantity for BOM |
| 10 | UOM | Text | Yes | No | PCS | Unit of measure |
| 11 | Weight | Number | Read-only | Auto | Calculated | Sum of line total weights |
| 12 | Effective From | Date | Yes | No | Today | BOM validity start |
| 13 | Effective To | Date | Yes | No | - | BOM validity end |
| 14 | Parent BOM | Number | Yes | No | - | FK to parent BOM (multi-level) |
| 15 | Previous Revision | Number | Read-only | Auto | - | FK to previous revision BOM |
| 16 | Sales Order ID | Number | Yes | No | - | FK to Sales Order (SO-specific BOM) |
| 17 | Approved By | Text | Yes | No | - | Approver name |
| 18 | Release Date | Date | Yes | No | - | Date BOM was released |
| 19 | Obsolete Date | Date | Yes | No | - | Date BOM was obsoleted |
| 20 | Total Material Cost | Number | Read-only | Auto | Calculated | Rolled-up cost from components |
| 21 | Specifications | Textarea | Yes | No | - | Free-text specs |
| 22 | Revision No | Number | Read-only | Auto | 0 | Integer revision, auto-increments on Revise |
| 23 | Remarks | Textarea | Yes (audit) | No | - | Editable only in remarks mode |

### 2.3 BOM Component Lines (Detail Grid)

| # | Field | Type | Editable | Mandatory | Description |
|---|-------|------|----------|-----------|-------------|
| 1 | Line No | Number | Yes | No | Sequential line number |
| 2 | Component Item Code | Text | Yes | Yes | Raw material or semi-FG code |
| 3 | Component Revision | Text | Yes | No | Component revision |
| 4 | Description | Text | Read-only | Auto | From Item Master |
| 5 | Quantity Per | Number | Yes | Yes | Qty per parent unit |
| 6 | UOM | Text | Yes | No | Unit of measure |
| 7 | Component Type | Select | Yes | No | RAW_MATERIAL / SEMI_FG / FINISHED_GOOD |
| 8 | BOM Level | Text | Read-only | Auto | Hierarchy level (1, 1.1, 1.1.1) |
| 9 | Weight Per Qty | Number | Read-only | Auto | From Item Master |
| 10 | Total Weight | Number | Read-only | Auto | weightPerQty x quantityPer |
| 11 | Scrap % | Number | Yes | No | Scrap allowance percentage |
| 12 | Yield % | Number | Yes | No | Yield percentage |
| 13 | Operation Sequence Link | Number | Yes | No | Links to route operation |
| 14 | Issue Method | Select | Yes | No | Manual / Backflush / Auto |
| 15 | Supply Type | Select | Yes | No | Make / Buy / Subcontract |
| 16 | Is Phantom | Checkbox | Yes | No | Phantom BOM flag |
| 17 | Child BOM ID | Number | Yes | No | FK to sub-BOM |
| 18 | Warehouse | Text | Yes | No | Default warehouse |
| 19 | Is Active | Checkbox | Yes | Yes | Active flag |
| 20 | Material Grade | Text | Yes | No | CNC grade (SS304, Inconel 718) |
| 21 | Material Form | Select | Yes | No | Round Bar / Plate / Casting / Forging / Sheet / Tube / Extrusion / Other |
| 22 | Diameter | Number | Yes | No | Material diameter |
| 23 | Required Length | Number | Yes | No | Cut length |
| 24 | Required Qty | Number | Yes | No | Computed required qty |
| 25 | Scrap Allowance | Number | Yes | No | Scrap allowance |
| 26 | Heat Lot Number | Text | Yes | No | Heat/lot traceability |
| 27 | Remarks | Text | Yes | No | Line-level remarks |

### 2.4 Auto-Calculations
- **Total Weight (per line):** `weightPerQty x quantityPer`
- **Header Weight:** Sum of all line totalWeights (excluding deleted lines)
- **Total Material Cost:** Sum of `quantityPer x item.defaultRate` for all active lines
- **BOM Level:** Computed from parent-child hierarchy

### 2.5 Workflow

```
DRAFT -> SUBMITTED -> APPROVED -> REJECTED (loops back)
                         |
                    CANCELLED
```

**Actions:**
- **Submit:** DRAFT -> SUBMITTED (requires remarks)
- **Approve:** SUBMITTED -> APPROVED (records approver)
- **Reject:** SUBMITTED -> REJECTED (requires reason)
- **Reopen:** REJECTED -> DRAFT (requires remarks)
- **Cancel:** Any draft/submitted -> CANCELLED
- **Revise:** APPROVED -> new revision (clones header+lines, bumps revision_no)

### 2.6 Special Features
- **Multi-level BOM Tree:** API endpoint returns hierarchical BOM structure
- **Copy BOM:** Duplicate an existing BOM as a new document
- **BOM Where-Used:** Find all WOs and other BOMs referencing this item
- **Version Compare:** Diff current vs previous revision
- **Revision History:** Full audit trail of all revisions
- **Soft Delete:** Lines can be soft-deleted (excluded from calculations)

### 2.7 Validations
- V-01: Item Code is mandatory
- V-02: Item Type is mandatory
- V-03: At least one component line required before Submit
- V-04: No duplicate component item codes in same BOM
- V-05: Circular BOM detection (prevents self-references and cycles)
- V-06: Quantity Per cannot be negative
- V-07: Only DRAFT/REJECTED documents can be deleted

---

## 3. Route Sheet

### 3.1 Document Number
- **Format:** RT-{YYYY}-{seq} (e.g., RT-2026-0059)
- **Auto-generated** on creation

### 3.2 Header Fields

| # | Field | Type | Editable | Mandatory | Default | Description |
|---|-------|------|----------|-----------|---------|-------------|
| 1 | Route Sheet Code | Text | Read-only | Auto | Auto-gen | Unique identifier (docNo) |
| 2 | Date | Date | Yes | Yes | Today | Document date |
| 3 | Item | Select (Dropdown) | Yes | Yes | - | Item code from Item Master |
| 4 | Item Type | Text | Read-only | Auto | From Item | FG / SEMI_FG / RAW_MATERIAL (auto-filled) |
| 5 | Revision | Text | Yes | Yes | "Rev 0" | User-entered revision label; auto-increments on Revise |
| 6 | Status | Select | Yes | No | DRAFT | DRAFT / RELEASED / UNDER_REVISION / OBSOLETE |
| 7 | Remarks | Textarea | Yes (audit) | No | - | Editable only in remarks mode |

### 3.3 Backend Defaults (hidden from form)
- routeVersion: "1.0"
- baseQuantity: 1
- baseUom: "PCS"
- description: ""
- revisionNo: 0 (integer counter)

### 3.4 Operation Lines (Detail Grid)

| # | Field | Type | Editable | Mandatory | Description |
|---|-------|------|----------|-----------|-------------|
| 1 | Sequence No | Number | Yes | Yes | Auto-suggests 10, 20, 30... multiples of 10 |
| 2 | Process | Select (Dropdown) | Yes | Yes | From Process Master (active only); auto-fills processCode, processType |
| 3 | Process Code | Text | Read-only | Auto | Auto-filled from selected Process |
| 4 | Resource | Select (Dropdown) | Yes | No | From Resource Master (active only); auto-fills resourceType; overrides processType |
| 5 | Resource Type | Text | Read-only | Auto | From selected Resource |
| 6 | Process Type | Text | Read-only | Auto | Insource / Outsource (derived from Resource type or Process) |
| 7 | Setup Time (min) | Number | Yes | Yes | Setup duration |
| 8 | Cycle Time (min) | Number | Yes | Yes | Cycle time per unit |
| 9 | QC Required | Select | Yes | Yes | Yes / No |
| 10 | Remarks | Text | Yes | No | Operation-level remarks |

### 3.5 Inspection Parameters (Child Grid)
Accessible by clicking an operation row.

| # | Field | Type | Description |
|---|-------|------|-------------|
| 1 | Parameter Name | Text | Inspection parameter name |
| 2 | Parameter Type | Select | Dimensional / Visual / Functional / Surface Finish / Hardness / Chemical / Other |
| 3 | Nominal Value | Text | Target value |
| 4 | Tolerance Plus | Text | Upper tolerance |
| 5 | Tolerance Minus | Text | Lower tolerance |
| 6 | Method | Text | Inspection method |
| 7 | Tool / Gauge | Text | Tool or gauge used |
| 8 | Frequency | Text | Inspection frequency |
| 9 | Mandatory | Checkbox | Whether mandatory |

**API:** `GET/POST /api/v1/planning/route-operations/{opId}/inspections`

### 3.6 Workflow

```
DRAFT -> RELEASED -> UNDER_REVISION (on Revise)
                         |
DRAFT -> RELEASED -> OBSOLETE
```

**Actions:**
- **Release:** DRAFT -> RELEASED (finalizes route)
- **Revise:** RELEASED -> creates new revision (DRAFT), old becomes UNDER_REVISION
- **Obsolete:** RELEASED/UNDER_REVISION -> OBSOLETE
- **Reopen:** UNDER_REVISION -> DRAFT

### 3.7 Auto-Calculations
- **Revision No:** Integer, auto-increments on Revise action
- **Item Revision:** Set to "Rev {N}" on Revise
- **Process Type:** Recalculated when Resource is overridden (Vendor -> Outsource, else Insource)
- **Total Setup Time:** Sum of all operation setup times
- **Total Cycle Time:** Sum of all operation cycle times

### 3.8 Validations
- V-01: Item Code is mandatory
- V-02: Duplicate Sequence No not allowed
- V-03: At least one operation row required before Release
- V-04: Setup/Cycle time cannot be negative
- V-05: Inactive process selection blocked
- V-06: Release requires DRAFT status
- V-07: Revise requires RELEASED status + remarks

---

## 4. Work Order

### 4.1 Document Number
- **Format:** WO-{YYYY}-{seq} (e.g., WO-2026-0012)
- **Auto-generated** on creation

### 4.2 Header Fields

| # | Field | Type | Editable | Mandatory | Default | Description |
|---|-------|------|----------|-----------|---------|-------------|
| 1 | WO No | Text | Read-only | Auto | Auto-gen | Unique WO identifier |
| 2 | Date | Date | Yes | Yes | Today | Document date |
| 3 | WO Type | Select | Yes | No | Production | Production / Rework / Trial / Sample / Internal / Subcontract |
| 4 | Source Type | Select | Yes | No | Manual | Manual / Sales Order / Forecast |
| 5 | Source Doc No | Text | Yes | No | - | Reference document number |
| 6 | Customer Code | Text | Yes | No | - | Customer code |
| 7 | Customer Order No | Text | Yes | No | - | Customer PO reference |
| 8 | Item Code | Text | Yes | Yes | - | FG item to produce |
| 9 | Item Description | Text | Read-only | Auto | From Item | Description |
| 10 | Item Revision | Text | Yes | No | - | Item revision |
| 11 | Drawing Number | Text | Yes | No | - | Engineering drawing ref |
| 12 | Drawing Rev | Text | Yes | No | - | Drawing revision |
| 13 | Order Quantity | Number | Yes | Yes | - | Total ordered qty |
| 14 | UOM | Text | Yes | No | - | Unit of measure |
| 15 | Priority | Select | Yes | No | MEDIUM | LOW / MEDIUM / HIGH / URGENT |
| 16 | Due Date | Date | Yes | Yes | - | Required by date |
| 17 | Planned Start Date | Date | Yes | No | Today | Planned start |
| 18 | Planned End Date | Date | Yes | No | Today+14 | Planned end |
| 19 | Actual Start Date | Date | Read-only | Auto | - | Set on Start action |
| 20 | Actual End Date | Date | Read-only | Auto | - | Set on Complete action |
| 21 | Promised Delivery Date | Date | Yes | No | - | Customer promise date |
| 22 | Batch/Lot No | Text | Read-only | Auto | Auto-gen on Release | Batch traceability |
| 23 | BOM | Select | Yes | No | - | FK to Production BOM |
| 24 | BOM Revision | Text | Yes | No | - | BOM revision label |
| 25 | Route Sheet | Select | Yes | No | - | FK to Route Sheet |
| 26 | Route Revision | Text | Yes | No | - | Route revision label |
| 27 | Plant | Text | Yes | No | - | Manufacturing plant |
| 28 | Production Line | Text | Yes | No | - | Assembly line |
| 29 | Production Department | Text | Yes | No | - | Department |
| 30 | Sales Order ID | Number | Read-only | Auto | - | FK to Sales Order |
| 31 | Sales Order No | Text | Read-only | Auto | - | SO number |
| 32 | Released Qty | Number | Read-only | Auto | = Order Qty | Released for production |
| 33 | Completed Qty | Number | Read-only | Auto | - | Good qty completed |
| 34 | Rejected Qty | Number | Read-only | Auto | - | Rejected qty |
| 35 | Scrap Qty | Number | Read-only | Auto | - | Scrap qty |
| 36 | Balance Qty | Number | Read-only | Auto | Computed | Released - Completed - Rejected - Scrap |
| 37 | Pending Qty | Number | Read-only | Auto | - | Yet to produce |
| 38 | FG Receipt Qty | Number | Read-only | Auto | - | Received into FG store |
| 39 | Scrap Allowance % | Number | Yes | No | - | Allowance percentage |
| 40 | Approved By | Text | Read-only | Auto | - | Set on Approve |
| 41 | Released By | Text | Read-only | Auto | - | Set on Release |
| 42 | Started By | Text | Read-only | Auto | - | Set on Start |
| 43 | Completed By | Text | Read-only | Auto | - | Set on Complete |
| 44 | Closed By | Text | Read-only | Auto | - | Set on Close |
| 45 | Cancel Reason | Text | Read-only | Auto | - | Set on Cancel |
| 46 | Hold Reason | Text | Read-only | Auto | - | Set on Hold |
| 47 | Short Close Reason | Text | Yes | No | - | Short close explanation |
| 48 | Remarks | Textarea | Yes (audit) | No | - | Editable only in remarks mode |

### 4.3 Operation Lines (Detail Grid)

| # | Field | Type | Editable | Mandatory | Description |
|---|-------|------|----------|-----------|-------------|
| 1 | Operation Sequence | Number | Yes | Yes | Operation order |
| 2 | Operation Code | Text | Yes | No | Operation identifier |
| 3 | Operation Description | Text | Yes | No | Description |
| 4 | Work Center | Select | Yes | No | From Work Center master |
| 5 | Machine | Select | Yes | No | From Machine master |
| 6 | Planned Quantity | Number | Yes | No | Planned output |
| 7 | Completed Quantity | Number | Yes | No | Actual output |
| 8 | Good Quantity | Number | Yes | No | Good units |
| 9 | Scrap Quantity | Number | Yes | No | Scrap units |
| 10 | Rework Quantity | Number | Yes | No | Rework units |
| 11 | Setup Time (Planned) | Number | Yes | No | Planned setup |
| 12 | Setup Time (Actual) | Number | Yes | No | Actual setup |
| 13 | Cycle Time (Planned) | Number | Yes | No | Planned cycle |
| 14 | Cycle Time (Actual) | Number | Yes | No | Actual cycle |
| 15 | Operator | Select | Yes | No | From User master |
| 16 | NC Program Reference | Text | Yes | No | CNC program ref |
| 17 | Status | Select | Yes | No | Pending / In Progress / Completed / On Hold |
| 18 | Remarks | Text | Yes | No | Line remarks |

### 4.4 Material Lines (Materials Tab)

| # | Field | Type | Editable | Description |
|---|-------|------|----------|-------------|
| 1 | Line No | Number | Yes | Sequential |
| 2 | Component Item Code | Text | Yes | Material code |
| 3 | Component Revision | Text | Yes | Material revision |
| 4 | Description | Text | Read-only | From Item Master |
| 5 | UOM | Text | Read-only | Unit of measure |
| 6 | Required Quantity | Number | Yes | Required (auto-recalculated on production qty change) |
| 7 | Issued Quantity | Number | Yes | Already issued |
| 8 | Balance Quantity | Number | Read-only | Required - Issued |
| 9 | Returned Quantity | Number | Yes | Returned to store |
| 10 | Shortage Quantity | Number | Yes | Shortage amount |
| 11 | Required Date | Date | Yes | When needed |
| 12 | Issue Method | Select | Yes | Manual / Backflush / Auto |
| 13 | Batch Number | Text | Yes | Batch/lot |
| 14 | Warehouse | Text | Yes | Issue warehouse |
| 15 | Reservation Status | Select | Read-only | None / Reserved / Partial |
| 16 | Issue Status | Select | Read-only | Pending / Issued / Partial |
| 17 | Remarks | Text | Yes | Line remarks |

### 4.5 Summary Panel (Auto-calculated)
- Total Setup Time (min)
- Cycle Time/Unit (min)
- Total Production Time (min) = Sum(setupTime + cycleTime x productionQty)
- Total Production Time (hrs) = totalProductionTime / 60

**API:** `GET /api/v1/planning/work-order/{id}/summary`

### 4.6 Quantity Tracking Tab
Visual stage progress indicator:
```
Material Availability -> Material Issue -> Op10 -> Op20 -> Op30 -> Op40
-> Final Inspection -> FG Receipt -> WO Close
```
Stages color-coded: completed (green), current (blue), pending (gray)

### 4.7 Workflow

```
DRAFT -> SUBMITTED -> APPROVED -> RELEASED -> IN_PROCESS -> COMPLETED -> CLOSED
                 |         |          |            |
                 v         v          v            v
              REJECTED  CANCELLED  ON_HOLD     ON_HOLD
                                    |            |
                                    +-> IN_PROCESS (Resume)
```

**Actions:**
| Action | From Status | To Status | Requires |
|--------|------------|-----------|----------|
| Submit | DRAFT, REJECTED | SUBMITTED | - |
| Approve | SUBMITTED | APPROVED | Permission |
| Reject | SUBMITTED | REJECTED | Reason |
| Release | APPROVED | RELEASED | - |
| Start | RELEASED, ON_HOLD | IN_PROCESS | - |
| Hold | RELEASED, IN_PROCESS | ON_HOLD | Reason |
| Resume | ON_HOLD | IN_PROCESS | - |
| Complete | IN_PROCESS | COMPLETED | - |
| Close | COMPLETED | CLOSED | - |
| Cancel | DRAFT, SUBMITTED, APPROVED | CANCELLED | Reason |

### 4.8 Special Features
- **Populate from BOM/Route:** Auto-fills operations and materials from linked BOM and Route Sheet
- **Production Qty Cascade:** Changing productionQty proportionally recalculates all material requiredQuantity
- **Create from SO:** API to create WO directly from a Sales Order line
- **Status History:** Full timeline of status transitions with reasons and timestamps
- **Overdue Highlighting:** Red background for WOs past planned end date
- **Priority Highlighting:** Amber for HIGH priority rows
- **BOM/Route Quick Links:** Buttons to open linked BOM/Route in new tabs

### 4.9 Validations
- V-01: Item Code is mandatory
- V-02: Order Quantity > 0
- V-03: Due Date is mandatory
- V-04: At least one operation before Release
- V-05: Release requires APPROVED status
- V-06: Start requires RELEASED status
- V-07: Complete requires IN_PROCESS status
- V-08: Close requires COMPLETED status
- V-09: Batch Lot No auto-generated on Release

---

## 5. Master Data

### 5.1 Process Master
**Endpoint:** `GET/POST /api/master/processes`

| Field | Type | Description |
|-------|------|-------------|
| Code | Text (auto-gen) | Unique process code (PRC-{seq}) |
| Name | Text (mandatory, unique) | Process name |
| Process Type | Select (mandatory) | Insource / Outsource (default: Insource) |
| Required Resource | Select (mandatory) | FK to Resource Master |
| Active | Checkbox | Active flag |
| Remarks | Text | Notes |

**Validations:**
- Name uniqueness enforced (both create and update)
- Outsource + non-Vendor resource shows soft warning toast
- Delete = Inactivate (soft-delete)
- Inactive processes hidden from Route Sheet dropdowns

### 5.2 Resource Master
**Endpoint:** `GET/POST /api/master/resources`

| Field | Type | Description |
|-------|------|-------------|
| Resource Code | Text (auto-gen) | Unique code (RES-{seq}) |
| Resource Name | Text (mandatory, unique) | Resource name |
| Resource Type | Select | Machine / Vendor / Tool / Operator / Work Center |
| Capacity | Number | Available capacity |
| Capacity UOM | Text (mandatory) | Unit for capacity |
| Hourly Rate | Number | Cost per hour |
| Active | Checkbox | Active flag |
| Remarks | Text | Notes |

**Validations:**
- Name uniqueness enforced
- Capacity UOM mandatory
- Inactivating a resource that is referenced shows warning but allows

---

## 6. MRP / Material Planning

### 6.1 Material Plan
**Endpoint:** `/api/v1/planning/material-plans`

| Field | Type | Description |
|-------|------|-------------|
| Plan Number | Text (auto-gen) | MP-{seq} |
| Plan Date | Date | Creation date |
| Status | Text | DRAFT / COMPLETE |
| Description | Text | Plan description |

### 6.2 MRP Run Logic
1. Collect all RELEASED + IN_PROCESS Work Orders
2. Explode BOMs recursively (max depth 5, cycle detection)
3. For each component:
   - Gross Requirement = sum of (WO qty x BOM qty-per x (1 + scrap%))
   - On-Hand Stock = current stock balance
   - On-Order = open PO quantities
   - WIP = work-in-progress
   - Safety Stock = minimum buffer
   - **Net Requirement** = Gross - OnHand - OnOrder - WIP + SafetyStock
   - Order Type = PRODUCTION (if active WO exists for item) else PURCHASE
   - Recommended Order Qty = max(net, 0)

### 6.3 Plan Lines

| Field | Type | Description |
|-------|------|-------------|
| Item Code | Text | Component item |
| Description | Text | Item description |
| Gross Requirement | Number | Total demand |
| On-Hand Stock | Number | Available stock |
| On-Order Qty | Number | Open purchase orders |
| WIP Qty | Number | Work in progress |
| Safety Stock | Number | Minimum buffer |
| Net Requirement | Number | Computed net |
| Order Type | Text | PRODUCTION / PURCHASE |
| Recommended Order Qty | Number | Suggested order |
| Status | Text | PENDING |

---

## 7. Shop Floor Entry

### 7.1 Document Number
- **Format:** SFE-{YYYY}-{seq}

### 7.2 Header Fields

| # | Field | Type | Editable | Description |
|---|-------|------|----------|-------------|
| 1 | Work Order No | Text | Yes | FK to Work Order |
| 2 | Operation Sequence | Number | Yes | Operation number |
| 3 | Operation Code | Text | Yes | Operation identifier |
| 4 | Operator Code | Text | Yes | Operator user code |
| 5 | Machine Code | Text | Yes | Machine used |
| 6 | Start Time | DateTime | Yes | Operation start |
| 7 | End Time | DateTime | Yes | Operation end |
| 8 | Good Quantity | Number | Yes | Good output |
| 9 | Scrap Quantity | Number | Yes | Scrap output |
| 10 | Rework Quantity | Number | Yes | Rework output |
| 11 | Inspection Result | Select | Yes | PASS / FAIL / HOLD / PENDING |
| 12 | Remarks | Textarea | Yes | Notes |

### 7.3 Workflow
```
DRAFT -> SUBMITTED -> APPROVED -> POSTED
```
- **Posted:** Updates Work Order operation completed quantities

---

## 8. FG Possible Check

### 8.1 Purpose
Checks if a finished good can be produced given current material availability.

### 8.2 Endpoint
`POST /api/v1/planning/fg-possible/check`

**Request:**
```json
{
  "itemCode": "FG-001",
  "quantity": 100
}
```

**Response:**
```json
{
  "itemCode": "FG-001",
  "targetQuantity": 100,
  "maxProducibleQty": 85,
  "limitingComponent": "RAW-003",
  "isFeasible": false,
  "components": [
    {
      "itemCode": "RAW-001",
      "required": 200,
      "available": 250,
      "status": "OK"
    },
    {
      "itemCode": "RAW-003",
      "required": 100,
      "available": 85,
      "status": "SHORT"
    }
  ]
}
```

### 8.3 Logic
- Finds first non-REJECTED/OBSOLETE BOM for the item
- For each BOM line: applies scrap%, checks stock vs required
- If no target quantity: calculates maxProducibleQty from most limiting component

---

## 9. Cost Estimation

### 9.1 Document Number
- **Format:** CE-{YYYY}-{seq}

### 9.2 Header Fields

| Field | Type | Description |
|-------|------|-------------|
| Estimation Number | Text (auto-gen) | CE-{seq} |
| Item Code | Text | FG item |
| BOM | Select | Linked BOM |
| Route Sheet | Select | Linked Route |
| Batch Quantity | Number | Production batch size |
| Currency | Text | Default: INR |
| Version | Number | Auto-increments |
| Status | Text | DRAFT / SUBMITTED / APPROVED |

### 9.3 Auto-Calculate from BOM + Route
**Endpoint:** `POST /api/v1/planning/cost-estimations/{id}/calculate`

**Logic:**
1. Clear existing estimation lines
2. **Material Cost:** For each BOM line: `qtyPer x batchQty x item.defaultRate`
3. **Machine Cost:** For each route operation: `(setupHrs + cycleHrs x batchQty) x hourlyRate`
4. **Labour Cost:** From work center rates
5. **Tooling Cost:** From tool requirements
6. **Subcontract Cost:** From subcontract operations
7. **Overhead:** Applied percentage
8. **Scrap Allowance:** Added percentage
9. **Profit Amount:** Computed margin
10. **Estimated Selling Price:** Total cost + profit

### 9.4 Reconcile (Estimate vs Actual)
**Endpoint:** `POST /api/v1/planning/cost-estimations/{id}/reconcile`

- Finds all WOs for the item
- Computes actual machine cost from shop floor entries
- Calculates variance (actual - estimated) and variance %

### 9.5 Workflow
```
DRAFT -> SUBMITTED -> APPROVED
```
- Submit creates approval steps for COST_ACCOUNTANT, PLANT_HEAD
- Approve advances approval step

---

## 10. Machine Load Planning

### 10.1 Document Number
- **Format:** MLP-{YYYY}-{seq}

### 10.2 Generate Machine Load
**Endpoint:** `POST /api/v1/planning/machine-load-plans/{id}/generate`

**Logic:**
1. Collect all RELEASED + IN_PROCESS Work Orders
2. For each WO operation:
   - Total Load = `(setupTime + cycleTime x qty) / 60` hours
   - Aggregate load per machine
3. Look up machine work center for available capacity (default 8 hrs)
4. **FRS 7.2:** If machine status is BREAKDOWN or UNDER_MAINTENANCE, available = 0
5. Calculate utilization % and overload hours

### 10.3 Load Lines

| Field | Type | Description |
|-------|------|-------------|
| Machine | Text | Machine code |
| Work Center | Text | Work center |
| Total Load (hrs) | Number | Computed load |
| Available Capacity (hrs) | Number | Available hours |
| Utilization % | Number | Load / Capacity x 100 |
| Overload Hours | Number | Excess load (if any) |
| Status | Text | NORMAL / OVERLOADED |

---

## 11. Dispatch Planning

### 11.1 Document Number
- **Format:** DP-{YYYY}-{seq}

### 11.2 Dispatch Plan Lines

| Field | Type | Description |
|-------|------|-------------|
| Sales Order No | Text | Source SO |
| Item Code | Text | Item to dispatch |
| Quantity | Number | Dispatch qty |
| Delivery Date | Date | Required delivery |
| Customer | Text | Customer code |
| Status | Text | PENDING / DISPATCHED |

---

## 12. Engineering Change (ECR/ECO)

### 12.1 Document Number
- **Format:** ECR-{YYYY}-{seq}

### 12.2 Header Fields

| Field | Type | Description |
|-------|------|-------------|
| ECR Number | Text (auto-gen) | ECR-{seq} |
| Item Code | Text | Affected item |
| Title | Text | Change title |
| Description | Text | Change description |
| Reason | Text | Justification |
| Status | Text | DRAFT / SUBMITTED / APPROVED / REJECTED / IMPLEMENTED / CLOSED |
| Existing Orders Evaluated | Boolean | Gate flag |

### 12.3 Workflow
```
DRAFT -> SUBMITTED -> APPROVED -> IMPLEMENTED -> CLOSED
                 |
              REJECTED
```

**Actions:**
- **Submit ECR:** Creates approval steps for PLANNING_MANAGER, PLANT_HEAD
- **Approve:** Advances approval step
- **Implement:** Sets effective date (requires APPROVED status)
- **Close:** Final closure

### 12.4 Existing Orders Gate
- Before implementing, check WOs for the affected item
- Return WOs that are NOT CLOSED/CANCELLED
- Mark as evaluated before implementation

---

## 13. Gap Analysis

### 13.1 Document Number
- **Format:** GA-{YYYY}-{seq}

### 13.2 Run Gap Analysis
**Endpoint:** `POST /api/v1/planning/gap-analysis/{id}/run`

**Logic:**
1. Planning horizon = today + 90 days
2. For each RELEASED/IN_PROCESS WO due within horizon:
   - **Material Gap:** Gross requirement from BOM - issued materials
   - **Delivery Gap:** Check if WO is overdue
3. Severity classification:
   - CRITICAL: Gap > 30% of demand
   - HIGH: Gap > 20%
   - MEDIUM: Gap > 10%
   - LOW: Gap <= 10%
4. Send escalation notifications for CRITICAL/HIGH gaps

### 13.3 Results

| Field | Type | Description |
|-------|------|-------------|
| Run Number | Text (auto-gen) | GA-{seq} |
| Analysis Date | Date | Run date |
| Planning Horizon | Date | End date |
| Status | Text | DRAFT / COMPLETE |

| Result Field | Type | Description |
|-------|------|-------------|
| WO Number | Text | Work order |
| Gap Type | Text | MATERIAL / DELIVERY |
| Severity | Text | CRITICAL / HIGH / MEDIUM / LOW |
| Gap Quantity | Number | Shortfall |
| Demand Quantity | Number | Total demand |
| Description | Text | Gap description |

---

## 14. Work Order Reports

### 14.1 Status Summary
`GET /api/v1/planning/work-order/reports/status-summary`
Returns count of WOs by status.

### 14.2 Overdue Work Orders
`GET /api/v1/planning/work-order/reports/overdue`
WOs where plannedEndDate < today and status not in (COMPLETED, CLOSED, CANCELLED).

### 14.3 Material Shortage
`GET /api/v1/planning/work-order/reports/shortage`
WOs with material lines where shortage_quantity > 0.

### 14.4 Completion Report
`GET /api/v1/planning/work-order/reports/completion`
WO completion metrics.

### 14.5 SO Pending Report
`GET /api/v1/planning/work-order/reports/so-pending`
WOs linked to sales orders that are still open.

### 14.6 Open Work Orders
`GET /api/v1/planning/work-order/reports/open`
All WOs in DRAFT through IN_PROCESS status.

---

## 15. Print & Export

### 15.1 PDF Print
| Document | Endpoint | Filename |
|----------|----------|----------|
| Production BOM | `GET /api/v1/planning/production-bom/{id}/print` | BOM-{bomNumber}.pdf |
| Route Sheet | `GET /api/v1/planning/route-sheet/{id}/print` | RS-{routeNumber}.pdf |
| Work Order | `GET /api/v1/planning/work-order/{id}/print` | WO-{woNumber}.pdf |

### 15.2 CSV/Excel Export
`GET /api/v1/planning/{type}/export?format=xlsx|pdf`
- Supports XLSX and PDF export
- Includes all list columns

---

## 16. API Reference

### 16.1 PlanningController (Core CRUD + Actions)
Base Path: `/api/v1/planning`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/{type}` | List documents (paginated, filterable) |
| POST | `/{type}` | Create document |
| GET | `/{type}/{id}` | Get document by ID |
| PUT | `/{type}/{id}` | Update document |
| DELETE | `/{type}/{id}` | Delete document (DRAFT/REJECTED only) |
| GET | `/{type}/next-number` | Get next document number |
| POST | `/{type}/{id}/actions/{action}` | Execute workflow action |
| GET | `/{type}/export` | Export to CSV/PDF |
| GET | `/dashboard` | Planning dashboard data |

**Supported Types:** `production-bom`, `route-sheet`, `work-order`, `shop-floor-entry`

### 16.2 PlanningMasterController (Sub-modules)
Base Path: `/api/v1/planning`

| Module | Endpoints |
|--------|-----------|
| Material Plans | CRUD + lines + MRP run |
| FG Possible | Check + CRUD |
| Dispatch Plans | CRUD + lines |
| Machine Load Plans | CRUD + lines + generate |
| Engineering Changes | CRUD + actions |
| Gap Analysis | CRUD + run |
| Cost Estimations | CRUD + lines + actions + calculate + reconcile |
| Material Reservations | CRUD + release |
| Route Inspections | CRUD per operation |
| BOM Where-Used | GET |
| BOM Version Compare | GET |
| ECO Existing Orders | GET + mark evaluated |
| Cost Component Types | GET |

---

## 17. Workflow State Machines

### 17.1 BOM Status
```
DRAFT -> SUBMITTED -> APPROVED
                 |-> REJECTED -> DRAFT (reopen)
APPROVED -> CANCELLED
```

### 17.2 Route Sheet Status
```
DRAFT -> RELEASED -> UNDER_REVISION
DRAFT -> RELEASED -> OBSOLETE
```

### 17.3 Work Order Status
```
DRAFT -> SUBMITTED -> APPROVED -> RELEASED -> IN_PROCESS -> COMPLETED -> CLOSED
                 |         |          |            |
              REJECTED  CANCELLED  ON_HOLD     ON_HOLD
```

### 17.4 Shop Floor Entry Status
```
DRAFT -> SUBMITTED -> APPROVED -> POSTED
```

### 17.5 Cost Estimation Status
```
DRAFT -> SUBMITTED -> APPROVED
```

### 17.6 ECR/ECO Status
```
DRAFT -> SUBMITTED -> APPROVED -> IMPLEMENTED -> CLOSED
                 |-> REJECTED
```

---

## 18. Validation Rules

### 18.1 Cross-Document Validations
| ID | Rule | Severity |
|----|------|----------|
| X-01 | BOM must be APPROVED before creating WO | Error |
| X-02 | Route Sheet must be RELEASED before creating WO | Error |
| X-03 | WO must be RELEASED before Shop Floor Entry | Error |
| X-04 | Circular BOM detection (max depth 5) | Error |
| X-05 | Cannot delete BOM referenced by active WO | Error |

### 18.2 Business Rules
| ID | Rule | Severity |
|----|------|----------|
| B-01 | Scrap % validated against item master limits | Warning |
| B-02 | Production qty change cascades to material lines | Info |
| B-03 | Overdue WOs highlighted in list view | Visual |
| B-04 | Machine breakdown blocks scheduling | Warning |
| B-05 | Material shortage triggers escalation | Notification |

---

## 19. Data Model

### 19.1 Entity Relationships

```
ProductionBOM (1) ---< (N) ProductionBOMLine
      |
      |--- parentBomId ---> ProductionBOM (self-ref)
      |--- previousRevisionId ---> ProductionBOM (revision chain)
      |--- salesOrderId ---> SalesOrder

RouteSheet (1) ---< (N) RouteOperation
      |
      |--- itemCode ---> ItemMaster
      |--- processId ---> ProcessMaster
      |--- resourceId ---> ResourceMaster
      |
RouteOperation (1) ---< (N) RouteOperationTool
RouteOperation (1) ---< (N) RouteOperationInspection

WorkOrder (1) ---< (N) WorkOrderOperation
WorkOrder (1) ---< (N) WorkOrderMaterial
      |
      |--- bomId ---> ProductionBOM
      |--- routeId ---> RouteSheet
      |--- salesOrderId ---> SalesOrder
```

### 19.2 Database Tables

| Table | Entity | Description |
|-------|--------|-------------|
| `production_bom` | ProductionBOM | BOM header |
| `production_bom_line` | ProductionBOMLine | BOM components |
| `route_sheet` | RouteSheet | Route header |
| `route_operation` | RouteOperation | Route operations |
| `route_operation_tool` | RouteOperationTool | Tool requirements |
| `route_operation_inspection` | RouteOperationInspection | Inspection parameters |
| `work_order` | WorkOrder | WO header |
| `work_order_operation` | WorkOrderOperation | WO operations |
| `work_order_material` | WorkOrderMaterial | WO materials |
| `work_order_status_history` | WorkOrderStatusHistory | Status audit trail |
| `shop_floor_entry` | ShopFloorEntry | Floor entries |
| `material_plan` | MaterialPlan | MRP plans |
| `material_plan_line` | MaterialPlanLine | MRP plan lines |
| `dispatch_plan` | DispatchPlan | Dispatch plans |
| `dispatch_plan_line` | DispatchPlanLine | Dispatch lines |
| `machine_load_plan` | MachineLoadPlan | Machine load |
| `machine_load_line` | MachineLoadLine | Load lines |
| `engineering_change` | EngineeringChange | ECR/ECO |
| `gap_analysis_run` | GapAnalysisRun | Gap runs |
| `gap_analysis_result` | GapAnalysisResult | Gap results |
| `cost_estimation` | CostEstimation | Cost header |
| `cost_estimation_line` | CostEstimationLine | Cost lines |
| `material_reservation` | MaterialReservation | Material reservations |
| `fg_possible` | FgPossible | FG feasibility |

---

**End of Planning Module FRS v3.0**
