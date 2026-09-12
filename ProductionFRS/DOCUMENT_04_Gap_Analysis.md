# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 04 — GAP ANALYSIS AND IMPROVEMENT PLAN

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 04 — Gap Analysis and Improvement Plan |
| Sources compared | CR (Customer Requirement), REF (Freedom ERP), ZYGER (Zyger key points) |
| Status | ANALYSIS — identifies gaps, risks, and prioritized recommendations |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

---

## TABLE OF CONTENTS

1. Gap Analysis Matrix
2. Explicitly Identified Gap Categories
3. Improvement Plan (grouped by priority)
4. Module-by-module coverage check
5. Recommendation Summary

---

## 1. GAP ANALYSIS MATRIX

Columns: Requirement Area | Customer Requirement | Freedom ERP | Zyger ERP | Gap | Risk | Recommendation | Priority

| Req Area | Customer (CR) | Freedom (REF) | Zyger | Gap | Risk | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| Production Entry | Record actual production vs WO/op (CR-PROD-001) | Single op/route entry, manual summaries | Final-Part single entry (ZYGER-63) + rework/multiple-output entries | Final-part UX vs per-op control; manual summary model | WIP/traceability drift (R-PROD-001/002) | DEC-PROD-001; backend-computed quantities | P0 |
| Frequency/granularity of entry | Operation & machine based | Operation based | "All processes one final-part entry" | Reconciliation needed | Over-hidden or over-detailed granularity | Hybrid model + 4 entry modes (DEC-PROD-001-§3.5) | P0 |
| Rework | Record rework qty (CR-PROD-001) | Bare General/Rework radio | Rework Entry + Rework PO + Rework route | No source linkage in REF | Broken quality/stock traceability (R-PROD-003) | Rework = traced transaction (source entry + NCR + qty cap) | P0 |
| Rejection/Sscrap classification | Reject qty (CR) | One generic rejected value | Scrap Generation; Rejection details; PPM | No structured reject → reworkable/scrap/hold | Cost/quality misallocation | Structured reject classification; scrap posting | P0 |
| Material issue & consumption | Material requirement; available/no path | Full grid (req/issued/avail/cons/dev/return/rate/batch) | Material/Additional/Other request; consumption details | Deviation tolerance approval absent | Excess consumption unapproved | Deviation-tolerance + approval workflow | P0 |
| Material return | Production Return (CR-PROD-003) | Return qty in grid | Production Return | Condition-check workflow missing | Wrong store receipt/condition | Return with condition/quality disposition | P1 |
| Consumables | Not in CR | — | Consumable Consumption Entry; Consumable Plan | No consumable capture in CR/REF | Consumable cost untracked | Consumable consumption + plan (own) | P1 |
| Job Card | Job Card + Subjob + Completion (CR-PROD-005) | — | — (implied) | Subjob ↔ route-op mapping unclear | Jobs diverge from route sheet | Map subjob to route op (CLAR-PROD-005) | P0 |
| Production Log Sheet | Detailed shift log (CR-PROD-004) | — | Production Entry only | Log granularity & reasoning | Data-entry burden/incomplete logs | Log sheet with controlled activity catalogue | P1 |
| Idle time / stoppage | Idle Time (CR-PROD-006) | Idle time + reason | Line Stoppage; OEE | Reason catalogue not defined | Inconsistent downtime data | Idle-reason catalogue; auto-duration | P1 |
| Production Pending | Pending view (CR-PROD-007) | Pending qty shown | Production Pending | Pending formula not enforced | Pending miscalc | Backend-computed pending (CLAR-PROD-002) | P1 |
| Product Conversion | Convert item (CR-PROD-002) | — | Item Conversion; Item Change | Input/output/loss/scrap model | Loss/cost untracked (R) | Conversion with loss/scrap + cost snapshot | P1 |
| Disassembly | — | — | Disassembly | Not in CR | — | Disassembly transaction (parent→components) | P2 |
| Multiple outputs | — | — | Multiple Output Entry | Not in CR | — | Co/by-product output entry | P2 |
| Production Planning / time buckets | Pending+plan (CR-PROD-007) | — | Full planning layer (budget, buckets, work-center plans) | Planning is separate layer scope | Scope creep / ambiguity | Planning Layer (in-sample) + APS FUTURE | P1 |
| Work-center / machine capacity | — | machine/operator fields | Capacity assessment; Work Center planning; Re-allocation | Capacity engine missing | Over/under-load | Planning layer capacity reports + engine FUTURE | P1 |
| Manpower efficiency | — | operator field | Man/Manpower Efficiency; Plan vs Actual | Efficiency engine missing | Labour cost untracked | Efficiency capture + report | P2 |
| OEE | — | idle/run data available | OEE; Machine-wise OEE details | Cross-functional engine not owned | Duplicated/inconsistent OEE | Single OEE engine (DEC-PROD-005) | P1 |
| BOM/Routing/Routing details | Uses route sheet (CR) | route sheet used | BOM/Routing listed | Master ownership | Duplicate masters | Engineering-owned; integration only | P0 |
| Machine/Tool Masters | machine/tool assumed | machine/tool fields | Machine/Tool Master | Master ownership | Duplicate masters | Master Data module | P0 |
| MRP | material availability check (CR) | — | MRP Run | Engine ownership | Broken scheduling | MRP module; integration only | P1 |
| Non Conformity / NCR | rework needs reason (CR) | — | Non Conformity | NCR ownership | Weak quality loop | Quality module; Production links | P1 |
| PPAP | — | — | PPAP | Ownership | Shipment-block risk | Quality module; Production gate only | P2 |
| PPM / rejection/scrap analytics | — | — | PPM, details | Consolidation | — | Reports in Production/Cost | P2 |
| Manufacturing cost (op-wise plan vs actual) | — | MHR/rate fields | Manufacturing cost; op-wise cost | Costing ownership | Cost leakage | Costing module; Production feeds actuals | P1 |
| Reports (plan vs actual daily/weekly/monthly, KPI, 6M, CIP, MIS) | Pending/plan (CR) | — | Extensive report list | Aggregation/ownership | Fragmented KPIs | Reporting/Analytics spec | P2 |
| Document numbering | entry no (CR-PROD-001/005) | PROD/0663/26-27 | — | Preview vs reservation undefined | Duplicate/changing numbers (R-PROD-005) | Numbering rules (DOC 07-§21) | P0 |

