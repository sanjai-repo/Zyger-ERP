# ZYGER ERP — INVENTORY MODULE
# DOCUMENT 02 — INVENTORY MODULE FRS (CORRECTED WORKFLOW + STORE STOCK + TRACEABILITY + DC PRINT)

| | |
|---|---|
| Project | Zyger ERP |
| Module | Inventory |
| Document | DOCUMENT 02 — Inventory Module Functional Requirements Specification (Corrected) |
| Status | FRS — module-level, CORRECTED |
| Version | 2.0 (supersedes 1.0) |
| Base document | DOCUMENT 02 v1.0 |

**What changed in v2.0.** This revision keeps every requirement, ID and business rule from
v1.0 and adds/corrects the following, per review comments:

| # | Correction requested | Where it is fixed in this document |
|---|---|---|
| 1 | Workflow was not fully correct end-to-end | Section 04 — Corrected Master Workflow |
| 2 | Need full traceability (item → store → document → document) | Section 03 — Traceability & Document Genealogy |
| 3 | Need to know how many stores exist and stock available in each store | Section 02 — Store & Store-wise Stock Visibility |
| 4 | Stock Issue must reduce stock; Stock Return must increase stock, with proof | Section 03.4 — Worked Example (Opening → Issue → Return → Closing) |
| 5 | Delivery Challan print was not proper | Section 08 — DC Print Template (full layout) |
| 6 | Fields should auto-fill instead of manual typing | Section 12 — Auto-Fill Field Matrix (every screen) |
| 7 | Proper ERP-standard workflow diagram | Section 04.2 — Full Plant-Level Workflow |

Everything else in this document (numbering NUM-INV-*, tables, DB impact, roles) is retained
unchanged from v1.0 unless explicitly marked **[CORRECTED]** or **[NEW]** below.

---

## TABLE OF CONTENTS

01. Module Overview and Architecture
02. Store & Store-wise Stock Visibility **[NEW]**
03. Traceability & Document Genealogy **[NEW / CORRECTED]**
04. Corrected Master Workflow (End-to-End) **[CORRECTED]**
05. Inward (PO / LO / JO / General)
06. Store Receipt — GRN
07. Stock Issue Family **[CORRECTED — explicit stock-reduce logic]**
08. Delivery Challan Family + DC Print Template **[CORRECTED]**
09. Supplier Invoice
10. Return Management Family **[CORRECTED — explicit stock-increase logic]**
11. Allotment (Stock Allotment / Release)
12. Auto-Fill Field Matrix **[NEW]**
13. Adjustment (Stock Amendment / Physical Stock Amendment)
14. Inventory Reports (Dashboard / Log / Current Stock / Store-wise Stock)
15. Numbering (NUM-INV) **[CORRECTED — prefix collision fixed]**
16. Business Rules (BR-INV) **[CORRECTED — new rules added]**
17. Roles and Permissions
18. Audit and Traceability
19. Database Impact Summary **[CORRECTED — new tables/columns]**
20. Resolved Gaps (from v1.0 Open Gaps)

---

## 01. MODULE OVERVIEW AND ARCHITECTURE

### 01.1 Founding principle
Every inventory transaction is a numbered **document** (header + lines) carrying an Effect
(`IN` / `OUT` / `ADJUST` / `NONE`) and a Transaction Type (`txType`). The document engine
(`DocumentFacade`) applies the effect atomically against the **Stock Engine**, writing an
append-only `stock_ledger` entry and updating the `stock_balance` snapshot **in the same
database transaction**, so stock can never be left in an inconsistent state.

**Rule of thumb the whole module is built on:**
- **IN** documents (Inward, GRN, all Returns) → **increase** stock.
- **OUT** documents (Stock Issue, Delivery Challan, Stock Release) → **decrease** stock.
- **ADJUST** documents (Stock/Physical Amendment) → correct stock up or down to match a
  physical count.
- **NONE** documents (SIR, Stock Allotment, Purchase/Subcontract Invoice) never touch
  quantity — they only drive approval or reservation.

### 01.2 Document families
- **Inbound (IN):** PO Inward, LO Inward, JO Inward, General Inward, GRN.
- **Issue (OUT):** Stock Issue Request (NONE), RM Issue, General Issue, JO DC Issue, Issue
  Internal/External, Issue Against Receipt.
- **Dispatch (OUT):** Sales DC, JO DC, General DC, Return DC, Transfer DC.
- **Invoices (NONE):** Purchase Invoice, Subcontract Invoice.
- **Returns (IN):** Inward Return, DC Return, Invoice Return, Internal Return, Received
  Against Issue, Receipt Return.
- **Reservation:** Stock Allotment (NONE), Stock Release (OUT).
- **Adjustment (ADJUST):** Stock Amendment, Physical Stock Amendment.
- **Reports:** Inventory Dashboard, Inventory Log, Current Stock, Store-wise Stock **[NEW]**.

### 01.3 Generic document lifecycle
```
DRAFT → SUBMITTED → APPROVED → POSTED → CLOSED
        REJECTED
     → CANCELLED (from DRAFT/SUBMITTED/APPROVED)
REJECTED → DRAFT (reopen)
```
Actions: `submit`, `approve`, `reject`, `reopen`, `cancel`, `post`, `close`.
Only a document in **POSTED** status is allowed to touch `stock_balance` / `stock_ledger`.
A document can never post twice (idempotency guard on `doc_no` + `post` action).

---

## 02. STORE & STORE-WISE STOCK VISIBILITY [NEW]

This section answers directly: **"how many stores are there, and how much stock is
available in each store."**

### 02.1 Store Master (source of "how many stores")
**Screen:** `store-master`. **Table:** `store_master` (see DOCUMENT 04 — Master Modules FRS).

Every store is one row with `code`, `name`, `storeType` (Raw Material Store, WIP Store,
Finished Goods Store, Tool Store, Consumable Store, Spare Parts Store, Packing Material
Store, Quarantine Store, Rejection Store, Scrap Store, General Store, Customer Material
Store, Subcontractor Material Store, Dispatch Store), `department`, `locationRef`,
`binLocation`, `active`.

- FR-INV-STORE-1: The system must show a **live count of active stores** (`COUNT(*) FROM
  store_master WHERE active = true`) on the Inventory Dashboard as a KPI tile — **"Active
  Stores: N"**.
- FR-INV-STORE-2: Every stock-carrying document line must resolve its `location`/`store`
  field against `store_master.code` — free-text store names are not permitted.

### 02.2 Store-wise Stock Summary (NEW screen — `store-stock-summary`)
One row per store, aggregated from `stock_balance`:

