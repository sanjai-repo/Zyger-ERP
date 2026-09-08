# ZYGER ERP — QUALITY MODULE
# DOCUMENT 03 — COMPLETE QUALITY MODULE FRS (FUNCTIONAL REQUIREMENTS SPECIFICATION + WORKFLOWS)

| | |
|---|---|
| Project | Zyger ERP |
| Module | Quality |
| Document | DOCUMENT 03 — Complete Quality Module Functional Requirements Specification |
| Status | FRS — module-level |
| Version | 1.0 |

**How to read this document.** Module-level FRS for Quality. Defines functional requirements
(FR-QLT-*), business rules (BR-QLT-*), workflows (WF-QLT-*), numbering (NUM-QLT-*), inspection
judgment model, SPC analytics, and cross-module integration. All identifiers/statuses match
the implemented system.

---

## TABLE OF CONTENTS

01. Module Overview and Architecture
02. Inspection Types and Screens
03. Inspection Header & Characteristic Model
04. Sampling and Inspection Plans
05. Inspection Judgment, Decision and Disposition
06. NCR
07. Concession
08. Customer Complaint
09. CAPA
10. 8D Report
11. Test Certificates (Inward / Internal / Outward)
12. Calibration
13. SPC Analytics
14. Traceability and Supplier Scorecard
15. Dashboard and Pending Work Queue
16. Numbering (NUM-QLT)
17. Workflows (WF-QLT)
18. Business Rules (BR-QLT)
19. Roles and Permissions
20. Audit, Attachments and Printing
21. Database Impact Summary
22. API Impact Summary
23. Open Gaps and Known Limitations

---

## 01. MODULE OVERVIEW AND ARCHITECTURE

### 01.1 Founding principle
Quality is built around a **normalized inspection event model** plus a set of linked quality
documents (NCR, Concession, Complaint, CAPA, 8D, Test Certificates, Calibration). Every
measured characteristic is recorded as a persistent fact (for SPC), and every FAIL path
requires a disposition (NCR/MRB) before closure. Inspection results directly gate inventory
(qc_hold release/dispose), production (quality gate), and dispatch (Final Inspection gate).

### 01.2 Inspection event model
```
Incoming source (inward/PO/LO/JO, production lot, sales)
  └─► QualityInspection (header: type, source refs, item, quantities, decision)
        ├─► Characteristic lines (balloon, spec limits, UoM, actual, result)
        ├─► Inspection plans / sampling plans (auto-load / AQL)
        ├─► Measurement facts → SPC (quality_characteristic_measurement)
        ├─► Status history (append-only)
        ├─► FAIL → NCR (+ QualityDisposition MRB)
        ├─► PASS → release stock (or CoC auto-generation for OQC)
        └─► REWORK disposition → child re-inspection
```

### 01.3 Inspection types (enum)
`IQC`, `LO`, `JOMIN`, `FAI`, `IPQC`, `LINE`, `LAST_OFF`, `FINAL`.

---

## 02. INSPECTION TYPES AND SCREENS

| Screen ID | Type | Purpose |
|---|---|---|
| `inward-inspection-iqc` | IQC | Incoming material inspection |
| `lo-inspection` | LO | Labour/Lot order inspection |
| `jomin-inspection` | JOMIN | Jominy (hardness) inspection |
| `process-inspection-ipqc` | IPQC | In-process inspection |
| `first-inspection` | FAI | First-article inspection |
| `line-inspection` | LINE | Line stage inspection |
| `last-off-inspection` | LAST_OFF | Last-off piece inspection |
| `final-inspection` | FINAL | Final (OQC) inspection |
| `inspection-pending` | — | Pending job queue |

