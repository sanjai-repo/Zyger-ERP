# ZYGER ERP — INVENTORY MODULE
# DOCUMENT 02 — COMPLETE INVENTORY MODULE FRS (FUNCTIONAL REQUIREMENTS SPECIFICATION + WORKFLOWS)

| | |
|---|---|
| Project | Zyger ERP |
| Module | Inventory |
| Document | DOCUMENT 02 — Complete Inventory Module Functional Requirements Specification |
| Status | FRS — module-level |
| Version | 1.0 |

**How to read this document.** Module-level FRS for Inventory. Defines functional requirements
(FR-INV-*), business rules (BR-INV-*), workflows (WF-INV-*), numbering (NUM-INV-*), the stock
engine contract, and integration contracts. All identifiers/statuses match the implemented
system.

---

## TABLE OF CONTENTS

01. Module Overview and Architecture
02. Stock Engine (Stock Balance + Ledger)
03. Document Lifecycle and Stock Posting Model
04. Inward (PO / LO / JO / General)
05. Store Receipt — GRN
06. Stock Issue Family
07. Delivery Challan Family
08. Supplier Invoice (Purchase / Subcontract)
09. Return Management Family
10. Allotment (Stock Allotment / Release)
11. Adjustment (Stock Amendment / Physical Stock Amendment)
12. Inventory Reports (Dashboard / Log / Current Stock)
13. Numbering (NUM-INV)
14. Workflows (WF-INV)
15. Business Rules (BR-INV)
16. Roles and Permissions
17. Audit and Traceability
18. Database Impact Summary
19. API Impact Summary
20. Open Gaps and Known Limitations

---

## 01. MODULE OVERVIEW AND ARCHITECTURE

### 01.1 Founding principle
Every inventory transaction is a numbered **document** (header + lines) with Effect
(`IN` / `OUT` / `ADJUST` / `NONE`) and a Transaction Type (`txType`). The document engine
(`DocumentFacade`) applies the effect atomically against the **Stock Engine**, writing an
append-only `stock_ledger` entry and updating the `stock_balance` snapshot in the same
transaction.

### 01.2 Document families
- **Inbound:** PO Inward, LO Inward, JO Inward, General Inward, GRN.
- **Issue (OUT):** Stock Issue Request (NONE), RM Issue, General Issue, JO DC Issue, Issue
  Internal/External, Issue Against Receipt.
- **Dispatch (OUT):** Sales DC, JO DC, General DC, Return DC, Transfer DC.
- **Invoices (NONE):** Purchase Invoice, Subcontract Invoice.
- **Returns (IN):** Inward Return, DC Return, Invoice Return, Internal Return, Received
  Against Issue, Receipt Return.
- **Reservation:** Stock Allotment (NONE), Stock Release (OUT).
- **Adjustment (ADJUST):** Stock Amendment, Physical Stock Amendment.
- **Reports:** Inventory Dashboard, Inventory Log, Current Stock.

### 01.3 Generic document lifecycle
```
DRAFT → SUBMITTED → APPROVED → POSTED → CLOSED
        REJECTED
     → CANCELLED (from DRAFT/SUBMITTED/APPROVED)
REJECTED → DRAFT (reopen)
```
Actions: `submit`, `approve`, `reject`, `reopen`, `cancel`, `post`, `close`.

---

## 02. STOCK ENGINE (BR-INV-ENGINE)

### 02.1 `stock_balance` (current snapshot)
| Column | Notes |
|---|---|
| `item_code`, `location`, `batch_no`, `heat_no`, `stock_status` | UNIQUE key |
| `qty` | numeric(18,4) |

`Available stock = on_hand − reserved − qc_hold`.

Stock statuses: `FREE`, `QC_HOLD`, `BLOCKED`, `REJECTED`, `QUARANTINE`, `SCRAP`.

### 02.2 `stock_ledger` (append-only transaction log)
`item_code`, `location`, `batch_no`, `heat_no`, `stock_status`, `tx_date`, `doc_no`,
`doc_type`, `tx_type`, `in_qty`, `out_qty`, `created_at`, `created_by`.

