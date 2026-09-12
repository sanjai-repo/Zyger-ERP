# ZYGER ERP — PURCHASE MODULE
# DOCUMENT 01 — COMPLETE PURCHASE MODULE FRS (FUNCTIONAL REQUIREMENTS SPECIFICATION + WORKFLOWS)

| | |
|---|---|
| Project | Zyger ERP |
| Module | Purchase |
| Document | DOCUMENT 01 — Complete Purchase Module Functional Requirements Specification |
| Status | FRS — module-level |
| Version | 1.0 |

**How to read this document.** This is the module-level FRS. It defines functional requirements
(FR-PUR-*), business rules (BR-PUR-*), workflows (WF-PUR-*), numbering (NUM-PUR-*), and
integration contracts for the Purchase module. Field-level detail and per-screen layouts are
embedded inline. All identifiers are stable and match the implemented system
(`zyger-erp-backend` / `zyger-erp-frontend`).

---

## TABLE OF CONTENTS

01. Module Overview and Architecture
02. Purchase Document Backbone (shared engine)
03. Purchase Request (PR)
04. Supplier Enquiry (SE)
05. Supplier Quotation (SQ)
06. Quotation Comparison
07. Purchase Order (PO)
08. PO Schedule
09. Job Order (JO) — Subcontracting
10. JO Schedule
11. Purchase Target
12. Purchase Price List (PPL)
13. Job Work Price List (JWPL)
14. Purchase Dashboard
15. Numbering (NUM-PUR)
16. Workflow and Status Lifecycle (WF-PUR)
17. Business Rules (BR-PUR)
18. Roles and Permissions
19. Audit and Traceability
20. Database Impact Summary
21. API Impact Summary
22. Open Gaps and Known Limitations

---

## 01. MODULE OVERVIEW AND ARCHITECTURE

### 01.1 Founding principle
The Purchase module follows the **single generic document engine** (`DocumentFacade`) pattern:
every purchase document is a **header + lines** record with a numbered `docNo`, a status
lifecycle, soft delete, optimistic locking (`@Version`), and audit (created/updated/submitted/
approved/closed/cancelled timestamps and actor).

### 01.2 Document family

```
Purchase Request (PR)
  └─► Supplier Enquiry (SE)         → routes the item list to multiple suppliers
        └─► Supplier Quotation (SQ)  → supplier priced responses
              └─► Quotation Comparison (analysis, frontend) ──► Purchase Order (PO)
                                                                    │  ├─► PO Schedule (tracking)
                                                                    │  └─► PO Inward / GRN (Inventory)
Job Order (JO) — subcontract processing
  ├─► JO Schedule (tracking)
  ├─► JO DC Issue / JO DC / JO Inward (Inventory, linked by doc number)
  └─► Job Order Reconciliation
Purchase Target (PT) — procurement KPI
Purchase Price List (PPL) / Job Work Price List (JWPL) — standing rates
```

### 01.3 Backend architecture
- One generic `PurchaseController` (`/api/v1/purchase`) + `PurchaseService` serving all 8
  document types through `DocumentFacade` (generic numbered CRUD + workflow state machine +
  audit + soft delete + approval-reference validation).
- Auxiliary services: `JobOrderReconciliationService`, `WorkflowStateMachine`,
  `DocNumberService`, `AttachmentService`, `NotificationsService`.
- Master lookups via `MasterController` (`/api/purchase-orders`, `/api/job-orders`, party
  supplier/items lookup).

### 01.4 Frontend architecture
- Two families: (a) generic `PurchaseDocScreen` driven by `purchaseDocConfigs.ts` (8 doc
  types); (b) custom `QuotationComparisonPage`, `PoSchedulePage`, `JoSchedulePage`,
  `PurchaseDashboard`.

---

## 02. PURCHASE DOCUMENT BACKBONE (SHARED ENGINE)

### 02.1 Base entity (all purchase docs)
Each header table carries the shared `BaseDoc` lifecycle columns:

| Column group | Columns |
|---|---|
| Identity | `id`, `plant_id` (default 1), `doc_no`, `status`, `doc_date`, `remarks` |
| Submission | `submitted_by`, `submitted_at` |
| Approval | `approved_by_user_id`, `approved_at` |
| Closure | `closed_by`, `closed_at` |
| Cancellation | `cancelled_by`, `cancelled_at` |
| Reopen | `reopened_by`, `reopened_at` |
| Framework | `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted`, `deleted_at`, `deleted_by`, `version` |