Characteristic templates per type (auto-loadable):
- **IQC (7):** RM_DIM_OD, RM_DIM_LEN, MAT_GRADE, MTC_COC, HEAT_NO, SURFACE_RUST, HARDNESS
- **FAI (8):** FAI_DIM_1..3, FAI_PROFILE, FAI_SURFACE, FAI_HARDNESS, FAI_VISUAL, FAI_COC
- **IPQC (4):** IPQC_DIM_1, IPQC_DIM_2, IPQC_SURFACE, IPQC_VISUAL
- **LINE (3):** LINE_DIM_1, LINE_DIM_2, LINE_VISUAL
- **LAST_OFF (4):** LO_DIM_1, LO_DIM_2, LO_SURFACE, LO_VISUAL
- **LO (2):** LO_RECV_QTY, LO_VISUAL
- **JOMIN (3):** JOMIN_DIM_1, JOMIN_VISUAL, JOMIN_COC
- **FINAL (6):** FINAL_DIM_1..3, FINAL_SURFACE, FINAL_VISUAL, FINAL_COC

---

## 03. INSPECTION HEADER & CHARACTERISTIC MODEL

### 03.1 Header fields
`inspectionType`, `referenceDocNo`, `purchaseOrderNumber`, `partyCode`, `partyName`,
`supplierChallanNo`, `materialGrade`, `mtcVerified` (bool), `mtcNumber`, `ndtStatus`
(`NA`/`PASS`/`FAIL`/`PENDING`), `itemCode`, `itemDescription`, `receivedQuantity`,
`inspectionQuantity`, `acceptedQuantity`, `rejectedQuantity`, `reworkQuantity`, `holdQuantity`,
`lotNumber`, `batchNumber`, `serialNumber`, `heatNumber`, `machine`, `operation`,
`programNumber`, `setupNumber`, `drawingNumber`, `drawingRevision`, `inspector`, `remarks`.

Read model additionally exposes: `docNo`, `inspectionNumber`, `inspectionDate`, `itemName`,
`sourceType`, `sourceNumber`, `ho`, `assignedInspector`, `status`, `finalDecision`,
`approvedBy`, `approvedAt`, `approvedByCustomer`, `customerApprovalReceived`,
`customerApprovalEvidence`, `requireCustomerApproval`, `hasCriticalCharacteristic`,
`hasSpecialCharacteristic`, `concessionQuantity`, `returnQuantity`, `scrapQuantity`,
`totalAmount`, `referenceId/Number/Type`, `_allowedTransitions`, `_isTerminal`,
`createdAt/By`, `updatedAt`, `closedAt`, `cancellationReason/Date`, `reopenedAt`.

### 03.2 Characteristic line fields
`balloonNo`, `characteristicCode`, `characteristicName`, `nominalValue`, `lowerLimit`,
`upperLimit`, `tolerance`, `actualValue`, `actualText`, `result`, `deviation`
(auto: actual − nominal), `calibrationStatus`, `isCritical`, `isMandatory`, `isSpecial`,
`qty`, `uom`, `instrumentCode`, `remarks`.

- BR-QLT-CHAR-1: Auto-evaluation: PASS iff `lowerLimit ≤ actualValue ≤ upperLimit`; text
  characteristics match specText or `PASS`/`OK`; no-limit lines → `PENDING_REVIEW`;
  out-of-tolerance flags the line.

---

## 04. SAMPLING AND INSPECTION PLANS

### 04.1 Sampling plans (AQL)
`sampling_plan_master` fields: `standard`, `inspection_level`, `lot_size_min`, `lot_size_max`,
`aql`, `sample_size`, `accept_number`, `reject_number`.

- BR-QLT-SAM-1: `applySamplingPlan` resolves by lot-size band + AQL (ANSI Z1.4 / ISO 2859-1);
  sets `samplingStandard`, `aql`, `acceptNumber`, `rejectNumber`, `lotSize`; auto-fills
  `sampleSize` and default `inspectionQuantity`.

### 04.2 Inspection plans
`inspection_plan` + `inspection_plan_characteristic` (PUBLISHED status, revisioned).

