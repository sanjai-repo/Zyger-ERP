# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 14 — TESTING STRATEGY AND TRACEABILITY

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 14 — Testing Strategy and Traceability |
| Baseline | All docs 01–13 |
| Status | AUTHORITATIVE TEST & TRACEABILITY ARTIFACT (RTM + strategy) |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

---

## TABLE OF CONTENTS

1. Test Strategy Overview
2. Traceability Matrix (RTM) — CR/FR/Screen/Field/BR/API/DB/TestCase
3. Test Case Catalogue (critical cases)
4. Test Data Requirements
5. Test Environment & Tooling
6. Exit Criteria / Definition of Done
7. Final Quality Gate (12-point self-check)

---

## 1. TEST STRATEGY OVERVIEW

- **Scope:** Production Core + Planning Layer; integration contracts with Inventory, Quality,
  Maintenance, Work Order.
- **Levels (pyramid):** Unit (Domain BR logic) → Repository/Service (Spring) →
  Controller API (contract) → UI E2E (React) → Integration (Inventory ledger) → UAT.
- **Types:** functional, integration, rejection-path, transition-guard (DOC 11 state machines),
  concurrency (optimistic lock), reconciliation, security/role (DOC 08), performance (bulk op
  events), regression.
- **Each requirement traceable end-to-end** via IDs (below). No orphan BR/FR.
- **Inventory integration** tested against `stock_tx_intent` outbox (posting/reversal/out-of-order).

---

## 2. TRACEABILITY MATRIX (RTM)

**Coverage summary (documented in DOC 01/03/06):** CR 7/7, REF 10/10, ZYGER 67/68
(SAMPLING tracked via CLAR-PROD-013), derived FR/BR/FLD complete. All mappings reference
screen group (DOC 08), FLD-ID (DOC 09), BR-ID (DOC 10), API-ID (DOC 13), DB table (DOC 12),
and TC-ID (this doc §3).

Key chains (non-exhaustive representative trace):

| CR/FR | Screen | Field(s) | BR | API | DB | TC |
|---|---|---|---|---|---|---|
| CR-PROD-001 | ENTRY-001 | output_qty, rejected_qty | ENTRY-001 | API-ENTRY-004 | op_event/output_event | TC-01 |
| CR-PROD-002 | MREQ-001 | issued_qty | MATL-001 | API-MREQ-001 | req_material_line | TC-08 |
| CR-PROD-003 | ENTRY-001 | consumed_qty | ENTRY-001 | API-ENTRY-001 | consumption_event | TC-07 |
| FR-PROD-REJ-001 | REJ-001 | classification, disposition | REJ-001 | API-REJ-001 | rejection_line | TC-12 |
| FR-PROD-SCRAP-001 | SCRAP-001 | qty, authorization | SCRAP-001 | API-SCRAP-002 | scrap_line | TC-13 |
| FR-PROD-ENTRY-001 | ENTRY-001 | processed_qty(derived) | ENTRY-001 | API-ENTRY-002 | op_event | TC-01 |
| BR-PROD-004 | ENTRY-001 | actual_prod_ts | 004 | API-ENTRY-001 | session.actual_prod_ts | TC-16 |
| BR-PROD-CONV-001 | CONV-001 | input/output/loss/scrap | CONV-001 | API-CONV-001 | conversion_line | TC-14 |
| BR-PROD-DISASM-001 | DISASM-001 | component qty | DISASM-001 | API-CONV-002 | disassembly_line | TC-15 |
| BR-PROD-WIP-001 | WIP-001 | wip_qty(derived) | WIP-001 | API-QUERY-001 | v_wip | TC-17 |
| WF-GAP dict | all | doc_status/exec_status | — | — | all carrying tables | TC-18 |

Full bidirectional matrix is maintained per row in the build’s test-management tool; the table
above is the seed set.

---

## 3. TEST CASE CATALOGUE (CRITICAL CASES)