`@SQLRestriction("deleted = false")` ensures soft-deleted rows are never returned.

### 02.2 Generic status constants
`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`; plus `SENT`, `RELEASED`,
`POSTED`, `CLOSED` where relevant. Finance treats `{APPROVED, POSTED, RELEASED, SENT}` as
"open" statuses.

### 02.3 Generic actions (workflow state machine)
| Action | Target status | Valid from |
|---|---|---|
| `submit` | SUBMITTED | DRAFT, REJECTED |
| `approve` | APPROVED | DRAFT, SUBMITTED |
| `reject` | REJECTED | SUBMITTED, DRAFT |
| `reopen` | DRAFT | REJECTED |
| `cancel` | CANCELLED | DRAFT, SUBMITTED, APPROVED |
| `post` | POSTED | APPROVED |
| `close` | CLOSED | — |

**Approval-reference guard (BR-PUR-GUARD-1):** `purchase-order` and `job-order` approval is
blocked unless the header has a non-blank supplier/party and every line references an existing
item code. Errors: `APPROVAL_BLOCKED_MISSING_PARTY`, `APPROVAL_BLOCKED_UNKNOWN_ITEM`.
Creation in DRAFT is permissive; approval is strict.

**Required-lines guard (BR-PUR-GUARD-2):** `purchase-request`, `supplier-enquiry`,
`supplier-quotation`, `purchase-order`, `job-order` require ≥ 1 line and every line needs a
positive quantity.

**Delete guard (BR-PUR-GUARD-3):** only `DRAFT`/`REJECTED` documents may be deleted.

### 02.4 Numbering engine
Number format `{PREFIX}-{YEAR}-{SEQ}` (zero-padded). Prefix resolution order:
1. Active `numbering_config` row for the doc type (`prefix`, `separator`, `reset_per_year`,
   `fy_start_month`, `use_fy_segment`, `use_plant_segment`, `zero_pad`).
2. `DocTypes` default prefix (see §15).

---

## 03. PURCHASE REQUEST (PR)

**Screen:** `purchase-request` — generic `PurchaseDocScreen`.
**Table:** `purchase_request` / `purchase_request_line`. **Prefix:** `PR`.

### 03.1 Purpose
Internal requisition for goods/services; the first step of the procurement workflow and the
basis for enquiries and POs.

### 03.2 Header fields
| Field | Meaning | Required |
|---|---|---|
| `docNo` | Auto PR number | auto |
| `status` | DRAFT on create | auto |
| `docDate` | Document date | yes |
| `requestedBy` | Requester | no |
| `department` | Department | no |
| `priority` | NORMAL/HIGH/URGENT | no |
| `requiredBy` | Need-by date | no |
| `plantId` | Plant scope | default |
| `remarks` | Notes | no |

### 03.3 Line fields
| Field | Meaning |
|---|---|
| `itemCode` / `itemName` | Item master reference |
| `specification` | Spec text |
| `uom` | Unit of measure |
| `requestedQty` | Quantity requested |
| `requiredDate` | Required by date |
| `remarks` | Line note |

### 03.4 Workflow (WF-PUR-PR)
```
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED ──► (feeds supplier enquiry / PO)
  ▲                  │
  └──────reopen──────┘
  REJECTED ◄─────────reject─────────────┘
```
- SUPPLIER `BLOCKED` check enforced at create for PR/PO/JO (`isPurchaseDoc` + party
  BLOCKED guard).
- Dashboard KPI: `openPR` = PRs in `SUBMITTED`; `totalPR` = all PRs.

### 03.5 Business rules
- BR-PUR-PR-1: A PR must have ≥ 1 line with positive quantity to be created.
- BR-PUR-PR-2: Only DRAFT/REJECTED PRs can be edited or deleted.
- BR-PUR-PR-3: PR can only be created for non-blocked suppliers when a supplier is attached.

---

## 04. SUPPLIER ENQUIRY (SE)

**Screen:** `supplier-enquiry` — generic `PurchaseDocScreen`.
**Tables:** `supplier_enquiry` (header), `supplier_enquiry_item` (items),
`supplier_enquiry_supplier` (routing). **Prefix:** `SE`.

