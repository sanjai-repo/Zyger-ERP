# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 13 — API SPECIFICATION

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 13 — API Specification (REST) |
| Stack | React → API Gateway → Spring Boot → Service → Domain → Repository → PostgreSQL |
| Baseline | DOCUMENT 07 §24; DOCUMENT 09 fields; DOCUMENT 10 BRs; DOCUMENT 11 tx; DOCUMENT 12 DB |
| Status | AUTHORITATIVE API CONTRACT |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

---

## TABLE OF CONTENTS

1. API Conventions
2. Common Request / Response Envelope
3. Error Model
4. Pagination, Filtering, Sorting
5. API ID → Transaction Map
6. Core APIs (Production Order, Job Card, Entry Session, Operations)
7. Material / Stock-Intent APIs
8. Quality / Rework / Scrap APIs
9. Idle / Stoppage APIs
10. Conversion / Disassembly APIs
11. Planning Layer APIs
12. Numbering / Audit / Catalog Support APIs
13. Multi-Entity / Support APIs
14. API → BR → Tx → DB Cross-Reference

---

## 1. API CONVENTIONS

- **Base path:** `/api/production/v1` (versioned). All responses JSON.
- **AuthN/AuthZ:** JWT bearer; role on every endpoint (see DOC 08 roles).
- **Idempotency:** mutating APIs accept optional `Idempotency-Key` header; duplicates rejected
  for approve/cancel/reverse/submit (prevents double posting).
- **Audit:** every mutating call appends `prod_document_audit`.
- **Optimistic concurrency:** `version` integer echoed in request; service rejects
  `409 CONFLICT` if stale.
- **Time fields:** ISO-8601 with timezone; qty as decimal string.
- **Success:** `200/201`; created returns Location.

### Role legend (maps DOC 08)
`PLN=Planner, SUP=Supervisor, OPR=Operator, ENG=Engineer, QLT=Quality, PHD=Plant Head,
ACC=Accounts/Store, ALL=any authenticated`.

---

## 2. COMMON REQUEST / RESPONSE ENVELOPE

```json
// Request
{ "companyId":"…","plantId":"…", "payload": {…}, "version": 0, "idempotencyKey":"…" }

// Response (success)
{ "success": true, "data": {…}, "trace": "op-1234" }

// Convenience summary
POST /api/production/v1/{docs}/summary   → { "totals": { "processed","accepted","rejected",
                                           "rework","scrap","pending","wip" } }
```

---

## 3. ERROR MODEL

```json
{ "success": false, "error": {
    "code": "VALIDATION_ERR | STALE_VERSION | FORBIDDEN | NOT_FOUND | CONFLICT |
             INV_STATUS | PARALLEL_ORDER | DUPLICATE | INTEGRATION_ERR",
    "message": "…",
    "fieldErrors": [ { "path":"payload.itemId", "code":"REQUIRED|MAX|MIN|FORMAT", "message":"…" } ]
}}
```
HTTP codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found,
`409` conflict/stale-version/invalid-status/integration, `422` rule violation.

---

## 4. PAGINATION, FILTERING, SORTING

- `?page=0&size=25&sort=dueDate,desc&filter=order_type:eq:SINGLE;itemId:eq:<id>&q=freeText`
- Filters support `eq, ne, gt, gte, lt, lte, in, between, contains`. Pagination is page/index
  (offset) for admin lists; server cursor-key for large event streams (operation events).
- Defaults: page=0, size=25.

---

## 5. API ID → TRANSACTION MAP