### 02.3 Stock service operations
| Method | Effect |
|---|---|
| `recordStockIn` | Add to balance, log `in_qty` |
| `recordStockOut` | Reduce balance, log `out_qty` |
| `recordStockAdjustment` | Adjust by delta, log adjustment |
| `onHand` | Current on-hand qty |

**Posting rules:** OUT requires sufficient available stock (unless `allowNegative`);
document `post` executes the ledger write. Doc numbers are resolved via `DocNumberService`
(`{PREFIX}-{YEAR}-{SEQ}`); `issue-internal-external` uses `INT`/`EXT` based on `issueType`.

---

## 03. INWARD (PO / LO / JO / GENERAL)

**Screen:** `inward-entry` (dynamic form by sub-type).

| Sub-type | Doc key | Prefix | Effect | Tx Type | Qty field | API |
|---|---|---|---|---|---|---|
| PO Inward | `po-inward` | POI | IN | PO_INWARD | receivedQty | `/inventory/documents/po-inward` |
| LO Inward | `lo-inward` | LOI | IN | LO_INWARD | receivedQty | `/inventory/documents/lo-inward` |
| JO Inward | `jo-inward` | JOI | IN | JO_INWARD | producedQty | `/inventory/documents/jo-inward` |
| General Inward | `general-inward` | GI | IN | GENERAL_INWARD | receivedQty | `/inventory/documents/general-inward` |

### 03.1 Header fields
`date`, `docNo` (auto), `status`, `supplier` (PO/LO), `purchaseOrderNo` (PO),
`labourOrderNo` (LO), `jobOrderNo` (JO), `supplierInvoiceNo`, `dcNumber`,
`supplierChallanNo`, `vehicleNo`, `receivedBy`, `qcRequired` (`Yes`/`No`),
`reasonCode` (General), `remarks`, `sourceLocation`/`storeLocation`.

### 03.2 Line fields (BaseLine)
`lineNo`, `itemCode`, `qty` (→ receivedQty/producedQty), `batchNo`, `heatNo`, `lotNo`,
`serialNo`, `expiryDate`, `location`, `warehouse`, `remarks`.

### 03.3 Business rules
- BR-INV-IN-1: General Inward requires `reasonCode` (Opening Stock, Free Sample, Customer
  Return, Second Quality, Warranty Return, Other).
- BR-INV-IN-2: Items with `requiresBatch` need `batchNo`; `requiresHeat` needs `heatNo`.
- BR-INV-IN-3: `qcRequired=Yes` auto-creates a `QualityInspection`: PO→IQC, LO→LO, JO→FAI,
  General→LINE.
- BR-INV-IN-4: Backdated entry (> 2 h) rejected unless authorized (`BACKDATED_ENTRY`).
- BR-INV-IN-5: Only DRAFT/REJECTED editable/deletable.
- BR-INV-IN-6: All lines require positive quantity.

### 03.4 Workflow (WF-INV-IN)
```
DRAFT ──approve (auto post)──► POSTED ──► stock IN (+ auto IQC if qcRequired=Yes)
```

---

## 04. STORE RECEIPT — GRN

**Screen:** `grn`. **Doc key:** `grn`. **Prefix:** `GRN`. **Effect:** IN. **Tx:** `GRN`.
**Qty field:** `acceptedQty`.

### 04.1 Header fields
`date`, `docNo`, `status`, `sourceType` (`PO_INWARD`/`LO_INWARD`/`JO_INWARD`/
`GENERAL_INWARD`/`RETURN_INWARD`), `sourceDocumentNo` (required), `party`, `inspectionRef`,
`remarks`.

### 04.2 Line fields
`itemCode`, `itemDesc` (auto), `uom`, `inspectedQty`, `acceptedQty`, `rejectedQty`, `rate`,
`amount = acceptedQty × rate`, `batchNo`, `heatNo`, `location`.

### 04.3 Business rules
- BR-INV-GRN-1: `acceptedQty + rejectedQty ≤ inspectedQty`.
- BR-INV-GRN-2: Line items with `inspectionRequired=true` post stock as `QC_HOLD`;
  otherwise `FREE`.