### 04.1 Purpose
RFQ — request pricing for PR items from multiple suppliers in a single document run.

### 04.2 Header fields
`docNo`, `status`, `docDate`, `supplier`, `supplierCode`, `contactPerson`, `phone`, `email`,
`paymentTerms`, `deliveryTerms`, `validity`, `currency`, `remarks`.

### 04.3 Item fields
`itemCode`, `itemName`, `specification`, `uom`, `qty`, `targetPrice`, `remarks`.

### 04.4 Supplier-routing fields (`supplier_enquiry_supplier`)
`supplierName`, `supplierCode`, `contactPerson`, `phone`, `email`,
`status` (`PENDING` default), `enquiryStatus` (`PENDING` default),
`emailStatus` (`SENT`/`FAILED`), `emailSentAt`.

### 04.5 Behavior rules
- BR-PUR-SE-1: Auto-fills `supplierCode`/`contactPerson`/`phone`/`email` from the party
  master when blank.
- BR-PUR-SE-2: If no supplier rows are supplied, one `SupplierEnquirySupplier` row is
  synthesized from the header, `PENDING`.
- BR-PUR-SE-3: `sendEnquiryEmail` emails each routed supplier; sets header `SENT` if any
  recipient succeeded; per-supplier `emailStatus`/`emailSentAt` tracked.
- BR-PUR-SE-4: Approval of quotations writing price history is the SQ concern, not SE.

### 04.6 Workflow (WF-PUR-SE)
```
DRAFT ──► SUBMITTED ──► APPROVED ──► SENT (email dispatch sets SENT)
                     (approve)      (released for supplier response)
```

---

## 05. SUPPLIER QUOTATION (SQ)

**Screen:** `supplier-quotation` — generic `PurchaseDocScreen`.
**Tables:** `supplier_quotation` / `supplier_quotation_item`. **Prefix:** `SQ`.

### 05.1 Header fields
`docNo`, `status`, `docDate`, `supplier`, `supplierCode`, `contactPerson`, `email`,
`enquiryRef`/`enquiryNo`, `currency`, `paymentTerms`, `deliveryTerms`, `validity`, `remarks`.

### 05.2 Item fields
`itemCode`, `itemName`, `uom`, `qty`, `unitPrice`, `discount`, `tax`, `netAmount`,
`deliveryDate`, `validity`.

### 05.3 Business rules
- BR-PUR-SQ-1: **Price history hook (BR-PUR-SQ-PRICE):** on `approve`, a
  `PurchasePriceHistory` row is written per line — supplier, itemCode, `previousPrice`
  (latest prior price for supplier+item), `newPrice` = unitPrice, `effectiveDate` = docDate,
  `changedBy`/`approvedBy` = acting user, `changeReason` = "Approved quotation <docNo>".
- BR-PUR-SQ-2: SQ is the source document for Quotation Comparison and PO conversion.

### 05.4 Workflow (WF-PUR-SQ)
```
DRAFT ──► SUBMITTED ──► APPROVED  (writes purchase price history)
                       ◄── REJECTED / CANCELLED (abort paths)
```

---

## 06. QUOTATION COMPARISON

**Screen:** `quotation-comparison` — custom `QuotationComparisonPage.tsx`.

### 06.1 Purpose
Frontend analysis workspace building a cost matrix across selected supplier quotations and
converting the winning quotation(s) into Purchase Orders.

### 06.2 Behavior
- FR-PUR-QC-1: User multi-selects SQ documents (`'qc.selectedIds'` persisted in storage).
- FR-PUR-QC-2: Per-line unit-price + total comparison matrix per supplier is rendered.
- FR-PUR-QC-3: User selects winning quote → page creates a `purchase-order` via the generic
  purchase API.
- **Note:** there is **no** comparison entity/table — analysis is transient.

### 06.3 Workflow (WF-PUR-QC)
```
Supplier Quotations (list) → select rows → compare matrix → pick winner → create Purchase Order
```

---

## 07. PURCHASE ORDER (PO)

**Screen:** `purchase-order` — generic `PurchaseDocScreen`.
**Tables:** `purchase_order`, `purchase_order_item`, `purchase_order_schedule`. **Prefix:** `PO`.

### 07.1 Purpose
The legally-relevant buy document; drives goods receipt (PO Inward → GRN → Invoice) and
schedule tracking.