- BR-QLT-PLAN-1: `autoLoadInspectionPlan` loads the highest-revision PUBLISHED plan for
  plant_id=1, item+type when no lines exist; copies characteristics into lines; sets
  `inspectionPlanId`, `inspectionPlanRevision`.

---

## 05. INSPECTION JUDGMENT, DECISION AND DISPOSITION

### 05.1 Status machine
`InspectionStatus`: `DRAFT | PENDING | IN_PROGRESS | SUBMITTED | PASS | HOLD | FAIL |
APPROVED | CLOSED | CANCELLED`
`DecisionStatus`: `PENDING | PASS | FAIL | HOLD` (initial `NONE`)
`MeasurementResult`: `PASS | FAIL | PENDING | NA` (+ engine output `PENDING_REVIEW`)

### 05.2 Allowed transitions
| Action | From | To | Notes |
|---|---|---|---|
| `start` | DRAFT/PENDING/REJECTED | IN_PROGRESS | assigns inspector, timestamps |
| `submit` | IN_PROGRESS/DRAFT | SUBMITTED | blocked if mandatory lines PENDING; validates quantities |
| `decide` | SUBMITTED | PASS / HOLD / FAIL | FAIL auto-creates NCR; critical fail forces HOLD |
| `hold` / `release-hold` | SUBMITTED/IN_PROGRESS / HOLD | HOLD / SUBMITTED | |
| `approve` | SUBMITTED/PASS/IN_PROGRESS (pass path) or FAIL (fail path) | APPROVED | fail path requires MRB disposition or MINOR/LOW acceptance reason |
| `close` | SUBMITTED/PASS/HOLD/APPROVED (pass) / FAIL (fail) | CLOSED | fail path requires NCR/disposition |
| `cancel` | DRAFT/SUBMITTED | CANCELLED | records cancellationReason |
| `reopen` | CLOSED | IN_PROGRESS | clears closedAt, isLocked=false |

### 05.3 Dispositions (MRB)
`USE_AS_IS`, `REWORK`, `RTV`, `SCRAP`, `QUARANTINE`. Only valid on FAIL/REJECTED;
reason mandatory. `REWORK` spawns a child DRAFT inspection (`parentInspectionId`);
`RTV` auto-creates a SCAR; `RTV` only for IQC.

### 05.4 Stock integration
- BR-QLT-APP-1: **approve** triggers `QualityInspectionApprovedEvent`:
  - PASS/RELEASE → `releaseQcHoldForItem` (stock → FREE);
  - FAIL/DISPOSE → map disposition to `REJECTED`/`SCRAP`/`QUARANTINE` → `disposeHeldForItem`.
  - Idempotency via `stockSyncStatus` (`PENDING/SYNCED/SYNC_ERROR`) + `stockSyncKey`.
- BR-QLT-PASS-1: Create with `directInventoryUpdate=true` or status PASS/PASSED/APPROVED
  immediately posts accepted qty to inventory (`recordStockIn`, FREE, tx `QC_INSPECTION_PASS`).
- BR-QLT-NCR-1: FAIL decision auto-creates an NCR (severity MAJOR default; CRITICAL if a
  critical line failed) with status `MRB_DISPOSITION` + a PENDING `QualityDisposition`.
- BR-QLT-CLOSE-1: Close is blocked on failure without NCR/disposition.
- BR-QLT-MINOR-1: Approve of a MINOR/LOW failure requires `minorAcceptanceReason`; NCR set
  to `MINOR_ACCEPTED`.
- BR-QLT-QNT-1: `inspectionQuantity ≤ receivedQuantity`; sum of accepted+rejected+hold+
  rework+scrap+return+concession ≤ inspected quantity.