### 04.4 Workflow (WF-INV-GRN)
```
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED ──post──► POSTED (stock IN at acceptedQty)
```

---

## 05. STOCK ISSUE FAMILY

All issue docs have Effect **OUT** (except SIR = NONE) and post stock OUT on `post`.

| Doc | Prefix | Tx type | Qty field | Purpose / linkage |
|---|---|---|---|---|
| Stock Issue Request | SIR | STOCK_ISSUE_REQUEST | requestedQty | Request/approval only; EFFECT NONE |
| RM Issue | RMI | RM_ISSUE | issueQty | Raw-material issue against approved SIR |
| General Issue | GEI | GENERAL_ISSUE | issueQty | General-purpose issue |
| JO DC Issue | JDI | JO_DC_ISSUE | issueQty | Issue to subcontractor under a JO DC |
| Issue Internal/External | INT/EXT | ISSUE_INTERNAL_EXTERNAL | issueQty | `issueType` INTERNAL/EXTERNAL selects prefix |
| Issue Against Receipt | IAR | ISSUE_AGAINST_RECEIPT | issueQty | Issue against a prior receipt |

### 05.1 Stock Issue Request (SIR)
Header: `date`, `department`, `requestedBy`, `requiredDate`, `jobOrderNo`, `purpose`.
Lines: `itemCode`, `requestedQty`, `approvedQty` (set during approval), `returnable`.
- BR-INV-SIR-1: No stock effect; acts as approval workflow.
- BR-INV-SIR-2: `approveWithLines()` records per-line `approvedQty`.
- BR-INV-SIR-3: RM Issue validates against `approvedQty − already issued`.

### 05.2 RM Issue
- BR-INV-RM-1: If `issueRequestNo` set, referenced SIR must be APPROVED or POSTED; issue qty
  per item ≤ `SIR line qty − issued qty`.
- Posting stock status `FREE`.

### 05.3 General Issue
Header: `date`, `transactionType` (GENERAL_ISSUE default), `destinationLocation`,
`issuedTo`, `department`, `purpose`, `remarks`. Returned by `internal-return`.

### 05.4 JO DC Issue
Header: `date`, `transactionType` (JO_ISSUE), `jobOrderNo`, `supplier`, `destinationLocation`,
`remarks`. Links to `job_order`.

### 05.5 Issue Internal / External
- BR-INV-IIE-1: `issueType` field determines document prefix: `INTERNAL` → `INT`,
  `EXTERNAL` → `EXT`.

### 05.6 Issue Against Receipt
- Returned by `received-against-issue`.

### 05.7 Workflow (WF-INV-ISSUE)
```
Stock Issue Request:   DRAFT ──submit──► SUBMITTED ──approve (with lines)──► APPROVED/ POSTED
RM Issue / General Issue / JO DC Issue / IIE / IAR:
   DRAFT ──submit──► SUBMITTED ──approve──► APPROVED ──post──► POSTED (stock OUT)
```

---

## 06. DELIVERY CHALLAN FAMILY

| Doc | Prefix | Effect | Tx type | Purpose |
|---|---|---|---|---|
| Sales DC | SDC | OUT | SALES_DC | Customer dispatch w/ SO + logistics + final-inspection gate |
| JO DC | JOD | OUT | JO_DC | Material to subcontractor |
| General DC | GDC | OUT | GENERAL_DC | Generic dispatch |
| Return DC | RDC | OUT | RETURN_DC | Return goods to supplier |
| Transfer DC | TDC | OUT(+IN) | TRANSFER_DC | Inter-location transfer |

### 06.1 Sales DC (richest)
Header: `date`, `customer`, `customerCode`, `salesOrderNo`, `customerPoNumber`, `piReference`,
`transporter`, `vehicleNo`, `lrNumber`, `lrNo`, `lrDate`, `dispatchDate`, `ewayBillReference`,
`contactPerson`, `driverDetails`, `deliveryAddress`, `sourceLocation`,
`linkedDocumentNo`, `party`, `attachmentFileName`.