### 07.2 Header fields
`docNo`, `status`, `docDate`, `supplier`, `supplierCode`, `contactPerson`, `phone`, `email`,
`department`, `currency`, `paymentTerms`, `deliveryTerms`, `expectedDeliveryDate`, `priority`
(`NORMAL`/`HIGH`/`URGENT`), `plantId`, `remarks`.

### 07.3 Item fields
`itemCode`, `itemName`, `specification`, `uom`, `orderQty`, `unitPrice`, `discount`, `tax`,
`netAmount`, `requiredDate`, `expectedDeliveryDate`.

### 07.4 Creation defaults
- BR-PUR-PO-1: Supplier/contact fields pre-filled from party master.
- BR-PUR-PO-2: Defaults `orderQty=0`, `unitPrice=0`, `discount=0`, `tax=0`; computes
  `netAmount = orderQty × unitPrice − discount`.

### 07.5 Business rules
- BR-PUR-PO-3: PO requires ≥ 1 line, positive quantity.
- BR-PUR-PO-4: Approval blocked without a valid supplier and valid item lines (guard-1).
- BR-PUR-PO-5: `sendPoEmail` generates PDF and dispatches to supplier email; success sets
  `RELEASED`; failure sets `emailStatus=FAILED` + `emailError`.
- BR-PUR-PO-6: `APPROVED`, `POSTED`, `RELEASED` POs count as "open" for finance.
- BR-PUR-PO-7: Dashboard `partiallyReceived` / `delayedPO` derive from POSTED POs against
  POSTED po-inwards; `openPO` = APPROVED; `openPOValue` = sum netAmount of
  APPROVED/POSTED/RELEASED POs.
- BR-PUR-PO-8: PO number is matched by `po-inward.purchaseOrderNo` (string join).

### 07.6 Workflow (WF-PUR-PO)
```
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED ──email success──► RELEASED
 │                  │                        │
 └──cancel──► CANCELLED        └──────► PO Inward (stock IN, GRN, IQC auto-create)
                                 └──────► Purchase Invoice (finance spend)
```

---

## 08. PO SCHEDULE

**Screen:** `po-schedule` — custom `PoSchedulePage`. **Table:** `purchase_order_schedule`.

### 08.1 Fields
`itemCode`, `scheduledQty`, `receivedQty`, `pendingQty`, `dueDate`, `status`, `doc_id` (FK to PO).

### 08.2 Behavior
- FR-PUR-POS-1: Track receipt progress per PO line.
- FR-PUR-POS-2: `receivedQty` is filled as po-inward (GRN) posts receipts.
- FR-PUR-POS-3: `pendingQty = scheduledQty − receivedQty`.

---

## 09. JOB ORDER (JO) — SUBCONTRACTING

**Screen:** `job-order` — generic `PurchaseDocScreen`.
**Tables:** `job_order`, `job_order_item`, `job_order_schedule`, `job_order_material_issue`.
**Prefix:** `JO`.

### 09.1 Purpose
Send work (raw material + operations) to a subcontractor; track sent → received → accepted/
rejected.

### 09.2 Header fields
`docNo`, `status`, `docDate`, `supplier` (subcontractor), `supplierCode`, `contactPerson`,
`phone`, `email`, `process`/`processName`, `department`, `currency`, `paymentTerms`,
`deliveryTerms`, `expectedDeliveryDate`/`plannedReturnDate`, `priority`, `plantId`, `remarks`.

### 09.3 Item fields
`itemCode`, `itemName`, `uom`, `orderQty`, `inputQty`/`rawMaterialQty`, `unitPrice`,
`discount`, `tax`, `netAmount`, `requiredDate`; material issues recorded per line
(`JobOrderMaterialIssue`: item + `issueQty`).

### 09.4 Business rules
- BR-PUR-JO-1: Same approval-reference guard as PO (supplier + valid items).
- BR-PUR-JO-2: `sendJoEmail` → RELEASED on success.
- BR-PUR-JO-3: Dashboard `openJobOrders` = SUBMITTED; `overdueJobOrders` = APPROVED vs
  `expectedDeliveryDate`.