### 05.5 Workflow (WF-QLT-INSPECTION)
```
DRAFT ──start──► IN_PROGRESS ──submit──► SUBMITTED ──decide──► PASS ──approve──► APPROVED ──close──► CLOSED
    │                │                        │                └──► release stock (FREE) / CoC
    │                └──── hold ──► HOLD ──────┘
    │                       └ release-hold → SUBMITTED
    │                        decide=FAIL ──► FAIL ──► NCR (MRB) ──disposition──► APPROVED ──► dispose stock
    │                                        └ rework ──► child re-inspection
    └──cancel──► CANCELLED          reopen ◄── CLOSED
```

---

## 06. NCR

**Screen:** `quality-ncr`. **Prefix:** `NCR`. Table `quality_ncr(_line)`.

Fields: `referenceDocNo`, `inspectionId`, `itemCode`*, `itemDescription`, `machine`,
`operation`, `machineOperator`, `partyCode`, `partyName`, `quantityAffected`*,
`financialImpact`, `uom`, `defectCode`*, `severity`* (`CRITICAL/MAJOR/MINOR/ADVISORY`),
`reportedBy`, `targetCompletionDate`, `defectDescription`, `immediateAction`,
`rootCauseCategory` (5M1E: `MAN/MACHINE/MATERIAL/METHOD/MEASUREMENT/ENVIRONMENT`),
`rootCause`, `dispositionType` (`REWORK/SCRAP/RETURN/CONCESSION/CONTAINMENT`), `remarks`.

Statuses (document + engine): `DRAFT / SUBMITTED / APPROVED / REJECTED / CANCELLED /
MRB_DISPOSITION / MRB_RESOLVED / MINOR_ACCEPTED / PENDING`.

---

## 07. CONCESSION

**Screen:** `concession-entry`. **Prefix:** `CON`. Table `quality_concession`.

Fields: `inspectionId`, `ncrId`, `concessionType` (`INTERNAL_DEVIATION`/`CUSTOMER_CONCESSION`/
`SUPPLIER_CONCESSION`), `itemCode`*, `itemDescription`, `machine`, `operation`, `partyCode`,
`partyName`, `drawingNumber`, `drawingRevision`, `deviatedDimension`, `deviationValue`,
`batchNumber`, `serialNumber`, `heatNumber`, `quantityCovered`*, `uom`, `deviationDescription`,
`deviationReason`, `riskAssessment`, `customerApprovalRequired`, `customerApprovalReceived`,
`customerApprovalEvidence`, `approvalAuthority`, `validFrom`, `validTo`.

---

## 08. CUSTOMER COMPLAINT

**Screen:** `customer-complaint`. **Prefix:** `CC`. Table `quality_customer_complaint`.
Statuses: `OPEN | UNDER_REVIEW | INVESTIGATION | ACTION_PLANNED | ACTION_IMPLEMENTED |
RESPONSE_SENT | CLOSED | REOPENED`. Service maps: submit→UNDER_REVIEW; approve→CLOSED;
reject→REOPENED; cancel→CLOSED.

Fields: `customerCode`*, `customerName`, `complaintDate`, `targetClosureDate`,
`actualClosureDate`, `customerPo`, `salesOrderNumber`, `dispatchReference`, `invoiceNumber`,
`rmaNumber`, `itemCode`, `itemDescription`, `customerPartNumber`, `drawingNumber`,
`batchNumber`, `serialNumber`, `quantityComplained`, `financialImpact`, `uom`, `complaintType`
(12 options incl. "Dimensional rejection"…"Other"), `severity` (`CRITICAL/MAJOR/MINOR`),
`receivedChannel`, `responsiblePerson`, `initialResponseDate`, `complaintDescription`,
`containmentAction`, `rootCause`, `correctiveAction`, `customerResponse`.

### 08.1 Workflow (WF-QLT-COMPLAINT)
```
OPEN ──submit──► UNDER_REVIEW ──► INVESTIGATION ──► ACTION_PLANNED ──► ACTION_IMPLEMENTED
   ──► RESPONSE_SENT ──approve──► CLOSED        (reject → REOPENED, cancel → CLOSED)
```

---

## 09. CAPA