Line fields: `itemCode`, `itemName`, `uom`, `soQty`, `previouslyDispatchedQty`,
`currentDispatchQty` (→ `qty` for posting), `pendingQty`, `qty`, `batchNo`/`batchNumber`,
`heatNo`/`heatNumber`, `lotNo`, `serialNo`, `customerPartNumber`, `drawingNumber`,
`drawingRevision`, `packingReference`, `qualityInspectionReference`.

Business rules:
- BR-INV-SDC-1: **Final Inspection Gate** — on `post`, if item has `inspectionRequired=true`,
  a passing `FINAL` inspection must exist; blocked otherwise. Override `forceDispatch=true`
  requires ADMIN/MANAGEMENT/SALES_MANAGER role.
- BR-INV-SDC-2: Field renames applied: `dispatchQty`→`currentDispatchQty`,
  `heatNumber`→`heatNo`, `lineRemark`→`remarks`.
- Posting qty = `currentDispatchQty`/`qty`.

### 06.2 JO DC / General DC / Return DC / Transfer DC
Headers: JO DC (`transactionType` JO_ISSUE, `supplier`, `jobOrderNo`, `destinationLocation`),
General DC (`party`), Return DC (`party`), Transfer DC (`destinationLocation`).

- BR-INV-TDC-1: Transfer DC posts **stock OUT at source** and **stock IN at destination**
  (`destinationLocation`) in one transaction.

### 06.3 Workflow (WF-INV-DC)
```
Sales DC:   DRAFT ──► SUBMITTED ──► APPROVED ──post (Final Inspection Gate)──► POSTED (stock OUT)
Transfer DC: DRAFT ──► ... ──► POSTED   (OUT at source + IN at destination)
Return DC:   DRAFT ──► ... ──► POSTED   (stock OUT — return to supplier)
```

---

## 07. SUPPLIER INVOICE

### 07.1 Purchase Invoice
**Screen:** `purchase-invoice`. **Doc key:** `purchase-invoice`. **Prefix:** `PI`.
**Effect:** NONE. Header-only doc. Links: `purchaseOrderNo`.

Fields: `date`, `supplier`, `purchaseOrderNo`, `supplierInvoiceNo`, `taxAmount`, `totalAmount`,
`dueDate`. Attachments: up to 3 files (`supplier_invoice_attachment`).

- BR-INV-PI-1: `MAX_ATTACHMENTS = 3`; attachments via `POST /{type}/{id}/attachments`,
  `DELETE /{type}/{id}/attachments/{id}`.
- BR-INV-PI-2: APPROVED/POSTED invoices feed finance `invoicedSpend` in Purchase Dashboard.

### 07.2 Subcontract Invoice
**Screen:** `subcontract-invoice`. **Doc key:** `subcontract-invoice`. **Prefix:** `SI`.
Line field: `processedQty`.

---

## 08. RETURN MANAGEMENT FAMILY

All returns have Effect **IN** and post stock IN. Eligibility: original doc must exist and be
`POSTED`; return qty cannot exceed original minus previously returned.

| Doc | Prefix | Returns against | Disposition |
|---|---|---|---|
| Inward Return | IRT | PO Inward (`originalDocumentNo`) | reason select |
| DC Return | DRT | Sales DC (`originalDcNumber`) | PENDING_INSPECTION / REWORK / SCRAP / REUSE / REPACK |
| Invoice Return | IVT | Sales Invoice (`originalInvoiceNumber`) | same |
| Internal Return | INT | General Issue (`originalDocumentNo`) | — |
| Received Against Issue | RAI | any issue doc | — |
| Receipt Return | RCT | RM Issue (`originalDocumentNo`) | — |

### 08.1 DC Return detail
Header: `originalDcNumber`, `originalDcDate`, `customer`, `customerCode`, `customerPoNumber`,
`salesOrderNumber`, `disposition`, `returnDate`, `returnReason`, `qualityInspectionReference`,
`transportDetails`, `customerRemarks`.

Lines: `itemCode`, `currentReturnQty`, `originalDcQty`, `materialCondition` (maps from
`disposition`), `customerPartNumber`, `drawingNumber`, `drawingRevision`.