| API ID | Transaction (DOC 11 §3) | Method+Path | Roles |
|---|---|---|---|
| API-PO-001 | Production Order (Single) | POST/GET/PATCH/DELETE `/orders`, `/{id}` | PLN, PHD |
| API-PO-002 | Production Order actions | POST `/orders/{id}/submit/approve/reject/cancel/reverse` | PLN/SUP, PHD |
| API-PO-003 | Composite PO | `POST /orders/composite` + member actions | PLN, PHD |
| API-PO-004 | Rework PO | `POST /orders/rework` | PLN, QLT, PHD |
| API-PO-005 | Short Close | `POST /orders/{id}/shortClose` | PHD |
| API-JC-001 | Job Card | `POST /jobcards` + `/{id}` CRUD | PLN, SUP |
| API-JC-002 | Job Card actions | `POST /jobcards/{id}/submit/release/complete/cancel/reverse` | SUP, PLN |
| API-JC-003 | Job Entry + Subjob | `POST/GET /jobcards/{id}/entries` | SUP, OPR |
| API-ENTRY-001 | Production Entry (session+ops) | `POST /entrySessions` + `/jobs/{id}/entries` CRUD | OPR, SUP |
| API-ENTRY-002 | Entry actions | `POST /entrySessions/{id}/submit/approve/reject/cancel/reverse` | SUP, PHD |
| API-ENTRY-003 | Operation events | `GET/POST /entrySessions/{id}/operations` | OPR, SUP |
| API-ENTRY-004 | Output events | `POST /operations/{id}/outputs` | OPR, SUP |
| API-ENTRY-005 | Rework Entry | `POST /entrySessions/rework` | PLN, QLT |
| API-ENTRY-006 | Multiple Output Entry | `POST /entrySessions/multiOutput` | OPR, SUP |
| API-MREQ-001 | Production Material Request | `POST /materialRequests` + line CRUD | SUP, ACC |
| API-MREQ-002 | Additional Material Request | `POST /materialRequests/additional` | SUP, PLN, PHD |
| API-MREQ-003 | Other Material Request | `POST /materialRequests/other` | SUP, PLN |
| API-MREQ-004 | Issue/Return actions | `POST /materialRequests/{id}/issue/return` | ACC |
| API-CONSUME-001 | Consumable Consumption | `POST /consumptions` | SUP, ACC |
| API-CONSUME-002 | Production Return | `POST /returns` | SUP, ACC |
| API-REJ-001 | Rejection | `POST /rejections` + line CRUD | OPR, SUP |
| API-REJ-002 | Rejection actions | `POST /rejections/{id}/process` (disposition) | QLT, PHD |
| API-SCRAP-001 | Scrap | `POST /scraps` + line CRUD | OPR, ENG |
| API-SCRAP-002 | Scrap authorization | `POST /scraps/{id}/authorize` | ENG, PHD |
| API-IDLE-001 | Idle Time | `POST /idles` | OPR, SUP |
| API-STOP-001 | Line/Machine Stoppage | `POST /stoppages` + maintenance hand-off | OPR, SUP, ENG |
| API-CONV-001 | Product/Item Conversion | `POST /conversions` + line CRUD | PLN, PHD, ACC |
| API-CONV-002 | Disassembly | `POST /disassemblies` + line CRUD | PLN, ACC |
| API-CONV-003 | Item Change | `POST /conversions/itemChange` | PLN |
| API-BATCH-001 | Batch Card + Batch Move | `POST /batchCards` + `/moves` | SUP, QLT |
| API-PLAN-001 | Plan Demand | `POST/GET /plan/demands` | PLN |
| API-PLAN-002 | Item-Daily Plan | `POST/GET /plan/itemDaily` | PLN |
| API-PLAN-003 | Bucket Plan | `POST/GET /plan/buckets` + lines | PLN |
| API-PLAN-004 | Budget + Revision | `POST /plan/budgets` + `/{id}/revise` | PLN, PHD |
| API-PLAN-005 | Capacity → WC | `POST /plan/workCenters` + `/loads` + `/realloc` | PLN, PHD |
| API-PLAN-006 | Production Plan Deviation | `POST /plan/deviations` | PLN |
| API-PLAN-007 | Delay to Customer | `POST /plan/delays` | PLN |
| API-PLAN-008 | Schedule & Order Release | `POST /plan/schedules/{id}/release` | PLN |
| API-SUPPORT-001 | Numbering preview/validate | `GET /numbers/{docType}/next` | ALL |
| API-SUPPORT-002 | Reason/Activity catalog CRUD | `GET/POST /catalogs/reasons|activities` | PLN |
| API-SUPPORT-003 | Document audit trail | `GET /audit/{entity}/{id}` | ALL |
| API-QUERY-001 | WIP/Pending view | `GET /queries/wip` | ALL |
| API-QUERY-002 | Capacity utilization | `GET /queries/capacity` | PLN |
| API-QUERY-003 | OEE input | `GET /queries/oee` | ALL |