**Screen:** `capa`. **Prefix:** `CAP`. Table `quality_capa`.
Statuses: `OPEN | IN_PROGRESS | ACTION_COMPLETED | VERIFICATION | CLOSED | OVERDUE`;
submit→IN_PROGRESS; approve→CLOSED.

Fields: `sourceType`* (`CUSTOMER_COMPLAINT`/`INTERNAL_REJECTION`/`INSPECTION_FAILURE`/
`SUPPLIER_REJECTION`/`AUDIT`/`REPEATED_DEFECT`), `sourceReference`, `complaintId`,
`inspectionId`, `ncrId`, `itemCode`, `partyName`, `riskLevel` (`HIGH/MEDIUM/LOW`),
`responsiblePerson`, `verificationBy`, `dueDate`, `completionDate`, `problemDescription`,
`rootCause`, `correctiveAction`, `preventiveAction`, `effectivenessResult`,
`effectivenessDate`, `evidence`.

---

## 10. 8D REPORT

**Screen:** `eight-d-report`. **Prefix:** `8D`. Table `quality_8d` + `quality_8d_discipline`.
Statuses: `OPEN | IN_PROGRESS | CLOSED`; approve auto-sets `reportStatus=CLOSED`.

Fields: `sourceType`* (`CUSTOMER_COMPLAINT`/`SUPPLIER_PROBLEM`/`INTERNAL_DEFECT`/
`REPEATED_ISSUE`/`MAJOR_FAILURE`), `sourceReference`, `complaintId`, `ncrId`, `capaId`,
`customerCode`, `customerName`, `itemCode`, `itemDescription`, `batchNumber`,
`quantityAffected`, `teamLead`, `teamMembers`, `targetCloseDate`, `actualCloseDate`,
`problemStatement`. Discipline lines D1–D8 (`D1 Team Formation`…`D8 Closure`) with
`disciplineCode`, `disciplineName`, `description`, `responsiblePerson`, `dueDate`,
`completionDate`, `status` (`PENDING/IN_PROGRESS/COMPLETED/VERIFIED`).

---

## 11. TEST CERTIFICATES

**Screen:** `inward-test-certificate` (INWARD), `internal-test-certificate` (INTERNAL),
`outward-test-certificate` (OUTWARD). **Prefix:** `ITC` (type-specific). Table
`quality_test_certificate(_line)`.

Header fields: `certificateType`* (`INWARD/INTERNAL/OUTWARD`), `certificateDate`*, `testType`,
`partyCode`, `partyName`, `purchaseOrderNumber`, `inwardNumber`, `grnNumber`,
`jobOrderNumber`, `salesOrderNumber`, `dcNumber`, `invoiceNumber`, `inspectionId`, `itemCode`*,
`itemDescription`, `customerPartNumber`, `drawingNumber`, `drawingRevision`, `batchNumber`,
`lotNumber`, `heatNumber`, `testedQuantity`, `passedQuantity`, `uom`, `testedBy`, `approvedBy`,
`specificationReference`.

Line (chemical/mechanical) parameters (seeded): `Carbon (%C)`, `Manganese (%Mn)`, `Silicon
(%Si)`, `Chromium (%Cr)`, `Nickel (%Ni)`, `Hardness (HRC/BHN)`, `Tensile Strength (UTS)`,
`Yield Strength` with `parameterName`*, `specification`, `nominalValue`, `resultValue`, `uom`,
`instrumentCode`, `result`.

- BR-QLT-COC-1: Approving a FINAL/LAST_OFF/LINE inspection auto-generates an OUTWARD test
  certificate from the inspection lines.

---

## 12. CALIBRATION

**Screen:** `calibration` (instrument master) + `calibration-record` (records) (also reused by
Maintenance module: `calibration-schedule`, `calibration-entry`). Table
`quality_calibration_instrument` + `quality_calibration_record`.