### 09.5 Job Order Reconciliation (BR-PUR-JO-REC)
Endpoint `GET /job-orders/{id}/reconciliation` returns per line:
- `sent` — from `JoDcLine.linkedDocumentNo` + `JoDcIssueLine.jobOrderNo`;
- `received` — from `JoInwardLine.producedQty` + `LoInwardLine.receivedQty`;
- `accepted`/`rejected` — from matched `QualityInspection` records (by jobOrderNumber/
  labourOrderNumber/joInwardNumber/sourceNumber), else from JoInward/LoInward line
  accepted/rejected qty;
- source counts: deliveryChallans (JoDc), dcIssues (JoDcIssue), joInwards, loInwards,
  inspectionsMatched.

### 09.6 Workflow (WF-PUR-JO)
```
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED ──email success──► RELEASED
   │                                       │
   └──cancel──► CANCELLED                  └──► JO DC Issue (material sent, stock OUT)
                                                 └─► JO Inward / LO Inward (stock IN)
                                                        └─► JO Reconciliation (accepted/rejected)
```

---

## 10. JO SCHEDULE

**Screen:** `jo-schedule` — custom `JoSchedulePage`. **Table:** `job_order_schedule`.

### 10.1 Fields
`itemCode`, `process`, `scheduledQty`, `receivedQty`, `rejectedQty`, `pendingQty`, `issueDate`,
`expectedReturnDate`, `scheduleNumber`, `status`, `doc_id`.

### 10.2 Behavior
- `receivedQty`/`rejectedQty` fill from JO/LO inward + inspection results.
- `pendingQty` = scheduled − (received + rejected).

---

## 11. PURCHASE TARGET

**Screen:** `purchase-target` — generic `PurchaseDocScreen`. **Table:** `purchase_target`.
**Prefix:** `PT`.

### 11.1 Fields
`docNo`, `status`, `docDate`, `department`, `category`, `targetType` (monthly/quarterly),
`currency`, `remarks`; `targetAmount`, `achievedAmount`, `periodFrom`, `periodTo`.

### 11.2 Rules
- BR-PUR-PT-1: Generic DRAFT→SUBMITTED→APPROVED lifecycle; no email dispatch, no price
  history hook.

---

## 12. PURCHASE PRICE LIST (PPL)

**Screen:** `purchase-price-list` — generic `PurchaseDocScreen`.
**Table:** `purchase_price_list` (+ `purchase_price_history`).
**Prefix:** `PPL`.

### 12.1 Fields
`docNo`, `status`, `docDate`, `supplier`, `supplierCode`, `currency`, `effectiveFrom`,
`effectiveTo`, `rateBasis`, `remarks`; lines: `itemCode`, `itemName`, `uom`, `unitPrice`,
`discount`, `tax`, `netAmount`.

### 12.2 Business rules
- BR-PUR-PPL-1: Defaults `revisionNumber=1`, `approvalStatus=DRAFT`.
- BR-PUR-PPL-2: On `approve` sets `approvalStatus=APPROVED` and writes `PurchasePriceHistory`
  (previousPrice from latest record, newPrice = unitPrice, effectiveDate = `effectiveFrom`,
  changeReason = "Approved price list <docNo>").

---

## 13. JOB WORK PRICE LIST (JWPL)

**Screen:** `job-work-price-list` — generic `PurchaseDocScreen`.
**Table:** `job_work_price_list` (+ `job_work_price_history`). **Prefix:** `JWPL`.

### 13.1 Fields
`docNo`, `status`, `docDate`, `supplier`, `currency`, `process`, `effectiveFrom`, `effectiveTo`,
`rateBasis`, `remarks`; lines: `process`, `itemCode`/`operation`, `uom`, `rate`, `discount`,
`tax`, `netAmount`.

### 13.2 Business rules
- BR-PUR-JWPL-1: Defaults `revisionNumber=1`, `approvalStatus=DRAFT`.
- BR-PUR-JWPL-2: On `approve` sets `approvalStatus=APPROVED` and writes
  `JobWorkPriceHistory` (newRate = rate; `previousRate` currently null — see gaps).

---

## 14. PURCHASE DASHBOARD

**Screen:** `purchase-dashboard` — custom `PurchaseDashboard.tsx`. **API:** `GET /api/v1/purchase/dashboard`.