---

## 2. EXPLICITLY IDENTIFIED GAP CATEGORIES

### 2.1 Missing functionality
- Structured rejection → reworkable/scrap/hold classifications.
- Material deviation tolerance + approval workflow.
- Rework as traced transaction (source entry + NCR).
- Condition/quality disposition on production return.
- Consumable consumption and consumable plan.
- Multiple-output (co/by-product) production entry.
- Line/machine stoppage with reason, separate from general idle.
- Batch card control (batch/lot execution).
- Production plan deviation reason + delay-to-customer recording.
- OEE single engine and machine-wise OEE.
- Full document numbering (preview vs reservation).

### 2.2 Duplicate functionality (ownership)
- BOM/Routing/Route Sheet/Process Flow → Engineering (not Production).
- Machine/Tool/Work Center/Operation/Shift/Employee Masters → Master Data.
- MRP → MRP/Planning module.
- PPAP/NCR/CAPA/Inspection → Quality.
- Machine breakdown/PM → Maintenance.
- Costing rules/calc → Costing.
- MIS aggregation → MIS/BI.

### 2.3 Conflicting requirements
- Final-part single entry (ZYGER-63) vs per-operation entry (CR/REF) → resolved by DEC-PROD-001.
- Planning layer (time-bucket/MPS/budget) partially overlaps MRP/APS → boundary flag (see DOC 05).
- Rework as radio (REF) vs traced rework (PROPOSED) → DOC 05.

### 2.4 Unclear requirements
- MSL meaning → **RESOLVED = Minimum Stock Level** (CLAR-PROD-001; Inventory/Store reorder level, integration-only for Production).
- Process Rate meaning (CLAR-PROD-007).
- MHR rate basis (CLAR-PROD-008).
- End Bit Qty (CLAR-PROD-009).
- Subjob ↔ route-op mapping (CLAR-PROD-005).
- Pending qty reconciliation formula (CLAR-PROD-002).