---

## 6. CORE APIS

### API-ENTRY-001 Create Production Entry (session + operation events)
```
POST /api/production/v1/entrySessions
Authorize: OPR, SUP
Idempotent: yes
BR: BR-PROD-010 (route seq), BR-PROD-020 (machine/operator), BR-PROD-004 (actual ts)
Tx-Boundary: op_event + output/consumption events created; posting only on approve
Request payload:
{ "jobCardId":"…","entryType":"PRODUCTION","shiftId":"…","entryDate":"2026-…",
  "actualProdTs":"2026-…T…Z","operations":[{"operationId":"…","machineId":"…","operatorId":"…",
   "startTs":"…","inputQty":"10","outputs":[{"outputType":"PRIMARY","qty":"9","lot":"…"}]}],
  "consumptions":[{"itemId":"…","issuedQty":"5"}], "version":0 }
Response 201: { "sessionId","sessionNo","docStatus":"DRAFT","operations":[{"id","opStatus":"NOT_STARTED"}] }
Errors: VALIDATION_ERR, FORBIDDEN, NOT_FOUND, STALE_VERSION
```

### API-ENTRY-002 Actions (submit/approve/reject/cancel/reverse)
```
POST /api/production/v1/entrySessions/{id}/approve
Authorize: SUP (approve), PHD (reverse)
BR: BR-PROD-ENTRY-001 (reconciliation gate), BR-PROD-ENTRY-002 (inspection visibility)
Step: validate → set docStatus=APPROVED → post stock_tx_intent (output/consumption/scrap/rework)
Errors: INV_STATUS (if not SUBMITTED), CONFLICT, VALIDATION_ERR
```
Each action is a distinct transition guard per DOC 11 §3.8; invalid-state returns `INV_STATUS`.

### API-OPERATION/OUTPUT (per-op)
```
GET /entrySessions/{id}/operations           (paged event stream, cursor)
POST /operations/{id}/outputs                → validates input_qty ≥ processed (BR-PROD-ENTRY-001)
POST /operations/{id}/quality                → sets insp_status; QUALITY gate (BR-PROD-008)
```

---

## 7. MATERIAL / STOCK-INTENT APIS

```
POST /materialRequests/{id}/issue   → posts MATERIAL_ISSUE intent; partial allowed (ASM-PROD-003)
POST /materialRequests/{id}/return  → posts RETURN intent per disposition (BR-PROD-INV-003)
POST /returns                       → credited per Good/Hold/Rejected
POST /consumptions/{id}/post        → CONSUMPTION intent; approved_excess flag path (ASM-PROD-003)
```
Every posting goes through `stock_tx_intent` outbox — never writes item balance directly
(R-PROD-006 / BR-PROD-INV-001).

---

## 8. QUALITY / REWORK / SCRAP APIS

```
POST /rejections                       → creates rejection + lines; reworkable/scrap/hold_MRB
POST /rejections/{id}/process          → sets disposition (REWORKROUTE/SCRAP/QUARANTINE); QLT + PHD
POST /scraps/{id}/authorize            → AUTO vs MANUAL_PENDING→APPROVED (BR-PROD-SCRAP-001)
POST /scraps/{id}/reverse              → restricted post-capitalization (BR-PROD-SCRAP-001)
POST /rework/{sessionId}               → qty ≤ authorized_qty (BR-PROD-REWORK-001)
```
Authorization flow (BR-PROD-SCRAP-001): AUTO for small/recurring approved reasons; MANUAL
threshold otherwise; MANUAL requires ENG/PHD approval before posting scrap intent.