- BR-INV-DCR-1: Stock status on posting by disposition:
  `PENDING_INSPECTION`/`REWORK` → `QC_HOLD`; `SCRAP` → `SCRAP`; else → `FREE`.
- BR-INV-FRR-1: `received-against-issue` searches all issue types (general-issue, rm-issue,
  jo-dc-issue, issue-internal-external, issue-against-receipt); qty ≤ original issue −
  previously returned.

### 08.2 Workflow (WF-INV-RET)
```
DRAFT ──► SUBMITTED ──► APPROVED ──post──► POSTED (stock IN; status by disposition)
```

---

## 09. ALLOTMENT

### 09.1 Stock Allotment
**Doc key:** `stock-allotment`. **Prefix:** `SA`. **Effect:** NONE. **Tx:** STOCK_ALLOTMENT.
Reserve/allocate stock for an order. Does NOT post ledger; marks stock reserved.

Header: `date`, `allotmentType` (Job Order / Sales Order / Production Order), `customer`,
`referenceNo`. Lines: `itemCode`, `allottedQty`, `batchNo`, `location`.
Workflow: submit → approve → (POSTED as approved) → cancel/reopen.

### 09.2 Stock Release
**Doc key:** `stock-release`. **Prefix:** `SR`. **Effect:** OUT. Release reserved stock.
Header: `allotmentNo` (required), `reason` (Order Cancelled / Excess Reservation / Change of
Plan / Other). Lines: `itemCode`, `releasedQty`.

- BR-INV-SR-1: `allotmentNo` mandatory; referenced allotment must be POSTED.
- BR-INV-SR-2: `releasedQty` per item ≤ `allottedQty − alreadyReleasedQty`.

### 09.3 Workflow (WF-INV-ALLOT)
```
Stock Allotment (reserve, no ledger) ──► POSTED ──► Stock Release (stock OUT, frees reservation)
```

---

## 10. ADJUSTMENT

### 10.1 Stock Amendment
**Doc key:** `stock-amendment`. **Prefix:** `SAM`. **Effect:** ADJUST. Header-only (single item).
Fields: `date`, `itemCode`, `location`, `batchNo`, `systemQty`, `correctedQty`, `differenceQty`
(auto = corrected − system), `reasonCode` (required: Counting Error / Data Entry Error /
Damaged Stock / Approved Correction).

- BR-INV-ADJ-1: `reasonCode` mandatory for stock adjustments.
- BR-INV-ADJ-2: Posting computes `diff = correctedQty − currentOnHand`; if nonzero →
  `recordStockAdjustment(diff)`.

### 10.2 Physical Stock Amendment
**Doc key:** `physical-stock-amendment`. **Prefix:** `PSA`. **Effect:** ADJUST. Line-level.
Header: `date`, `countType` (Full Count / Cycle Count / Location Count / Batch Count),
`reasonCode`. Lines: `itemCode`, `systemQty`, `physicalQty` (posting qty), `varianceQty`
(auto), `varianceValue`, `reasonCode`, `batchNo`, `location`.

### 10.3 Workflow (WF-INV-ADJ)
```
DRAFT ──► SUBMITTED ──► APPROVED ──post──► POSTED (delta adjusted on stock_balance + ledger)
```

---

## 11. INVENTORY REPORTS

### 11.1 Inventory Dashboard (`reports`)
KPIs: `totalOnHand`, `stockValue` (money), `reserved`, `available`, `lowStockCount`,
`pendingInward`, `pendingApprovals`, `ledgerEntries`. Drilldowns: current-stock,
reservations, low-stock, pending-inward, pending-approvals, inventory-log.

### 11.2 Inventory Log (`inventory-log`)
Columns: `date`, `docNo`, `txType`, `itemCode`, `location`, `batchNo`, `inQty`, `outQty`,
`runningBalance`. Filters: search, dateRange, item, location, txType.
Tx types: RECEIPT, RM_ISSUE, GENERAL_ISSUE, JO_ISSUE, INTERNAL_ISSUE, ISSUE_AGAINST_RECEIPT,
DC_DISPATCH, DC_RETURN, SALES_RETURN, INTERNAL_RETURN, ISSUE_RETURN, RECEIPT_RETURN,
TRANSFER_OUT, STOCK_ADJUSTMENT, PHYSICAL_ADJUSTMENT.