### 14.1 KPIs
| KPI | Derivation (status) |
|---|---|
| `openPR` | PR SUBMITTED |
| `openEnquiries` | SE SUBMITTED |
| `pendingQuotations` | SQ SUBMITTED |
| `openPO` | PO APPROVED |
| `pendingPOApproval` | PO SUBMITTED |
| `partiallyReceived` | POSTED POs with any line received < qty |
| `delayedPO` | POSTED/APPROVED POs past `expectedDeliveryDate` |
| `openJobOrders` | JO SUBMITTED |
| `overdueJobOrders` | JO APPROVED |
| `totalPR` / `totalPO` / `totalJO` | totals |

### 14.2 Finance summary
`committedSpend` (netAmount of open POs), `openPOValue` (APPROVED+POSTED+RELEASED),
`receivedValue` (POSTED po-inward rate×receivedQty), `invoicedSpend`/`invoiceCount`
(APPROVED/POSTED `PurchaseInvoice.totalAmount`), `unInvoicedValue` (committed − invoiced,
min 0); breakdowns `spendBySupplier`, `spendByItem`, `spendByDepartment`, `monthlySpend`;
plus `recentActivity` audit feed.

---

## 15. NUMBERING (NUM-PUR)

| Document | Prefix | Scheme |
|---|---|---|
| Purchase Request | `PR` | `{PREFIX}-{YEAR}-{SEQ}` |
| Supplier Enquiry | `SE` | same |
| Supplier Quotation | `SQ` | same |
| Purchase Order | `PO` | same |
| Job Order | `JO` | same |
| Purchase Target | `PT` | same |
| Purchase Price List | `PPL` | same |
| Job Work Price List | `JWPL` | same |

- `DocNumberService` supports `FY segment + plant segment + sequence`, zero-padded, with
  per-type config from `numbering_config` (admin screen `numbering-config`).
- Preview endpoint `GET /{type}/next-number`.

---

## 16. WORKFLOW AND STATUS LIFECYCLE (WF-PUR)

### 16.1 Master lifecycle (all purchase docs)
```
                 ┌───────────────┐
                 ▼               │
DRAFT ──submit▶ SUBMITTED ──approve▶ APPROVED ──post▶ POSTED ──close▶ CLOSED
  │ ▲             │  │                          
  │ │reopen       │  └──reject──▶ REJECTED ──reopen──▶ DRAFT
  │ │             └─────► cancel/cancel◄──────────────┘
  └─delete (soft)  (DRAFT, SUBMITTED, APPROVED) ──▶ CANCELLED
```
- RELEASED is email-driven only for PO/JO/SQ (not a workflow action).
- SENT is email-driven only for SE.

### 16.2 Workflow diagram (end-to-end procurement)
```
┌────────────┐   ┌────────────┐   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│ PURCHASE   │──▶│ SUPPLIER   │──▶│  SUPPLIER   │──▶│  QUOTATION   │──▶│ PURCHASE     │
│ REQUEST PR │   │ ENQUIRY SE │   │ QUOTATION SQ│   │ COMPARISON   │   │ ORDER PO     │
└────────────┘   └────────────┘   └─────────────┘   └──────────────┘   └──────┬───────┘
                                                                              │
                          ┌────────────────────────────────────────────────────┤
                          ▼                                                    ▼
              ┌───────────────────────┐                        ┌───────────────────────────┐
              │  PO INWARD (GRN)      │◄───────────────────────│  PO SCHEDULE (tracking)   │
              │  Inventory module     │                        └───────────────────────────┘
              │  └ auto-create IQC    │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐          ┌───────────────────────────┐
              │  PURCHASE INVOICE     │          │  FINANCE: committed spend │
              └───────────────────────┘          └───────────────────────────┘

┌──────────────┐    ┌──────────────────┐    ┌───────────────┐    ┌──────────────────┐
│ JOB ORDER JO │───▶│ JO DC ISSUE      │───▶│ JO INWARD /   │───▶│ JO RECONCILIATION│
│ (subcontract)│    │ (stock OUT)      │    │ LO INWARD     │    │ (accept/reject)  │
└──────────────┘    └──────────────────┘    └───────────────┘    └──────────────────┘
```

---

## 17. BUSINESS RULES (BR-PUR)