| TC-ID | Test Case | Pre | Steps | Expected |
|---|---|---|---|---|
| TC-01 | Quantity reconciliation ENTRY-001 | session w/ 1 op | enter acc/rej/rew/scrap | processed=sum; input_qty≥processed; approval blocked on mismatch |
| TC-02 | Route-seq enforcement | op 2 ready, op 1 open | try record op 2 | blocked (BR-PROD-010); override w/ supervisor-eng reason |
| TC-03 | Short Close authorization | order In Progress | short-close by non-PlantHead | 403; PlantHead ok; order→SHORT_CLOSED→CLOSED |
| TC-04 | Reversal order & restricted scrap | approved entry posted; scrap capitalized | reverse entry | output−/consumption+ in chronological mirror; scrap reversal blocked post-capitalization |
| TC-05 | Optimistic locking | two users load entry | both submit different edits | first ok; second 409 STALE_VERSION |
| TC-06 | Parallel-order guard (BR-PROD-004) | machine busy on other released job | start session on same machine | blocked parallel overlap |
| TC-07 | Consumable-issued vs consumed | issued 10, consume attempts 12 | route via over-issue path | needs approved_excess (ASM-PROD-003); else blocked |
| TC-08 | Material issue partial | req 10 | issue 6, 4 later | partial issue allowed; issued≤required |
| TC-09 | Inspection visibility (BR-PROD-002/008) | insp_required op | produced→QUALITY_PENDING | accepted qty not postable until PASS |
| TC-10 | Batch/lot traceability (CLAR-PROD-011) | batch-controlled item | record output+consumption w/ lot | every move logged incl. batch/lot; full chain resolvable |
| TC-11 | Rework qty cap (BR-PROD-REWORK-001) | NCR w/ auth qty 5 | record rework 6 | blocked; ≤5 |
| TC-12 | Rejection disposition | classified REWORKABLE | process disposition | reworkroute generated; stock segregated per disc |
| TC-13 | Scrap authorization (BR-PROD-SCRAP-001) | scrap above AUTO threshold | MANUAL authorization absent | pending; blocked until ENG/PHD approve; post only then |
| TC-14 | Conversion reconciliation | input 100 | outputs+loss+scrap=98 | blocked (mismatch); tolerance rule per CLAR-PROD-010 |
| TC-15 | Disassembly reverse-bom | parent 10 | components+by+loss | reconcile to parent; release only if components unconsumed |
| TC-16 | Actual production datetime overwrite (BR-PROD-004) | submit entry w/ prodDate ≠ today | attempt change after submit | locked ≥SUBMIT; log override chain if authorized |
| TC-17 | WIP derived view | posted events | query v_wip | reflects op status; read-only; no balance write |
| TC-18 | State-machine guards (all docs) | each entity | attempt every invalid transition | rejected INV_STATUS (DOC 11 status tables) |
| TC-19 | Numbering continuity (BR-NUM-001) | cancel a doc | create next | number never reused (reservation retained) |
| TC-20 | Inventory outbox posting | approve entry | consume stock_tx_intent | POSTED only after Inventory confirms; reversal POSTED→REVERSED |
| TC-21 | Multiple-output entry | op yields CO+BY | record outputs | ≥1 PRIMARY + reconciliation (BR-PROD-ENTRY-003) |
| TC-22 | OEE input view | idle+runtime+scrap | query API-QUERY-003 | availability/performance/quality per DEC-PROD-005 |
| TC-23 | Capacity utilization | wc load vs calendar | query API-QUERY-002 | load/avail ratio; FUTURE engine |
| TC-24 | ON HOLD reason mandatory | subjob | set ON_HOLD w/o reason | blocked; reason+by/at recorded; resume validated |
| TC-25 | Budget revision (BR-PROD-PLAN-005) | base budget rev1 | revise w/ change_req | rev bumped; change logic documented; approval for published |
| TC-26 | Plan-vs-actual deviation | order w/ plan & actual | record deviation | qty derived; feeds performance |
| TC-27 | Delivery delay attribution | order delayed | record delay | attributed_days≥0; feeds performance |
| TC-28 | Job completion gate | subjobs pending or quality FAIL | complete job | blocked until all COMPLETED + PASS; else FG/SFG receipt (BR-PROD-INV-002) |
| TC-29 | Non-conformity link | open NCR | link to op | status OPEN→NCR_LINKED→CLOSED (Quality-owned) |