### 11.3 Current Stock (`current-stock`)
Columns: `itemCode`, `itemName`, `category`, `itemType`, `itemGroup`, `location`, `batchNo`,
`heatNo`, `safetyStock`, `onHand`, `reserved`, `qcHold`, `available`, `value`, `status`.
Filters: search, item, location, category, `lowStockOnly`, `includeZero`.
Drilldowns: **Not Available** (items with zero stock), **Low Stock** (`onHand < safetyQty`).

---

## 12. NUMBERING (NUM-INV)

| Doc | Prefix | Doc | Prefix |
|---|---|---|---|
| po-inward | POI | sales-dc | SDC |
| lo-inward | LOI | jo-dc | JOD |
| jo-inward | JOI | general-dc | GDC |
| general-inward | GI | return-dc | RDC |
| return-inward | RI | transfer-dc | TDC |
| grn | GRN | purchase-invoice | PI |
| stock-issue-request | SIR | subcontract-invoice | SI |
| rm-issue | RMI | inward-return | IRT |
| general-issue | GEI | dc-return | DRT |
| jo-dc-issue | JDI | invoice-return | IVT |
| issue-internal-external | INT/EXT | internal-return | INT |
| issue-against-receipt | IAR | received-against-issue | RAI |
| stock-allotment | SA | receipt-return | RCT |
| stock-release | SR | stock-amendment | SAM |
| physical-stock-amendment | PSA | | |

No `numbering_config` seeds exist for inventory doc types; all use `DocTypes` prefix fallback.

---

## 13. WORKFLOWS (WF-INV) — MASTER DIAGRAM

```
                    ┌────────────────────────────────────────────────────────────┐
                    │                    INBOUND (IN)                            │
                    │  PO/LO/JO/General/Return Inward → GRN → POSTED (stock IN)  │
                    │     │ qcRequired=Yes → auto-create QualityInspection       │
                    └────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────────┐
                    │                 AVAILABLE STOCK (FREE / QC_HOLD)           │
                    └────────────────────────────────────────────────────────────┘
                       │                          │                          │
                       ▼                          ▼                          ▼
        ┌───────────────────────┐   ┌───────────────────────┐   ┌──────────────────────┐
        │ RESERVATION           │   │ ISSUE (OUT)           │   │ DISPATCH (OUT)       │
        │ Stock Allotment →     │   │ SIR → RM/General/     │   │ Sales DC (Final Inc. │
        │ Stock Release         │   │ JO-DC/IIE/IAR → POSTED │   │ gate) / JO/General/  │
        └───────────────────────┘   └───────────────────────┘   │ Return/Transfer DC   │
                                                                └──────────────────────┘
                        │                │                              │
                        ▼                ▼                              ▼
        ┌───────────────────────┐   ┌───────────────────────┐   ┌──────────────────────┐
        │ RETURNS (IN)          │   │ ADJUSTMENT (ADJUST)   │   │ REPORTS              │
        │ Inward/DC/Invoice/    │   │ Stock / Physical      │   │ Dashboard / Log /    │
        │ Internal/Received/    │   │ Amendment → POSTED    │   │ Current Stock        │
        │ Receipt Return        │   └───────────────────────┘   └──────────────────────┘
        └───────────────────────┘
```

---

## 14. BUSINESS RULES (BR-INV)