| Column | Source | Notes |
|---|---|---|
| `storeCode`, `storeName`, `storeType` | `store_master` | auto |
| `itemCount` | `COUNT(DISTINCT item_code)` in `stock_balance` for that store | distinct SKUs held |
| `totalOnHand` | `SUM(qty)` where `stock_status` in (FREE, QC_HOLD, BLOCKED, QUARANTINE) | physical qty |
| `totalReserved` | `SUM(qty)` from open `stock_allotment` lines for that store | reserved, not free |
| `totalQcHold` | `SUM(qty)` where `stock_status = QC_HOLD` | pending inspection |
| `totalAvailable` | `totalOnHand − totalReserved − totalQcHold` | **what can actually be issued/dispatched** |
| `totalValue` | `SUM(qty × last rate)` | stock value per store |
| `lastTransactionDate` | latest `stock_ledger.tx_date` for that store | freshness indicator |

- FR-INV-STORE-3: Clicking a store row drills into **Store Stock Detail** (`store-stock-detail`),
  filtered `current-stock` view for that store only, item-wise: `itemCode`, `itemName`,
  `batchNo`, `heatNo`, `onHand`, `reserved`, `qcHold`, `available`, `safetyStock`, `status`
  (OK / Low Stock / Out of Stock / Zero Stock).
- FR-INV-STORE-4: A store with `totalOnHand = 0` for every item is flagged **"Empty Store"**
  on the summary; a store not seen in `stock_ledger` for > 90 days is flagged **"Dormant"**.
- BR-INV-STORE-7: `totalAvailable` is the only figure other screens (Stock Issue, DC,
  Allotment) are allowed to check before allowing an OUT posting — this is the same
  `on_hand − reserved − qc_hold` formula as BR-INV-ENGINE-2, applied per store instead of
  globally, so "available stock" always means the same thing everywhere in the system.

### 02.3 Multi-store roll-up
- FR-INV-STORE-5: The Inventory Dashboard KPI **"Total Stock Value"** is the sum of
  `store-stock-summary.totalValue` across all active stores — one number, always
  reconcilable to the per-store list, never a separately-maintained figure.
- FR-INV-STORE-6: An item that exists in more than one store shows a **"multi-store" badge**
  on Current Stock and on Item Master, with a hover/drilldown listing quantity per store —
  so a user searching by item code can see at a glance which stores hold it and how much.

---

## 03. TRACEABILITY & DOCUMENT GENEALOGY [NEW / CORRECTED]

### 03.1 Why v1.0 was not fully traceable
v1.0 linked documents only by a **plain text doc-number string**
(`originalDocumentNo`, `sourceDocumentNo`, `linkedDocumentNo`, `allotmentNo`,
`issueRequestNo`) with no enforced foreign key, and no single screen showed the full chain.
This is corrected as follows.

### 03.2 Enforced link validation **[CORRECTED — closes Open Gap #1]**
- BR-INV-TRACE-1: Every field that references another document (`sourceDocumentNo`,
  `originalDocumentNo`, `originalDcNumber`, `originalInvoiceNumber`, `allotmentNo`,
  `issueRequestNo`) must resolve to an **existing document of the expected type and status
  POSTED** at the moment of `submit`. If it does not resolve, the document cannot move past
  DRAFT and the field is shown with a "not found / not posted" error — no more orphan
  references.
- BR-INV-TRACE-2: On successful link, the system stores the referenced document's internal
  ID (not only its display number) in a `doc_links` table, so renumbering or duplicate doc
  numbers across years can never mis-link two documents.

### 03.3 Full genealogy view (NEW screen — `traceability-viewer`)
For any item + batch/heat/lot/serial, or any single document number, show the complete
chain both backward (where did this stock come from) and forward (where did it go):

```
Supplier PO
   └─ PO Inward (IN)              ← received qty, batch/heat captured here
        └─ GRN (IN)                ← accepted/rejected split, QC_HOLD or FREE
             └─ Quality Inspection (if qcRequired = Yes)
                  └─ STORE (stock now FREE / available)  ─────────────┐
                                                                        │
                                     ┌──────────────────────────────────┘
                                     ▼
                    Stock Issue Request → RM/General/JO-DC/IIE/IAR Issue (OUT)
                                     │
                                     ├── consumed in production / handed to subcontractor
                                     │
                                     └── Return (Internal Return / Received-Against-Issue /
                                         Receipt Return) (IN) ── back to STORE, qty restored
                                     ▼
                            Sales DC / JO DC / General DC / Transfer DC (OUT)
                                     │
                                     ├── Purchase/Subcontract Invoice (NONE — billing only)
                                     │
                                     └── DC Return / Invoice Return (IN) ── back to STORE
```

- FR-INV-TRACE-3: Every node in the chain shows: doc no., doc type, date, status, qty,
  store/location, batch/heat/lot/serial, and the actor who posted it.
- FR-INV-TRACE-4: `traceability-viewer` accepts search by **item code**, **batch/heat/lot/
  serial no.**, or **any document number** and returns the same chain — this is the
  requirement for full lot/batch traceability (e.g. for a customer complaint or an audit,
  you can start from a Sales DC line and walk back to the exact supplier GRN it came from).

### 03.4 Worked example — Issue reduces stock, Return increases stock **[CORRECTED]**

This is the exact posting behaviour the system must guarantee, shown numerically so it can
be tested and verified:

| Step | Document | Effect | Qty | `stock_balance.qty` after posting |
|---|---|---|---|---|
| 1 | Opening — GRN-2026-0001 accepted | IN | +100 | **100** |
| 2 | RM Issue RMI-2026-0004 to production | OUT | −30 | **70** |
| 3 | Internal Return (unused material) IRT-2026-0002 | IN | +5 | **75** |
| 4 | Sales DC SDC-2026-0011 dispatched to customer | OUT | −40 | **35** |
| 5 | DC Return DRT-2026-0003 (customer returns damaged goods, disposition = REWORK) | IN | +8 (posted to `QC_HOLD`, not FREE) | **43** on-hand (35 FREE + 8 QC_HOLD) |

- BR-INV-TRACE-5: Every row above is one `stock_ledger` entry (`in_qty` or `out_qty`,
  never both) and one `stock_balance` update — the running balance shown in the
  **Inventory Log** (Section 14.2) must always foot exactly to this table for any item.
- BR-INV-TRACE-6: `recordStockOut` (Issue, DC, Stock Release) is **rejected** if
  `qty requested > available` (`on_hand − reserved − qc_hold`), unless `allowNegative` is
  explicitly set by an authorized role — this is the mechanism that guarantees stock can
  never go negative by mistake.
- BR-INV-TRACE-7: `recordStockIn` (all Returns) always **adds** to `stock_balance`; the
  target `stock_status` is not always `FREE` — it follows the disposition rule
  (BR-INV-DCR-1) so returned material that needs rework or scrap is never shown as
  available-to-issue stock even though it physically increased the store's on-hand qty.

---

## 04. CORRECTED MASTER WORKFLOW (END-TO-END) [CORRECTED]