### 2.5 Old workflow / weak workflow
- Manual summary entry (REF) → replace with computed quantities.
- Rework without source linkage → replace with traced rework.
- No quality gate → add mandatory inspection gate with authorized override.
- No number preview/reservation → add.

### 2.6 Missing validation / controls / audit / traceability
- Machine/operator/work-center eligibility validation (BR-PROD-020).
- Operation sequence control (BR-PROD-010) with override audit.
- Lifecycle status + audit (created/approved/cancelled by/at).
- Transaction-level traceability for every movement (Inventory system of record).

---

## 3. IMPROVEMENT PLAN (GROUPED BY PRIORITY)

### P0 (must for launch baseline)
1. Adopt DEC-PROD-001 hybrid model (final-part UX + operation events).
2. Backend-computed quantities (accepted/rejected/rework/scrap/pending/WIP).
3. Traced rework transaction (source + NCR + qty cap).
4. Operation sequence control with authorized override audit.
5. Mandatory quality gate with authorized override.
6. Material deviation-tolerance + approval workflow.
7. Document numbering (preview vs reservation, concurrency).
8. Engineering/Master-Data ownership boundaries.

### P1 (high — next)
9. Production Return with condition/disposition.
10. Consumable consumption + consumable plan.
11. Idle/stoppage reason catalogue + auto-duration.
12. Capacity assessment + work-center planning + re-allocation.
13. OEE single engine.
14. Production pending reporting (backend-computed).
15. Production delay/deviation reason capture.
16. Costing integration (MHR snapshot) + op-wise cost feed.

### P2 (medium)
17. Multiple-output entry.
18. Item change/conversion with loss/scrap + disassembly.
19. Manpower efficiency + plan-vs-actual.
20. Reports suite (plan vs actual daily/weekly/monthly, KPI, 6M, CIP, MIS, PPM).

### P3 / FUTURE
21. MRP engine, APS/capacity optimization, MPS optimization, PPAP deep integration.

---

## 4. MODULE-BY-MODULE COVERAGE CHECK

| Module | CR | REF | ZYGER | Covered in DOC 07 (domain) |
|---|---|---|---|---|
| Production Orders | WO basis | — | Composite/Single/Rework/Short Close | §02 |
| Job Management | CR-PROD-005 | — | — | §03 |
| Shop-Floor Execution | CR-PROD-001/004 | Full entry | Entry/Rework/Multiple/Log | §04, §06 |
| Material Mgmt | CR-PROD-003 | Grid | Requests/Consumables/Return | §05, §15 |
| Quality Integration | Inspect pass/fail | — | NonConformity/PPAP/PPM | §06, §14 |
| Rework/Rejection | CR-PROD-001 | radio | Rework/Reject details | §07 |
| Scrap | scrap qty | — | Scrap Generation | §08 |
| Idle/Stoppage | CR-PROD-006 | idle | Line stoppage/OEE | §09, §19 |
| Conversion | CR-PROD-002 | — | Item conversion/change/disassembly | §08 |
| Monitoring | CR-PROD-007 | pending | Production Pending/Batch Card | §12 |
| Capacity/Performance | — | machine/op | Capacity/Manpower/OEE | §12, §13, §19 |
| Planning Layer | — | — | Budget/Bucket/WorkCenter plans | §11, §12 |
| Reports/Analytics | pending | — | Full report list | §20 |

---

## 5. RECOMMENDATION SUMMARY

- **Implement** Production Core and Planning Layer fully (DOC 07/08).
- **Integrate** (do not rebuild) Engineering, Masters, Quality, Maintenance, Costing, MRP, Inventory.
- **Adopt** DEC-PROD-001 (hybrid model) — non-negotiable for traceability + UX.
- **Keep all stock movements controlled** via the Inventory module (R-PROD-006).
- **Defer** MRP/APS/MPS engines to a future module; document integration contracts now.
- **Resolve** all CLAR-PROD-xxx before freezing detailed business rules where the answer
  changes inventory/costing/workflow logic; otherwise use documented PROPOSED assumptions
  (DOC 06).

**END OF DOCUMENT 04**