Instrument fields: `instrumentCode`*, `instrumentName`, `calibrationNumber`,
`calibrationDate`*, `calibrationFrequencyMonths`, `calibrationType`
(`INTERNAL/EXTERNAL/NABL`), `externalAgency`, `certificateNumber`, `location`,
`calibrationPerformedBy`, `approvedBy`, `result`* (`PASS/FAIL/CONDITIONAL`), `nextDueDate`,
`remarks`.

Statuses (auto-computed): `VALID / DUE_SOON / EXPIRED / UNDER_REPAIR / FAILED / RETIRED`.

- BR-QLT-CAL-1: **Calibration guard** blocks measurement entry using an instrument with
  status `EXPIRED`/`FAILED`/`UNDER_REPAIR`/`RETIRED` (`CALIBRATION_BLOCKED`).
- BR-QLT-CAL-2: An approved calibration record updates the instrument: sets
  `lastCalibrationDate`, `certificateNumber`, `calibrationAgency`; FAIL→status FAILED; else
  recompute next due + status; sets `approvedBy`/`approvalDate`.
- KPIs: `total`, `dueWithin7Days`, `dueWithin30Days`, `overdue`, `underRepair`, `failed`.

---

## 13. SPC ANALYTICS

**Screen:** `quality-spc`. APIs `/api/v1/quality/spc/...`.
- X̄ chart: UCL/LCL with A2 = 0.577 (subgroup 5).
- R chart: D4 = 2.114, D3 = 0.
- Capability: Cp/Cpk from sample standard deviation; class:
  `CAPABLE` (Cpk ≥ 1.67), `MARGINAL` (≥ 1.33), `LOW` (≥ 1.00), else `INSUFFICIENT`.
- Every numeric measured characteristic is recorded into `quality_characteristic_measurement`;
  the SPC panel is available inside the inspection form.

---

## 14. TRACEABILITY AND SUPPLIER SCORECARD

### 14.1 Traceability
`traceability` screen. APIs `/api/v1/traceability/forward` and `/reverse` over
`vw_material_traceability_chain`.
- Forward: Sales Order → Work Order → Job Card → Batch/Heat → Supplier GRN (limit 100).
- Reverse: heat/batch/GRN → upstream.

### 14.2 Supplier Scorecard
`supplier-scorecard` screen. `/api/v1/quality/suppliers/scorecard?supplierCode=&months=6`
from `supplier_scorecard_monthly` matview; NCR detail drilldown; nightly refresh
(`0 0 2 * * *`).

---

## 15. DASHBOARD AND PENDING WORK QUEUE

### 15.1 Dashboard (`quality-dashboard`)
KPI cards incl. pending by type/priority, NCR open, concessions, complaints open, CAPA
overdue, calibration due/overdue, SPC alerts, recent inspections, supplier scorecard snapshot.

### 15.2 Pending queue (`inspection-pending`)
- `GET /inspection-pending/count` + `GET /inspection-pending` (filters type/priority/
  inspector/item; ordered Critical → High → Normal → Low by dueDate).
- Production gate: `GET /production-gate/check?itemCode=&machineCode=` — blocked if pending/
  hold count > 0.

---

## 16. NUMBERING (NUM-QLT)

| Doc | Prefix | Doc | Prefix |
|---|---|---|---|
| Quality Inspection | IQC (type prefix per §02; default `quality-inspection`) | Concession | CON |
| LO | LOI | Test Certificate | ITC |
| JOMIN | JOM | Calibration Record | CAL |
| FAI | FAI | Customer Complaint | CC |
| IPQC | IPQ | CAPA | CAP |
| LINE | LIN | 8D | 8D |
| LAST_OFF | LOF | SCAR | SCAR |
| FINAL | FIN | NCR | NCR |

Numbering uses FY-aware `DocNumberService.nextFy(prefix)`. NCR, concession, test cert,
complaint, CAPA default their display numbers (`ncrNumber`, `concessionNumber`,
`certificateNumber`, `complaintNumber`, `capaNumber`) to `docNo` on create.