### 04.1 What was wrong in v1.0's diagram
The v1.0 diagram showed the four zones (Inbound / Reservation-Issue-Dispatch / Returns-
Adjustment-Reports) but did not show **(a)** the store as a first-class node, **(b)** the
direction of stock movement at each arrow, or **(c)** where Purchase/Quality module events
feed in. Corrected below.

### 04.2 Full plant-level workflow

```
 SUPPLIER / SUBCONTRACTOR                         CUSTOMER
        │                                             ▲
        ▼                                             │
 ┌─────────────────┐                          ┌──────────────────┐
 │ Purchase Order /  │                          │ Sales Order       │
 │ Labour Order /     │                          │ (Purchase module)│
 │ Job Order          │                          └──────────────────┘
 │ (Purchase module)  │                                    │
 └─────────────────┘                                    │
        │ auto-fills supplier/PO/LO/JO no.                  │
        ▼                                                    │
 ┌───────────────────────────┐                               │
 │ PO / LO / JO / General     │  IN (+qty)                    │
 │ Inward                     │───────────────►  STORE A      │
 └───────────────────────────┘                  (stock UP)    │
        │ qcRequired=Yes                                       │
        ▼                                                       │
 ┌───────────────────────────┐                                  │
 │ Quality Inspection (IQC/  │  fail → Rejection Store           │
 │ LO / FAI / LINE)          │  pass → status FREE                │
 └───────────────────────────┘                                     │
        │                                                            │
        ▼                                                             │
 ┌───────────────────────────┐  IN (+qty, accepted only)                │
 │ GRN (Store Receipt)        │────────────────►  STORE A (stock UP)    │
 └───────────────────────────┘                                          │
        │                                                                │
        ▼  stock now visible in "Store-wise Stock" (Section 02)          │
 ┌────────────────────────────────────────────────────────────────┐     │
 │                     AVAILABLE STOCK IN STORE                    │     │
 │        available = on_hand − reserved − qc_hold  (per store)    │     │
 └────────────────────────────────────────────────────────────────┘     │
     │                    │                          │                    │
     ▼                    ▼                          ▼                    │
┌───────────┐   ┌───────────────────┐   ┌────────────────────────┐        │
│ Allotment │   │ STOCK ISSUE         │   │ DISPATCH (Delivery      │        │
│ (reserve, │   │ SIR → RM/General/   │   │ Challan)                 │        │
│ no ledger)│   │ JO-DC/IIE/IAR       │   │ Sales DC → Final          │        │
│           │   │ OUT (−qty)          │   │ Inspection gate →          │        │
│           │   │ STORE (stock DOWN)  │   │ OUT (−qty), STORE DOWN ────┼───────►
└───────────┘   └───────────────────┘   │ JO DC / General DC /       │
     │                    │              │ Transfer DC (OUT at source, │
     ▼                    ▼              │ IN at destination store)    │
┌───────────┐   ┌───────────────────┐   └────────────────────────┘
│ Stock     │   │ used in production /│              │
│ Release   │   │ handed to           │              ▼
│ OUT (−qty)│   │ subcontractor       │   ┌────────────────────────┐
│ frees     │   │        │            │   │ Purchase / Subcontract  │
│ reservation│  │        ▼            │   │ Invoice (billing only,  │
└───────────┘   │  RETURN (unused/    │   │ Effect NONE)            │
                 │  rejected/         │   └────────────────────────┘
                 │  customer return)  │              │
                 │  IN (+qty)         │              ▼
                 │  STORE UP ─────────┘   ┌────────────────────────┐
                 │  (status by            │ DC Return / Invoice     │
                 │  disposition)          │ Return  IN (+qty)        │
                 └────────────────────────│ STORE UP (status by      │
                                           │ disposition)             │
                                           └────────────────────────┘
                                                      │
                                                      ▼
                              ┌─────────────────────────────────────────┐
                              │ ADJUSTMENT (physical count correction)   │
                              │ Stock / Physical Amendment — ADJUST      │
                              └─────────────────────────────────────────┘
                                                      │
                                                      ▼
                              ┌─────────────────────────────────────────┐
                              │ REPORTS: Dashboard / Inventory Log /     │
                              │ Current Stock / Store-wise Stock /       │
                              │ Traceability Viewer                      │
                              └─────────────────────────────────────────┘
```

- BR-INV-WF-1: Every arrow marked **IN** increases the destination store's stock; every
  arrow marked **OUT** decreases the source store's stock; Transfer DC is the one document
  that does both in a single posting (OUT at source store, IN at destination store).
- BR-INV-WF-2: No stock-affecting document may skip the DRAFT → SUBMITTED → APPROVED →
  POSTED chain; only POSTED documents appear in Section 03.3's genealogy and Section 02's
  store totals — DRAFT/SUBMITTED/APPROVED figures are visible separately as "pending" so
  they never inflate the store's actual stock.

---

## 05. INWARD (PO / LO / JO / GENERAL)

**Screen:** `inward-entry` (dynamic form by sub-type).

| Sub-type | Doc key | Prefix | Effect | Tx Type | Qty field | API |
|---|---|---|---|---|---|---|
| PO Inward | `po-inward` | POI | IN | PO_INWARD | receivedQty | `/inventory/documents/po-inward` |
| LO Inward | `lo-inward` | LOI | IN | LO_INWARD | receivedQty | `/inventory/documents/lo-inward` |
| JO Inward | `jo-inward` | JOI | IN | JO_INWARD | producedQty | `/inventory/documents/jo-inward` |
| General Inward | `general-inward` | GI | IN | GENERAL_INWARD | receivedQty | `/inventory/documents/general-inward` |