---

## 9. IDLE / STOPPAGE APIS

```
POST /idles            → store duration (derived end-start); feeds OEE availability
POST /stoppages/{id}/maintenance   → hand-off to maintenance (BR-PROD-STOP-001); machine becomes
                                     ineligible until resolved
```
No inventory intent; admin lifecycle only (DOC 11 §3.18–19).

---

## 10. CONVERSION / DISASSEMBLY APIS

```
POST /conversions                     → input/output reconciliation (BR-PROD-CONV-001)
POST /conversions/{id}/post           → CONVERSION intent: input−, output+, loss, scrap
POST /conversions/itemChange          → output_item only, output_qty = input_qty
POST /disassemblies                   → parent−, components+, by+, loss (BR-PROD-DISASM-001)
POST /disassemblies/{id}/post
```
All bar posting to `stock_tx_intent`; reconciliation CHECK enforced at DB (ck_conv_reconcile).

---

## 11. PLANNING LAYER APIS

```
POST /plan/demands | /itemDaily | /buckets | /workCenters/{id}/loads | /realloc
POST /plan/budgets  → base rev; /plan/budgets/{id}/revise → change_req+reason, bumps rev
POST /plan/schedules/{id}/release     → releases order (PLANNED→RELEASED) per DOC 11 §2.1
POST /plan/deviations | /delays       → plan-vs-actual / delivery performance inputs
```
MPS/MRP-engine execution is FUTURE (DEC-PROD-003); these APIs capture/derive intent only.

---

## 12. NUMBERING / AUDIT / CATALOG SUPPORT APIS

```
GET  /numbers/{docType}/next        → preview next number (reserves in SUBMIT/DRAFT per BR-NUM)
GET  /audit/{entity}/{id}           → full document audit trail (DOC 12 prod_document_audit)
GET/POST /catalogs/reasons|activities
```

---

## 13. MULTI-ENTITY / SUPPORT APIS

- **Composite Member operations** under `/orders/composite/{id}/members` (API-PO-003).
- **Job Completion** `POST /jobcards/{id}/complete` runs completion gate + FG/SFG receipt
  (BR-PROD-INV-002).
- **Batch move logging** under `/batchCards/{id}/moves` (API-BATCH-001).
- **Query views:** WIP/Pending/Capacity/OEE (API-QUERY-001..003) read derived views only.

---

## 14. API → BR → TX → DB CROSS-REFERENCE (summary)

| API ID | Key BR invoked | Tx (DOC 11) | DB tables |
|---|---|---|---|
| API-ENTRY-001 | ENTRY-001, 010, 020, 004 | 3.8 | prod_execution_session, prod_operation_event |
| API-ENTRY-002 | ENTRY-001/002 | 3.8 actions | + prod_document_audit, stock_tx_intent |
| API-ENTRY-004 | ENTRY-003 | 3.10 | prod_output_event |
| API-MREQ-001 | MATL-001 | 3.12 | prod_req_material(_line) |
| API-REJ-001 | ENTRY formulas | 3.16 | prod_rejection(_line) |
| API-SCRAP-001 | SCRAP-001 | 3.17 | prod_scrap(_line) |
| API-CONV-001 | CONV-001 | 3.20 | prod_conversion(_line) |
| API-CONV-002 | DISASM-001 | 3.23 | prod_disassembly(_line) |
| API-JC-001 | ORDER/JC | 3.4 | prod_job_card, prod_subjob |
| API-PO-001 | ORDER-xx | 3.1–3.3 | prod_order(_x_member) |
| API-PLAN-* | PLAN-005/007/010/011 | 3.26–3.29 | prod_plan_* |

---

**END OF DOCUMENT 13**