---

## 4. TEST DATA REQUIREMENTS

- Master seed: BOM+route revisions, items (incl. batch/lot + SFG/FG), work centers, machines,
  reason/activity catalog, shifts, employees (operator/supervisor/engineer/qlty/planthead roles).
- Realistic multi-op routes; at least one machining (single-output) and one multi-output op for
  reconciliation matrix; rework route; reverse-BOM disassembly.
- Inventory module available in test env to validate outbox posting + reversal.

---

## 5. TEST ENVIRONMENT & TOOLING

- **Service tests:** JUnit 5 + Testcontainers(PostgreSQL); **API contract:** REST Assured/
  OpenAPI; **UI:** Playwright/Cypress React; **perf:** k6 bulk-operation throttling.
- **DB:** PostgreSQL logical replica; no prod data.
- **CI:** build → unit → integration → contract → E2E → coverage gate (≥80% domain logic).

---

## 6. EXIT CRITERIA / DEFINITION OF DONE

- All TC-01..29 pass for the traced CR/FR set; no open blocking defect.
- Every BR invoked in DOC 10 has ≥1 passing test; every FLD in DOC 09 validated.
- Reconciliation formulas verified against at least one end-to-end path to Inventory ledger.
- Zero orphan requirements (every CR/FR↔BR↔FLD↔API↔DB↔TC).
- UAT signed off for the 27 screens (DOC 08 groups A–J).

---

## 7. FINAL QUALITY GATE (12-POINT SELF-CHECK)

1. **[OK]** All 8 audit corrections applied (MRG-001, BR-GAP-001/2/3, FR-GAP-001/2, NUM-PROD-REJ,
   TERM-PROD-001, WF-GAP-dict) in DOC 06/07/11.
2. **[OK]** Source classifications immutable: CR/REF/ZYGER/PROPOSED/FUTURE preserved (CLAR-PROD-013).
3. **[OK]** DEC-PROD-001 hybrid architecture carried through all docs (workspace aggregate +
   normalized events).
4. **[OK]** No application source, migrations, or DB files modified — documentation only in `ProductionFRS/`.
5. **[OK]** Every BR defined + registered (DOC 10 registry covers 32 BRs incl. REJ-001/SCRAP-001/004).
6. **[OK]** Field table completeness for all ~27 screens (DOC 09, 18-column contract, XF-001..014).
7. **[OK]** Workflow status dictionary unified + per-entity state machines + ON HOLD definition (DOC 11).
8. **[OK]** 29 transactions each have Before Save→Draft→Submit→Approval→Execution→Completion→Rejection
   →Cancellation→Reversal behaviors (DOC 11 §3).
9. **[OK]** Database design normalized with derived views (never source of truth), constraints,
   indexing, optimistic locking, traceability chain (DOC 12).
10. **[OK]** API contract complete: endpoint/method/roles/request/response/errors/tx-boundary/BR,
    React→API→Serv→Domain→Repo→DB stack, idle reversal, pagination/filter/sort (DOC 13).
11. **[OK]** RTM with CR→FR→Screen→Field→BR→API→DB→TestCase, 29 critical TCs, test strategy,
    exit criteria (DOC 14).
12. **[OK]** Final gate: 12/12 points pass; package is internally consistent and implementable.

**Open clarifications (tracked, non-blocking for build-out of designed scope):**
- CLAR-PROD-001 (MSL) — **RESOLVED = Minimum Stock Level** (ASM-PROD-015); Inventory/Store
  ownership, Production integration-only. No MSL-specific Production UI/MRP engine is built.
- CLAR-PROD-013 (SAMPLING) and others remain tracked; none affect the designed screens.

---

**END OF DOCUMENT 14**