---

## 17. WORKFLOWS (WF-QLT) — MASTER DIAGRAM

```
                ┌───────────────────  QUALITY INSPECTION LIFECYCLE  ───────────────────┐
                │   DRAFT → IN_PROGRESS → SUBMITTED → PASS → APPROVED → CLOSED          │
                │                              └ HOLD → release-hold                     │
                │                              └ FAIL → NCR(MRB) → disposition → APPROVED│
                │                                      └ REWORK → child inspection       │
                │                                      └ RTV → SCAR                      │
                └────────────────────────────────────────────────────────────────────────┘
                                    │                        │
                                    ▼                        ▼
              ┌───────────────  RELEASE / DISPOSE STOCK  ───────────────┐
              │  PASS → release QC_HOLD → FREE     FAIL → REJECTED / SCRAP / QUARANTINE │
              └──────────────────────────────────────────────────────────────────────────┘

Supporting documents and their lifecycles:
  NCR        : DRAFT/SUBMITTED/APPROVED/MRB_DISPOSITION/MRB_RESOLVED/MINOR_ACCEPTED
  Concession : DRAFT → SUBMITTED → APPROVED (customer approval flags)
  Complaint  : OPEN → UNDER_REVIEW → INVESTIGATION → ACTION_PLANNED → ACTION_IMPLEMENTED
               → RESPONSE_SENT → CLOSED (reopen/cancel paths)
  CAPA       : OPEN → IN_PROGRESS → ACTION_COMPLETED → VERIFICATION → CLOSED (OVERDUE)
  8D         : OPEN → IN_PROGRESS → CLOSED (D1..D8 disciplines each PENDING→VERIFIED)
  Test Cert  : DRAFT → SUBMITTED → APPROVED (OUTWARD auto-created on OQC approval)
  Calibration: instrument VALID/DUE_SOON/EXPIRED/FAILED/UNDER_REPAIR/RETIRED
```
**Integration points:** IQC ← PO Inward (auto-create), GRN linking, Sales DC Final-Inspection
gate, Production quality gate, Calibration guard on measurement entry, SPC facts, material
traceability, supplier scorecard.

---

## 18. BUSINESS RULES (BR-QLT)

| ID | Rule |
|---|---|
| BR-QLT-CHAR-1 | Auto pass/fail eval by limits; no-limit → PENDING_REVIEW. |
| BR-QLT-SAM-1 | AQL sampling auto-applies sample size / accept / reject numbers. |
| BR-QLT-PLAN-1 | Inspection plan auto-load (highest PUBLISHED revision) when no lines. |
| BR-QLT-QNT-1 | Quantity invariants (inspected ≤ received; disposition sum ≤ inspected). |
| BR-QLT-NCR-1 | FAIL auto-creates NCR; severity CRITICAL if critical line fails. |
| BR-QLT-CRIT-1 | Critical failure force-holds PASS and blocks approval. |
| BR-QLT-APP-1 | Approve releases (PASS) or disposes (FAIL) QC-held stock, idempotent. |
| BR-QLT-PASS-1 | Direct pass + inventory update posts stock IN immediately. |
| BR-QLT-MRB-1 | Dispositions: USE_AS_IS, REWORK, RTV, SCRAP, QUARANTINE; reason mandatory. |
| BR-QLT-REW-1 | REWORK spawns child re-inspection; RTV (IQC only) creates SCAR. |
| BR-QLT-COC-1 | OQC approval auto-generates OUTWARD test certificate. |
| BR-QLT-CAL-1 | Expired/failed instruments block measurement entry. |
| BR-QLT-CAL-2 | Approved calibration result refreshes instrument schedule/status. |
| BR-QLT-MINOR-1 | MINOR/LOW failure approval requires acceptance reason; NCR → MINOR_ACCEPTED. |
| BR-QLT-CLOSE-1 | Close blocked on failure without NCR/disposition. |
| BR-QLT-GATE-1 | Production quality gate blocks when pending/hold inspections exist (override via signed chain). |
| BR-QLT-SPC-1 | Every numeric measurement recorded for SPC (X̄/R, Cp/Cpk classification). |