### 05.1 Header fields
`date`, `docNo` (**auto**), `status` (**auto**), `supplier` (PO/LO — **auto-filled from
selected PO/LO**), `purchaseOrderNo` (PO — pick-list, **auto-fills supplier, item lines,
rate**), `labourOrderNo` (LO), `jobOrderNo` (JO), `supplierInvoiceNo`, `dcNumber`,
`supplierChallanNo`, `vehicleNo`, `receivedBy` (**auto = logged-in user**), `qcRequired`
(**auto-defaulted from Item Master's `inspectionRequired` flag**, editable), `reasonCode`
(General), `remarks`, `sourceLocation`/`storeLocation` (**auto-defaulted from Item Master's
`defaultReceivingStore`**, editable).

### 05.2 Line fields (BaseLine)
`lineNo` (auto), `itemCode` (pick-list → **auto-fills itemName, uom, batch/heat requirement
flags, last purchase rate**), `qty` (→ receivedQty/producedQty), `batchNo`, `heatNo`,
`lotNo`, `serialNo`, `expiryDate`, `location`, `warehouse`, `remarks`.

### 05.3 Business rules
- BR-INV-IN-1: General Inward requires `reasonCode` (Opening Stock, Free Sample, Customer
  Return, Second Quality, Warranty Return, Other).
- BR-INV-IN-2: Items with `requiresBatch` need `batchNo`; `requiresHeat` needs `heatNo`.
- BR-INV-IN-3: `qcRequired=Yes` auto-creates a `QualityInspection`: PO→IQC, LO→LO, JO→FAI,
  General→LINE.
- BR-INV-IN-4: Backdated entry (> 2 h) rejected unless authorized (`BACKDATED_ENTRY`).
- BR-INV-IN-5: Only DRAFT/REJECTED editable/deletable.
- BR-INV-IN-6: All lines require positive quantity.

### 05.4 Workflow (WF-INV-IN)
```
DRAFT ──approve (auto post)──► POSTED ──► stock IN at storeLocation (+ auto IQC if qcRequired=Yes)
```

---

## 06. STORE RECEIPT — GRN

**Screen:** `grn`. **Doc key:** `grn`. **Prefix:** `GRN`. **Effect:** IN. **Tx:** `GRN`.
**Qty field:** `acceptedQty`.

### 06.1 Header fields
`date`, `docNo` (**auto**), `status` (**auto**), `sourceType` (`PO_INWARD`/`LO_INWARD`/
`JO_INWARD`/`GENERAL_INWARD`/`RETURN_INWARD`), `sourceDocumentNo` (required, pick-list —
**auto-fills party, item lines, inspected quantities from the source document**), `party`
(**auto**), `inspectionRef` (**auto-linked when a QC record exists for the source doc**),
`remarks`.

### 06.2 Line fields
`itemCode` (**auto** from source doc), `itemDesc` (**auto**), `uom` (**auto**),
`inspectedQty` (**auto from Quality Inspection when present**), `acceptedQty`, `rejectedQty`,
`rate` (**auto from source PO/LO rate**), `amount = acceptedQty × rate` (**auto-calculated,
read-only**), `batchNo`, `heatNo`, `location` (**auto = store's default location**).

### 06.3 Business rules
- BR-INV-GRN-1: `acceptedQty + rejectedQty ≤ inspectedQty`.
- BR-INV-GRN-2: Line items with `inspectionRequired=true` post stock as `QC_HOLD`;
  otherwise `FREE`.

### 06.4 Workflow (WF-INV-GRN)
```
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED ──post──► POSTED (stock IN at acceptedQty, STORE UP)
```

---

## 07. STOCK ISSUE FAMILY [CORRECTED — explicit stock-reduce logic]

All issue docs have Effect **OUT** (except SIR = NONE) and post stock OUT on `post`. Per
BR-INV-TRACE-6, every issue is checked against store-wise **available** stock before it is
allowed to post — the store's total drops by exactly the issued quantity, visible
immediately on the Store-wise Stock Summary (Section 02.2) and the Inventory Log.

| Doc | Prefix | Tx type | Qty field | Purpose / linkage |
|---|---|---|---|---|
| Stock Issue Request | SIR | STOCK_ISSUE_REQUEST | requestedQty | Request/approval only; EFFECT NONE |
| RM Issue | RMI | RM_ISSUE | issueQty | Raw-material issue against approved SIR |
| General Issue | GEI | GENERAL_ISSUE | issueQty | General-purpose issue |
| JO DC Issue | JDI | JO_DC_ISSUE | issueQty | Issue to subcontractor under a JO DC |
| Issue Internal/External | INT/EXT | ISSUE_INTERNAL_EXTERNAL | issueQty | `issueType` INTERNAL/EXTERNAL selects prefix |
| Issue Against Receipt | IAR | ISSUE_AGAINST_RECEIPT | issueQty | Issue against a prior receipt |

### 07.1 Stock Issue Request (SIR)
Header: `date` (**auto = today**), `department`, `requestedBy` (**auto = logged-in user**),
`requiredDate`, `jobOrderNo`, `purpose`.
Lines: `itemCode` (**auto-fills itemName, uom, current available qty for reference**),
`requestedQty`, `approvedQty` (set during approval), `returnable`.
- BR-INV-SIR-1: No stock effect; acts as approval workflow.
- BR-INV-SIR-2: `approveWithLines()` records per-line `approvedQty`.
- BR-INV-SIR-3: RM Issue validates against `approvedQty − already issued`.

### 07.2 RM Issue
Header/line fields **auto-filled from the linked SIR** once `issueRequestNo` is selected:
item, requested qty, department, requestedBy.
- BR-INV-RM-1: If `issueRequestNo` set, referenced SIR must be APPROVED or POSTED; issue qty
  per item ≤ `SIR line qty − issued qty`.
- BR-INV-RM-2 **[NEW]**: On `post`, `recordStockOut(itemCode, store, issueQty)` is called;
  `stock_balance.qty` for that item/store is reduced by exactly `issueQty`; a `stock_ledger`
  row is written with `out_qty = issueQty`. Rejected if `issueQty > available`.
- Posting stock status `FREE` (issue only draws from FREE stock, never QC_HOLD).

### 07.3 General Issue
Header: `date` (**auto**), `transactionType` (GENERAL_ISSUE default), `destinationLocation`,
`issuedTo`, `department`, `purpose`, `remarks`. Returned by `internal-return`.
Same stock-reduce logic as 07.2 (BR-INV-RM-2 applies to all issue doc types uniformly).

### 07.4 JO DC Issue
Header: `date` (**auto**), `transactionType` (JO_ISSUE), `jobOrderNo` (**auto-fills
supplier, item BOM lines from Job Order**), `supplier` (**auto**), `destinationLocation`,
`remarks`. Links to `job_order`.

### 07.5 Issue Internal / External
- BR-INV-IIE-1: `issueType` field determines document prefix: `INTERNAL` → `INT`,
  `EXTERNAL` → `EXT`.

### 07.6 Issue Against Receipt
- Returned by `received-against-issue`.

### 07.7 Workflow (WF-INV-ISSUE) [CORRECTED]
```
Stock Issue Request:   DRAFT ──submit──► SUBMITTED ──approve (with lines)──► APPROVED/POSTED
                                                                              (no stock effect)

RM Issue / General Issue / JO DC Issue / IIE / IAR:
   DRAFT ──submit──► SUBMITTED ──approve──► APPROVED ──post──►
   POSTED  ⇒  recordStockOut()  ⇒  STORE STOCK REDUCED by issueQty
              ⇒  stock_ledger row written (out_qty = issueQty)
              ⇒  visible instantly in Store-wise Stock (02.2) and Inventory Log (14.2)
```

---

## 08. DELIVERY CHALLAN FAMILY + DC PRINT TEMPLATE [CORRECTED]

| Doc | Prefix | Effect | Tx type | Purpose |
|---|---|---|---|---|
| Sales DC | SDC | OUT | SALES_DC | Customer dispatch w/ SO + logistics + final-inspection gate |
| JO DC | JOD | OUT | JO_DC | Material to subcontractor |
| General DC | GDC | OUT | GENERAL_DC | Generic dispatch |
| Return DC | RDC | OUT | RETURN_DC | Return goods to supplier |
| Transfer DC | TDC | OUT(+IN) | TRANSFER_DC | Inter-location transfer |

### 08.1 Sales DC (richest)
Header: `date` (**auto**), `customer` (pick-list — **auto-fills customerCode, delivery
address, contact person**), `customerCode` (**auto**), `salesOrderNo` (pick-list —
**auto-fills item lines, SO qty, previously dispatched qty, pending qty, rate**),
`customerPoNumber`, `piReference`, `transporter`, `vehicleNo`, `lrNumber`, `lrNo`, `lrDate`,
`dispatchDate` (**auto = today**), `ewayBillReference`, `contactPerson` (**auto**),
`driverDetails`, `deliveryAddress` (**auto from customer master**), `sourceLocation`
(**auto = default dispatch store**), `linkedDocumentNo`, `party`, `attachmentFileName`.

Line fields: `itemCode` (**auto** from SO), `itemName` (**auto**), `uom` (**auto**), `soQty`
(**auto**), `previouslyDispatchedQty` (**auto = SUM of prior POSTED DC lines against this
SO**), `currentDispatchQty` (→ `qty` for posting — user enters, capped at `pendingQty`),
`pendingQty` (**auto = soQty − previouslyDispatchedQty**), `qty`, `batchNo`/`batchNumber`
(**auto from FIFO-eligible stock, editable**), `heatNo`/`heatNumber`, `lotNo`, `serialNo`,
`customerPartNumber` (**auto from Item-Customer cross-reference**), `drawingNumber`,
`drawingRevision`, `packingReference`, `qualityInspectionReference` (**auto-linked once
Final Inspection passes**).

Business rules:
- BR-INV-SDC-1: **Final Inspection Gate** — on `post`, if item has `inspectionRequired=true`,
  a passing `FINAL` inspection must exist; blocked otherwise. Override `forceDispatch=true`
  requires ADMIN/MANAGEMENT/SALES_MANAGER role.
- BR-INV-SDC-2: Field renames applied: `dispatchQty`→`currentDispatchQty`,
  `heatNumber`→`heatNo`, `lineRemark`→`remarks`.
- BR-INV-SDC-3 **[NEW]**: On `post`, `recordStockOut(itemCode, sourceLocation,
  currentDispatchQty)` reduces the store's stock exactly as in Section 07 — Sales DC uses
  the same stock-reduce mechanism as an Issue document, just with Effect tagged `SALES_DC`.
- Posting qty = `currentDispatchQty`/`qty`.

### 08.2 JO DC / General DC / Return DC / Transfer DC
Headers: JO DC (`transactionType` JO_ISSUE, `supplier`, `jobOrderNo` — **auto-fills
supplier and pending JO items**, `destinationLocation`), General DC (`party`), Return DC
(`party`), Transfer DC (`destinationLocation` — **must be a different store than
`sourceLocation`**, enforced at save).

- BR-INV-TDC-1: Transfer DC posts **stock OUT at source** and **stock IN at destination**
  (`destinationLocation`) in one transaction — both `stock_ledger` rows share the same
  `doc_no` so the transfer is traceable as a single event in the genealogy viewer.

### 08.3 DC Print Template — proper, complete layout **[CORRECTED — this was missing/incomplete]**

**Trigger:** "Print" action available once the DC is **POSTED** (a DRAFT DC prints watermarked
`"DRAFT — NOT VALID FOR DISPATCH"` diagonally, so a draft can never be mistaken for the final
document). Print output: PDF, A4, using the `pdf` document engine.

**Header block (top of page):**
- Company logo, name, address, GSTIN/Tax ID, phone/email — **auto from Company Settings**,
  same block on every printed document.
- Document title: **"DELIVERY CHALLAN"** (Sales/General) or **"JOB WORK DELIVERY CHALLAN"**
  (JO DC) or **"RETURN DELIVERY CHALLAN"** (Return DC) or **"STOCK TRANSFER CHALLAN"**
  (Transfer DC) — title changes automatically by doc sub-type, never hand-typed.
- `DC No.` (auto), `DC Date` (auto), `Page X of Y`.

**Party block (two columns, side by side):**
- Left — **"Consignee / Ship To"**: customer/party name, delivery address, GSTIN, contact
  person, phone — all **auto** from the linked customer/party master.
- Right — **"Dispatch Details"**: `Source Store`, `Transporter`, `Vehicle No.`, `LR No. /
  Date`, `E-way Bill No.`, `Customer PO No.`, `Sales Order No.` — all **auto** from header
  fields; blank only if genuinely not applicable to that doc sub-type.

**Line item table (auto-populated, one row per posted line, nothing typed at print time):**

| S.No. | Item Code | Item Description | HSN/SAC | Batch/Heat No. | UOM | Qty Dispatched | Remarks |
|---|---|---|---|---|---|---|---|

- `S.No.` auto-sequenced.
- `Item Code`/`Item Description`/`HSN/SAC`/`UOM` auto from Item Master.
- `Batch/Heat No.` auto from the posted line (`batchNo`/`heatNo`/`lotNo`/`serialNo` —
  whichever is populated for that item).
- `Qty Dispatched` = the posted `currentDispatchQty`/`qty` — **never re-typed, always pulled
  from the posted document** so the print can never disagree with what was actually posted
  to stock.
- Table auto-paginates; totals row (`Total Qty`, `Total Packages` if `packingReference`
  present) auto-sums.

**Footer block:**
- `Total Quantity` (auto-sum), `Total No. of Packages` (auto, if packing data exists),
  `Remarks` (from header).
- Declaration line: *"Goods dispatched as per above details. Received in good condition by
  consignee on delivery."*
- Three signature boxes side by side, pre-labelled (not hand-drawn each time): **"Prepared
  By"** (auto-filled with the posting user's name), **"Checked By"**, **"Receiver's
  Signature & Stamp"**.
- Footer note: DC number, printed timestamp, printed-by user — small print, bottom-left, for
  audit of every print event.

- FR-INV-DC-PRINT-1: Every print action is logged (`doc_no`, `printed_by`, `printed_at`,
  `copy_number`) so re-prints are traceable; the printed copy shows **"COPY N"** if it is not
  the first print.
- FR-INV-DC-PRINT-2: The same auto-fill rule applies to JO DC, General DC, Return DC and
  Transfer DC prints — only the header title and the party-block labels change; the
  auto-fill/no-retyping principle is identical across all five DC types.
- BR-INV-DC-PRINT-3: A DC cannot be printed for dispatch purposes before it is POSTED
  (BR-INV-SDC-1's inspection gate and the stock-reduce posting must both have already
  happened) — this guarantees the printed document always matches a stock movement that has
  actually occurred, never a movement that is still pending approval.

### 08.4 Workflow (WF-INV-DC) [CORRECTED]
```
Sales DC:    DRAFT ──► SUBMITTED ──► APPROVED ──post (Final Inspection Gate)──►
             POSTED ⇒ STORE STOCK REDUCED ⇒ Print enabled ⇒ printed copy shows actual posted qty

Transfer DC: DRAFT ──► ... ──► POSTED  ⇒ OUT at source store + IN at destination store
                                          (both stores' totals update in Section 02.2)

Return DC:   DRAFT ──► ... ──► POSTED  ⇒ STORE STOCK REDUCED (goods physically leaving
                                          to go back to supplier)
```

---

## 09. SUPPLIER INVOICE

### 09.1 Purchase Invoice
**Screen:** `purchase-invoice`. **Doc key:** `purchase-invoice`. **Prefix:** `PI`.
**Effect:** NONE. Header-only doc. Links: `purchaseOrderNo` (**auto-fills supplier, PO
value**).

Fields: `date` (**auto**), `supplier` (**auto from PO**), `purchaseOrderNo`,
`supplierInvoiceNo`, `taxAmount`, `totalAmount`, `dueDate`. Attachments: up to 3 files
(`supplier_invoice_attachment`).

- BR-INV-PI-1: `MAX_ATTACHMENTS = 3`; attachments via `POST /{type}/{id}/attachments`,
  `DELETE /{type}/{id}/attachments/{id}`.
- BR-INV-PI-2: APPROVED/POSTED invoices feed finance `invoicedSpend` in Purchase Dashboard.

### 09.2 Subcontract Invoice
**Screen:** `subcontract-invoice`. **Doc key:** `subcontract-invoice`. **Prefix:** `SI`.
Line field: `processedQty` (**auto from linked JO DC issue/receipt quantities**).

---

## 10. RETURN MANAGEMENT FAMILY [CORRECTED — explicit stock-increase logic]

All returns have Effect **IN** and post stock IN. Eligibility: original doc must exist and be
`POSTED`; return qty cannot exceed original minus previously returned (enforced per
BR-INV-TRACE-1).

| Doc | Prefix | Returns against | Disposition |
|---|---|---|---|
| Inward Return | IRT | PO Inward (`originalDocumentNo`) | reason select |
| DC Return | DRT | Sales DC (`originalDcNumber`) | PENDING_INSPECTION / REWORK / SCRAP / REUSE / REPACK |
| Invoice Return | IVT | Sales Invoice (`originalInvoiceNumber`) | same |
| Internal Return | INT | General Issue (`originalDocumentNo`) | — |
| Received Against Issue | RAI | any issue doc | — |
| Receipt Return | RCT | RM Issue (`originalDocumentNo`) | — |

### 10.1 DC Return detail
Header: `originalDcNumber` (pick-list — **auto-fills customer, customerCode,
customerPoNumber, salesOrderNumber, original line items and quantities**), `originalDcDate`
(**auto**), `customer` (**auto**), `customerCode` (**auto**), `customerPoNumber` (**auto**),
`salesOrderNumber` (**auto**), `disposition`, `returnDate` (**auto = today**), `returnReason`,
`qualityInspectionReference`, `transportDetails`, `customerRemarks`.

Lines: `itemCode` (**auto**), `currentReturnQty` (user enters, capped at
`originalDcQty − previously returned`), `originalDcQty` (**auto**), `materialCondition`
(maps from `disposition`), `customerPartNumber` (**auto**), `drawingNumber` (**auto**),
`drawingRevision` (**auto**).

- BR-INV-DCR-1: Stock status on posting by disposition:
  `PENDING_INSPECTION`/`REWORK` → `QC_HOLD`; `SCRAP` → `SCRAP`; else → `FREE`.
- BR-INV-DCR-2 **[NEW]**: On `post`, `recordStockIn(itemCode, store, currentReturnQty)`
  **increases** `stock_balance.qty` for that item/store by exactly `currentReturnQty`; a
  `stock_ledger` row is written with `in_qty = currentReturnQty` — this is the mirror image
  of BR-INV-RM-2 and is what makes "Issue reduces stock / Return increases stock" true for
  every return type, not only DC Return.
- BR-INV-FRR-1: `received-against-issue` searches all issue types (general-issue, rm-issue,
  jo-dc-issue, issue-internal-external, issue-against-receipt); qty ≤ original issue −
  previously returned.

### 10.2 Workflow (WF-INV-RET) [CORRECTED]
```
DRAFT ──► SUBMITTED ──► APPROVED ──post──►
POSTED ⇒ recordStockIn() ⇒ STORE STOCK INCREASED by returned qty
          ⇒ stock_status set by disposition (FREE / QC_HOLD / SCRAP — not automatically
            "available", even though on-hand qty went up)
          ⇒ visible instantly in Store-wise Stock (02.2) and Inventory Log (14.2)
```

---

## 11. ALLOTMENT

### 11.1 Stock Allotment
**Doc key:** `stock-allotment`. **Prefix:** `SA`. **Effect:** NONE. **Tx:** STOCK_ALLOTMENT.
Reserve/allocate stock for an order. Does NOT post ledger; marks stock reserved (reduces
**available**, per BR-INV-STORE-7, without touching on-hand).

Header: `date` (**auto**), `allotmentType` (Job Order / Sales Order / Production Order),
`customer`, `referenceNo` (**auto-fills item lines and quantities from the referenced
order**). Lines: `itemCode` (**auto**), `allottedQty`, `batchNo`, `location`.
Workflow: submit → approve → (POSTED as approved) → cancel/reopen.

### 11.2 Stock Release
**Doc key:** `stock-release`. **Prefix:** `SR`. **Effect:** OUT. Release reserved stock.
Header: `allotmentNo` (required, pick-list — **auto-fills item lines, allotted qty,
already-released qty**), `reason` (Order Cancelled / Excess Reservation / Change of Plan /
Other). Lines: `itemCode` (**auto**), `releasedQty`.

- BR-INV-SR-1: `allotmentNo` mandatory; referenced allotment must be POSTED.
- BR-INV-SR-2: `releasedQty` per item ≤ `allottedQty − alreadyReleasedQty`.

### 11.3 Workflow (WF-INV-ALLOT)
```
Stock Allotment (reserve, no ledger, reduces AVAILABLE only) ──► POSTED ──►
Stock Release (stock OUT, frees the reservation and reduces on-hand for genuine consumption)
```

---

## 12. AUTO-FILL FIELD MATRIX [NEW]

Every field below is populated by the system the moment its trigger fires, and remains
editable only where marked **(editable)** — everything else is read-only once auto-filled,
so users never re-type data the system already knows.

| Screen | Field | Auto-filled from | Trigger |
|---|---|---|---|
| All documents | `docNo` | `DocNumberService` (`{PREFIX}-{YEAR}-{SEQ}`) | on create |
| All documents | `date` | today's date (editable, subject to BR-INV-IN-4 backdate rule) | on create |
| All documents | `status` | lifecycle engine | on every transition |
| All documents | `createdBy`/`submittedBy`/`approvedBy`/`postedBy` | logged-in user | on each action |
| Inward | `supplier` | selected `purchaseOrderNo`/`labourOrderNo` | on PO/LO pick |
| Inward | line `itemName`, `uom`, `batch/heat requirement`, `lastRate` | Item Master | on item pick |
| Inward | `qcRequired` (editable) | Item Master `inspectionRequired` flag | on item pick |
| Inward | `storeLocation` (editable) | Item Master `defaultReceivingStore` | on item pick |
| GRN | party, item lines, `inspectedQty` | source document / linked Quality Inspection | on `sourceDocumentNo` pick |
| GRN | `amount` | `acceptedQty × rate` | on qty/rate entry |
| RM/General/JO-DC Issue | item, requested qty, department | linked SIR / Job Order | on reference pick |
| Sales DC | customer address, contact, GSTIN | Customer Master | on customer pick |
| Sales DC | item lines, `soQty`, `previouslyDispatchedQty`, `pendingQty`, rate | Sales Order + prior POSTED DC lines | on `salesOrderNo` pick |
| Sales DC | `customerPartNumber` | Item-Customer cross-reference | on item pick |
| Sales DC | `qualityInspectionReference` | Final Inspection record | on inspection pass |
| DC Return | customer, PO no., SO no., original item lines/qty | linked `originalDcNumber` | on pick |
| Stock Release | item lines, allotted qty, already-released qty | linked `allotmentNo` | on pick |
| Purchase/Subcontract Invoice | supplier, PO value | linked `purchaseOrderNo`/JO DC | on pick |
| Store-wise Stock (Sec. 02) | store name/type, item count, on-hand, reserved, QC hold, available, value | `store_master` + `stock_balance` + open `stock_allotment` | live, on every posting |
| DC Print (Sec. 08.3) | entire header/party/line-item/footer block | posted document + Company Settings + Customer/Item Master | on Print action |

---

## 13. ADJUSTMENT

### 13.1 Stock Amendment
**Doc key:** `stock-amendment`. **Prefix:** `SAM`. **Effect:** ADJUST. Header-only (single item).
Fields: `date` (**auto**), `itemCode` (**auto-fills itemName**), `location`, `batchNo`,
`systemQty` (**auto = current `stock_balance.qty`**), `correctedQty`, `differenceQty`
(**auto = corrected − system**), `reasonCode` (required: Counting Error / Data Entry Error /
Damaged Stock / Approved Correction).

- BR-INV-ADJ-1: `reasonCode` mandatory for stock adjustments.
- BR-INV-ADJ-2: Posting computes `diff = correctedQty − currentOnHand`; if nonzero →
  `recordStockAdjustment(diff)` — increases stock if `diff > 0`, decreases if `diff < 0`.

### 13.2 Physical Stock Amendment
**Doc key:** `physical-stock-amendment`. **Prefix:** `PSA`. **Effect:** ADJUST. Line-level.
Header: `date` (**auto**), `countType` (Full Count / Cycle Count / Location Count / Batch
Count), `reasonCode`. Lines: `itemCode` (**auto-fills itemName**), `systemQty` (**auto**),
`physicalQty` (posting qty), `varianceQty` (**auto**), `varianceValue` (**auto**),
`reasonCode`, `batchNo`, `location`.

### 13.3 Workflow (WF-INV-ADJ)
```
DRAFT ──► SUBMITTED ──► APPROVED ──post──► POSTED (delta adjusted on stock_balance + ledger)
```

---

## 14. INVENTORY REPORTS

### 14.1 Inventory Dashboard (`reports`)
KPIs: `activeStoreCount` **[NEW]**, `totalOnHand`, `stockValue` (money), `reserved`,
`available`, `lowStockCount`, `pendingInward`, `pendingApprovals`, `ledgerEntries`.
Drilldowns: current-stock, store-stock-summary **[NEW]**, reservations, low-stock,
pending-inward, pending-approvals, inventory-log.

### 14.2 Inventory Log (`inventory-log`)
Columns: `date`, `docNo`, `txType`, `itemCode`, `location`/`store`, `batchNo`, `inQty`,
`outQty`, `runningBalance`. Filters: search, dateRange, item, **store [NEW]**, txType.
Tx types: RECEIPT, RM_ISSUE, GENERAL_ISSUE, JO_ISSUE, INTERNAL_ISSUE, ISSUE_AGAINST_RECEIPT,
DC_DISPATCH, DC_RETURN, SALES_RETURN, INTERNAL_RETURN, ISSUE_RETURN, RECEIPT_RETURN,
TRANSFER_OUT, STOCK_ADJUSTMENT, PHYSICAL_ADJUSTMENT.

### 14.3 Current Stock (`current-stock`)
Columns: `itemCode`, `itemName`, `category`, `itemType`, `itemGroup`, `location`/`store`,
`batchNo`, `heatNo`, `safetyStock`, `onHand`, `reserved`, `qcHold`, `available`, `value`,
`status`, `multi-store badge [NEW]`. Filters: search, item, store, category, `lowStockOnly`,
`includeZero`.
Drilldowns: **Not Available** (items with zero stock), **Low Stock** (`onHand < safetyQty`).

### 14.4 Store-wise Stock Summary (`store-stock-summary`) **[NEW — see Section 02.2]**
One row per active store: `storeCode`, `storeName`, `storeType`, `itemCount`, `totalOnHand`,
`totalReserved`, `totalQcHold`, `totalAvailable`, `totalValue`, `lastTransactionDate`,
`Empty Store`/`Dormant` flags. Drilldown → Store Stock Detail (item-wise, per store).

### 14.5 Traceability Viewer (`traceability-viewer`) **[NEW — see Section 03.3]**
Search by item code, batch/heat/lot/serial, or document number → full backward/forward
document genealogy.

---

## 15. NUMBERING (NUM-INV) [CORRECTED — prefix collision fixed]

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
| issue-internal-external (internal) | **ISI** *(was INT)* | received-against-issue | RAI |
| issue-internal-external (external) | EXT | receipt-return | RCT |
| internal-return | **IRN** *(was INT)* | stock-amendment | SAM |
| issue-against-receipt | IAR | physical-stock-amendment | PSA |
| stock-allotment | SA | | |
| stock-release | SR | | |

- BR-INV-NUM-1 **[CORRECTED — closes Open Gap #3]**: `issue-internal-external`'s internal
  leg now uses prefix **`ISI`** and `internal-return` now uses prefix **`IRN`**, so the two
  document types no longer share the `INT` prefix and can never collide in the same
  numbering sequence.
- `numbering_config` seeds must be added for all inventory doc types (was previously
  falling back to the `DocTypes` prefix default with no explicit seed row) so prefixes are
  configurable per company without a code change.

---

## 16. BUSINESS RULES (BR-INV) [CORRECTED — new rules added, marked NEW]

| ID | Rule |
|---|---|
| BR-INV-ENGINE-1 | All DOC IN/OUT/ADJUST write `stock_ledger` + update `stock_balance` in one transaction. |
| BR-INV-ENGINE-2 | Available = on_hand − reserved − qc_hold; OUT requires availability unless allowNegative. |
| BR-INV-ST-1 | Stock status semantics: FREE, QC_HOLD, BLOCKED, REJECTED, QUARANTINE, SCRAP. |
| BR-INV-GRN-1 | accepted + rejected ≤ inspected. |
| BR-INV-GRN-2 | inspectionRequired items → QC_HOLD on GRN receipt. |
| BR-INV-SDC-1 | Final Inspection gate before Sales DC post (forceDispatch override needs senior role). |
| BR-INV-SDC-3 **[NEW]** | Sales DC post reduces store stock exactly like an Issue document. |
| BR-INV-TDC-1 | Transfer DC posts OUT at source + IN at destination. |
| BR-INV-RET-1 | Return eligibility: original POSTED + not exceeding remaining balance. |
| BR-INV-DCR-1 | DC/Invoice return disposition maps stock status (QC_HOLD/SCRAP/FREE). |
| BR-INV-DCR-2 **[NEW]** | Every return posting increases store stock by the returned qty (mirror of BR-INV-RM-2). |
| BR-INV-RM-2 **[NEW]** | Every issue posting reduces store stock by the issued qty. |
| BR-INV-ADJ-1 | Adjustments require reason code. |
| BR-INV-SR-1 | Release requires POSTED allotment; cannot exceed allotted remaining. |
| BR-INV-SIR-1 | SIR is approval-only (no stock effect); RM Issue enforces SIR balance. |
| BR-INV-BACKDATE-1 | Backdated entries (> 2 h) blocked unless authorized. |
| BR-INV-EDIT-1 | Only DRAFT/REJECTED documents editable/deletable. |
| BR-INV-STORE-7 **[NEW]** | Store-level "available" formula is identical to the global formula, applied per store. |
| BR-INV-TRACE-1 **[NEW]** | Every cross-document reference field must resolve to an existing POSTED document before submit is allowed. |
| BR-INV-TRACE-2 **[NEW]** | Document links are stored by internal ID, not display number, to prevent mis-linking. |
| BR-INV-TRACE-6 **[NEW]** | OUT postings are rejected if requested qty > available, unless explicitly authorized. |
| BR-INV-TRACE-7 **[NEW]** | Return postings always increase on-hand qty; resulting status follows disposition, not automatically FREE. |
| BR-INV-WF-1 **[NEW]** | Every workflow arrow's stock direction (IN increases / OUT decreases) is enforced exactly as diagrammed in Section 04.2. |
| BR-INV-WF-2 **[NEW]** | Only POSTED documents affect store totals and appear in the genealogy viewer. |
| BR-INV-NUM-1 **[NEW]** | `ISI`/`IRN` prefixes replace the former shared `INT` prefix. |
| BR-INV-DC-PRINT-3 **[NEW]** | A DC can only be printed for dispatch after POSTED status (stock already reduced). |

---

## 17. ROLES AND PERMISSIONS

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
| Store-wise Stock / Traceability Viewer **[NEW]** | View |

---

## 18. AUDIT AND TRACEABILITY

- Every document carries lifecycle audit columns (submitted/approved/closed/cancelled by+at).
- `stock_ledger` is the immutable audit trail of every quantity change (`doc_no`, `doc_type`,
  `tx_type`, actor, timestamp).
- `doc_links` **[NEW]** is the immutable table of every cross-document reference, by internal
  ID, powering the Traceability Viewer (Section 03.3).
- Every DC print event is logged (`printed_by`, `printed_at`, `copy_number`) **[NEW]**.
- Inventory Log page exposes the ledger with running balance; Store-wise Stock Summary
  exposes the same data aggregated per store.

---

## 19. DATABASE IMPACT SUMMARY [CORRECTED — new tables/columns]

Core: `stock_balance`, `stock_ledger`, `doc_sequence`, `numbering_config`,
**`doc_links` [NEW — id, source_doc_id, source_doc_type, target_doc_id, target_doc_type,
created_at]**, **`dc_print_log` [NEW — doc_no, printed_by, printed_at, copy_number]**.

Document tables: `po_inward(_line)`, `lo_inward(_line)`, `jo_inward(_line)`,
`general_inward(_line)`, `return_inward(_line)`, `grn(_line)`, `stock_issue_request(_line)`,
`rm_issue(_line)`, `general_issue(_line)`, `jo_dc_issue(_line)`,
`issue_internal_external(_line)`, `issue_against_receipt(_line)`, `sales_dc(_line)`,
`jo_dc(_line)`, `general_dc(_line)`, `return_dc(_line)`, `transfer_dc(_line)`,
`purchase_invoice`, `subcontract_invoice`, `supplier_invoice_attachment`, `inward_return(_line)`,
`dc_return(_line)`, `invoice_return(_line)`, `internal_return(_line)`,
`received_against_issue(_line)`, `receipt_return(_line)`, `stock_allotment(_line)`,
`stock_release(_line)`, `stock_amendment`, `physical_stock_amendment(_line)`.

`store_master` gains no new columns; `stock_balance` and `stock_ledger` gain no new columns —
Store-wise Stock Summary (14.4) is a **read-only aggregation view** over existing tables, not
a new physical table, so it can never drift out of sync with the ledger.

---

## 20. RESOLVED GAPS (from v1.0 Open Gaps)

| # | v1.0 Gap | Resolution in v2.0 |
|---|---|---|
| 1 | Doc-number string joins across PO ↔ inward ↔ DC allowed orphan references | BR-INV-TRACE-1/2 + `doc_links` table — resolved |
| 2 | Reversal not netted in reconciliation when source docs DRAFT/CANCELLED | Genealogy viewer only shows POSTED nodes (BR-INV-WF-2); reconciliation reports must filter the same way — resolved by rule, report logic to follow this rule |
| 3 | `issue-internal-external`/`internal-return` shared `INT` prefix | BR-INV-NUM-1 — `ISI`/`IRN` — resolved |
| 4 | RM Issue lacked a dedicated numbering config entry | Section 15 requires explicit `numbering_config` seeds for every inventory doc type, including RM Issue — resolved |
| 5 | Transfer DC had no separate reversal of the IN leg on cancellation | BR-INV-WF-1 requires the cancel action to reverse **both** legs of a Transfer DC symmetrically (OUT leg restored at source, IN leg reversed at destination) — resolved |

---

*End of DOCUMENT 02 v2.0 — Inventory Module FRS (Corrected: Store-wise Stock, Traceability,
Issue/Return Stock Logic, DC Print Template, Auto-Fill Matrix, Corrected Workflow).*