| ID | Rule |
|---|---|
| BR-PUR-GUARD-1 | Approval of PO/JO blocked unless supplier present and all item lines exist. |
| BR-PUR-GUARD-2 | PR/SE/SQ/PO/JO require ≥ 1 line with positive qty to create. |
| BR-PUR-GUARD-3 | Only DRAFT/REJECTED docs editable/deletable. |
| BR-PUR-REL-1 | PO/JO RELEASED only via successful email dispatch; failure → `emailStatus=FAILED` + notification `DOC_SEND_FAILED`. |
| BR-PUR-SUP-1 | Blocked-supplier guard (party `approvalStatus=BLOCKED`) blocks purchase doc creation. |
| BR-PUR-PRICE-1 | SQ/PO/PPL approval writes `purchase_price_history`. |
| BR-PUR-JW-PRICE-1 | JWPL approval writes `job_work_price_history`. |
| BR-PUR-BACKDATE-1 | Doc date > 2h in past → `BACKDATED_ENTRY` exception (global guard). |
| BR-PUR-NUM-1 | Number generated at create; must be unique per doc type + year. |

---

## 18. ROLES AND PERMISSIONS

| Role | Capabilities |
|---|---|
| PURCHASE_EXECUTIVE | VIEW/CREATE/EDIT/PRINT/EXPORT over MASTER + PURCHASE + INVENTORY. |
| PURCHASE_MANAGER | Adds APPROVE/REJECT (price + PO approval authority). |

Module permissions: `PURCHASE_REQUEST`, `SUPPLIER_ENQUIRY`, `SUPPLIER_QUOTATION`,
`PURCHASE_ORDER`, `PURCHASE_SCHEDULE`, `JOB_ORDER`, `JOB_ORDER_SCHEDULE`,
`PURCHASE_TARGET`, `PURCHASE_PRICE_LIST`, `JOB_WORK_PRICE_LIST`, `PURCHASE_INVOICE`,
`SUBCONTRACT_INVOICE`.

---

## 19. AUDIT AND TRACEABILITY

- `AuditEntityListener` records actor/action for every document lifecycle event.
- `recentActivity` dashboard feed (audit).
- `NotificationsService` sends `DOC_SENT` / `DOC_SEND_FAILED` events.
- Export/print: `GET /{type}/export` (xlsx/pdf), `GET /{type}/{id}/print` (pdf inline/download).

---

## 20. DATABASE IMPACT SUMMARY

| Table | Notes |
|---|---|
| `purchase_request(_line)` | PR |
| `supplier_enquiry(_item,_supplier)` | SE |
| `supplier_quotation(_item)` | SQ |
| `purchase_order(_item,_schedule)` | PO + schedule |
| `job_order(_item,_schedule,_material_issue)` | JO |
| `purchase_target` | Target |
| `purchase_price_list` / `purchase_price_history` | PPL + history |
| `job_work_price_list` / `job_work_price_history` | JWPL + history |
| `doc_sequence`, `numbering_config` | Numbering engine |
| `attachment` (supplier invoices) | Attachments |

---

## 21. API IMPACT SUMMARY (`/api/v1/purchase`)

| Endpoint | Purpose |
|---|---|
| `GET|POST /{type}` | List / create |
| `GET|PUT|DELETE /{type}/{id}` | Read / update / soft-delete |
| `POST /{type}/{id}/actions/{action}` | Workflow action (submit/approve/reject/reopen/cancel/post/close) |
| `GET /{type}/next-number` | Number preview |
| `GET /{type}/export`, `GET /{type}/{id}/print` | Export / print |
| `POST /supplier-enquiry/{id}/send-email` | Enquiry dispatch |
| `POST /purchase-order/{id}/send-email` | PO dispatch |
| `POST /job-order/{id}/send-email` | JO dispatch |
| `GET /job-orders/{id}/reconciliation` | JO reconciliation |
| `GET /dashboard` | Dashboard KPIs |
| `GET /api/purchase-orders?status=` / `/api/job-orders` | Ref-doc lookups |

---

## 22. OPEN GAPS AND KNOWN LIMITATIONS

1. **Quotation Comparison is frontend-only** — no persisted comparison document.
2. **All PO/JO ↔ inward/DC links are string doc-number joins, not FKs**; DRAFT/CANCELLED
   source statuses are not filtered in reconciliation.
3. **`job_work_price_history.previous_rate` is always null.**
4. **JO reconciliation** does not net rework re-sends; acceptance falls back to inward-line
   quantities when no inspection exists.
5. **RELEASED is email-driven only** (not a workflow engine action).
6. Purchase `numbering_config` rows are not seeded in migrations (defaults from `DocTypes`).

---

*End of DOCUMENT 01 — Purchase Module FRS.*