---

## 19. ROLES AND PERMISSIONS

| Permission | Capabilities |
|---|---|
| QUALITY (module) | View, Create, Edit, Delete, Export, Print, Approve |
| SPC | View |
| Supplier Scorecard | View, Refresh |
| Calibration | View, Create, Edit, Approve |
| Gate override signing | Quality → Production → Plant Head (signed override chain) |

---

## 20. AUDIT, ATTACHMENTS AND PRINTING

- `quality_inspection_status_history` append-only per transition; `recentActivity` feeds.
- Attachments drawer (`ownerType` = docType) on all quality docs.
- Barcode/print label: `printDocLabel` with `QUALITY_INSPECTION`.
- Bulk import of measurements (CSV): `balloonNo|characteristicCode,actualValue,instrumentCode,remark`.

---

## 21. DATABASE IMPACT SUMMARY

| Table | Purpose |
|---|---|
| `quality_inspection` (+indexes on type, status/decision, source, item, due_date, inspector, doc_no) | Inspection header |
| `quality_inspection_line` | Characteristic lines |
| `quality_characteristic_measurement` | SPC facts |
| `quality_inspection_status_history` | Transition audit |
| `quality_inspection_attachment` | Attachments |
| `quality_ncr(_line)` | NCR |
| `quality_concession` | Concession |
| `quality_capa` | CAPA |
| `quality_8d` / `quality_8d_discipline` | 8D |
| `quality_customer_complaint` | Complaints |
| `quality_test_certificate(_line)` | Test certificates |
| `quality_calibration_instrument` / `quality_calibration_record` | Calibration |
| `quality_disposition` | MRB dispositions |
| `quality_scar` | Supplier corrective action request |
| `inspection_plan` / `inspection_plan_characteristic` | Plans |
| `sampling_plan_master` | AQL sampling |
| `route_operation_inspection` | Production gate linkage |
| `production_gate_override(_audit)` | Gate overrides |
| Runtime views/matviews | `vw_material_traceability_chain`, `supplier_quality_scorecard`, `supplier_scorecard_monthly` |

---

## 22. API IMPACT SUMMARY

- `/api/v1/quality/inspections` (CRUD + `next-number` + actions: start/submit/decision/approve/
  hold/release-hold/release-stock/dispose-stock/disposition/close/cancel/reopen) + characteristics
  (bulk-save, bulk-import) + history + re-inspection.
- `/api/v1/quality/ncrs`, `/api/v1/quality/scars`.
- `/api/v1/quality/docs/{type}` (NCR/Concession/Test-Cert/Calibration-Record/Complaint/CAPA/8D)
  + actions + export xlsx/pdf.
- `/api/v1/quality/inspection-pending`, `/api/v1/quality/production-gate/check`.
- `/api/v1/quality/calibration/instruments|stats|dashboard`.
- `/api/v1/quality/spc/xbar|capability|stats|characteristics`.
- `/api/v1/quality/suppliers/scorecard|ncr-details|refresh`.
- `/api/v1/traceability/forward|reverse`.
- `/v2/master/inspection-plans` CRUD; `/api/master/aql-lookup`.

---

## 23. OPEN GAPS AND KNOWN LIMITATIONS

1. **No`LoInspection` entity** — LO acceptance sometimes falls back to inward-line quantities.
2. DRAFT/CANCELLED upstream documents are not filtered when matching source references.
3. Gate override chain relies on logged override records; enforceability depends on RBAC grant.
4. SPC capability uses sample std dev (short-run); long-run capability not directly supported.
5. Supplier scorecard matviews refresh on cron; live data lag up to schedule window.

---

*End of DOCUMENT 03 — Quality Module FRS.*