| ID | Rule |
|---|---|
| BR-INV-ENGINE-1 | All DOC IN/OUT/ADJUST write `stock_ledger` + update `stock_balance` in one transaction. |
| BR-INV-ENGINE-2 | Available = on_hand − reserved − qc_hold; OUT requires availability unless allowNegative. |
| BR-INV-ST-1 | Stock status semantics: FREE, QC_HOLD, BLOCKED, REJECTED, QUARANTINE, SCRAP. |
| BR-INV-GRN-1 | accepted + rejected ≤ inspected. |
| BR-INV-GRN-2 | inspectionRequired items → QC_HOLD on GRN receipt. |
| BR-INV-SDC-1 | Final Inspection gate before Sales DC post (forceDispatch override needs senior role). |
| BR-INV-TDC-1 | Transfer DC posts OUT at source + IN at destination. |
| BR-INV-RET-1 | Return eligibility: original POSTED + not exceeding remaining balance. |
| BR-INV-DCR-1 | DC/Invoice return disposition maps stock status (QC_HOLD/SCRAP/FREE). |
| BR-INV-ADJ-1 | Adjustments require reason code. |
| BR-INV-SR-1 | Release requires POSTED allotment; cannot exceed allotted remaining. |
| BR-INV-SIR-1 | SIR is approval-only (no stock effect); RM Issue enforces SIR balance. |
| BR-INV-BACKDATE-1 | Backdated entries (> 2 h) blocked unless authorized. |
| BR-INV-EDIT-1 | Only DRAFT/REJECTED documents editable/deletable. |

---

## 15. ROLES AND PERMISSIONS

| Permission | Capabilities |
|---|---|
| INVENTORY | View, Create, Edit, Delete, Export, Print, Approve |
| Stock Balance | View |
| Stock Issue Request | View, Create, Print |
| Delivery Challan | View, Create, Print |
| Return Management | View, Create |
| Allotment | View |
| Adjustment | View |
| Stores (masters) | View, Create, Edit |

---

## 16. AUDIT AND TRACEABILITY

- Every document carries lifecycle audit columns (submitted/approved/closed/cancelled by+at).
- `stock_ledger` is the immutable audit trail of every quantity change (`doc_no`, `doc_type`,
  `tx_type`, actor, timestamp).
- Inventory Log page exposes the ledger with running balance.

---

## 17. DATABASE IMPACT SUMMARY

Core: `stock_balance`, `stock_ledger`, `doc_sequence`, `numbering_config`.
Document tables: `po_inward(_line)`, `lo_inward(_line)`, `jo_inward(_line)`,
`general_inward(_line)`, `return_inward(_line)`, `grn(_line)`, `stock_issue_request(_line)`,
`rm_issue(_line)`, `general_issue(_line)`, `jo_dc_issue(_line)`,
`issue_internal_external(_line)`, `issue_against_receipt(_line)`, `sales_dc(_line)`,
`jo_dc(_line)`, `general_dc(_line)`, `return_dc(_line)`, `transfer_dc(_line)`,
`purchase_invoice`, `subcontract_invoice`, `supplier_invoice_attachment`, `inward_return(_line)`,
`dc_return(_line)`, `invoice_return(_line)`, `internal_return(_line)`,
`received_against_issue(_line)`, `receipt_return(_line)`, `stock_allotment(_line)`,
`stock_release(_line)`, `stock_amendment`, `physical_stock_amendment(_line)`.

---

## 18. API IMPACT SUMMARY

`/api/inventory/documents/{type}`, `/api/inventory/store-receipt/grn`,
`/api/inventory/stock-issue/*`, `/api/inventory/delivery-challan/*`,
`/api/inventory/supplier-invoice/*`, `/api/inventory/return-management/*`,
`/api/inventory/allotment/*`, `/api/inventory/adjustment/*`, plus generic
`GET/POST/{type}`, `POST /{type}/{id}/actions/{action}`, `GET /{type}/next-number`,
`GET /{type}/export`, attachments endpoints. Reports under Inventory controller/dashboard.

---

## 19. OPEN GAPS AND KNOWN LIMITATIONS

1. **Doc-number string joins** across PO ↔ inward ↔ DC (no hard FKs) allow orphan references.
2. **Reversal is not netted** in reconciliation when source docs are DRAFT/CANCELLED.
3. `issue-internal-external`/`internal-return` share the `INT` prefix; uniqueness assumed per
   sequence key (docType/year), overlapping numbering collides unless separated.
4. RM Issue lacks a dedicated config entry in `stockIssueConfig.ts` (relies on general-issue
   path).
5. Transfer DC posts both legs but there is no separate reversal of the IN leg on cancellation.

---

*End of DOCUMENT 02 — Inventory Module FRS.*