# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 06 — CLARIFICATION LIST AND ASSUMPTIONS

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 06 — Clarification List and Proposed Assumptions |
| Purpose | Freeze requirement baseline; record open clarifications and documented assumptions before FRS |
| Status | ANALYSIS — ends with REQUIREMENT BASELINE gate |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

---

## TABLE OF CONTENTS

1. Clarification methodology
2. Clarification register (CLAR-PROD-*)
3. Proposed assumptions (ASM-PROD-*)
4. Approved architecture decisions summary
5. Future enhancements (deferred)
6. REQUIREMENT BASELINE FOR FRS DEVELOPMENT (gate)

---

## 1. CLARIFICATION METHODOLOGY

- Only clarifications that **materially change** business logic, inventory posting, production
  workflow, approval, costing, quality integration, or database design are listed.
- Information that can be safely determined from the documents is **not** asked.
- Where design cannot wait, a PROPOSED ASSUMPTION (ASM-PROD-*) is recorded and the requirement
  is flagged.
- MSL (Minimum Stock Level) was clarified by the customer (CLAR-PROD-001 **RESOLVED**); no
  meaning was invented prior to clarification.

---

## 2. CLARIFICATION REGISTER (CLAR-PROD-*)

Columns: CLARIFICATION ID | AREA | QUESTION | WHY REQUIRED | CURRENT ASSUMPTION | RISK IF NOT CLARIFIED | PRIORITY

| CLAR ID | Area | Question | Why required | Current assumption | Risk if not clarified | Priority |
|---|---|---|---|---|---|---|
| CLAR-PROD-001 | MSL | What does MSL mean in this business? | Zyger key points list MSL but give no definition; guessing would mis-design functionality | **RESOLVED (customer): MSL = Minimum Stock Level.** Store/inventory reorder-level concept; owned by Inventory/Store (item min stock). Production consumes the availability/shortage signal only (BR-PROD-MATL-001); does not set or store minimum levels. See ASM-PROD-015. | Mis-scoped feature or wrong reports | High → RESOLVED |
| CLAR-PROD-002 | Quantity reconciliation | Exact formula for Processed, Pending, WIP, Inspection Pending and whether rejected splits into reworkable/scrap/hold | Determines posting and every quantity field | Processed = Accepted+Rejected+Rework+Scrap; Pending and WIP are derived read-only | Wrong ledger if formula differs | High |
| CLAR-PROD-003 | Production return | Default condition/disposition on returned material and who may override | Production Return must credit store with correct disposition (usable/hold/rejected) | Returnable material is classified Good usable/JC Hold/Rejected; override by authorized supervisor | Wrong available stock or misled QC | High |
| CLAR-PROD-004 | Log sheet granularity | Level of detail and activity catalogue for Production Log Sheet; reasons list | Defines the log screen and data entry burden | Activity catalogue: Setup, Production, Tool change, Inspection, Breakdown, Material shortage, Wait, Other | Over/under-detailed logs; analysis weak | Medium |
| CLAR-PROD-005 | Subjob mapping | How Subjobs map to route-sheet operations (1:1? free?) | CR-PROD-005 subjobs vs route operations | Subjob maps 1:1 to a route operation by default; free only under authorization | Subjobs diverge from approved routing | High |
| CLAR-PROD-006 | Idle reason catalogue | Confirm controlled idle/stoppage reason list and whether free "Other" allowed | OEE/downtime classification | Controlled catalogue + "Other" (enforced text) | Inconsistent downtime metrics | Medium |
| CLAR-PROD-007 | Process Rate | Meaning of "Process Rate" (units/hr, cycle time, or other) | Values used in planning/capacity | Interpreted as standard production rate (units/hour) | Mis-computed capacity | Medium |
| CLAR-PROD-008 | Conversion cost | How conversion cost/loss/scrap is valued (which rate basis) | CR-PROD-002 conversion inventory update | Costing module values conversion; Production records qty/loss only | Cost misallocation | Medium |
| CLAR-PROD-009 | End Bit Qty | Meaning of "End Bit Qty" in reference material grid | Unclear REF field | Not used in baseline; captured only if clarified | Missing a real shop term | Low |
| CLAR-PROD-010 | Pending Sequence Only | Exact filter scope of "Pending Sequence Only" checkbox | Affects operation selection logic | Filters to operations whose prerequisite completed and qty pending | Wrong operation eligibility shown | Medium |
| CLAR-PROD-011 | Batch vs Lot | Whether batch and lot are distinct tracking dimensions and their mandatory scope | Determines traceability grain | Batch + lot are tracked dimensions; mandatory where item is batch/lot-controlled | Traceability gaps on serial/batch items | Medium |
| CLAR-PROD-012 | Quality-gate override | Authorization level/policy for overriding a mandatory quality gate | Balances control vs shop-floor urgency | Override requires authorized supervisor/engineer + reason; audited | Either stalls production or weakens quality | Medium |
| CLAR-PROD-013 | SAMPLING vs PPM | What does SAMPLING mean and how does it differ from PPM in this business | Zyger lists "SAMPLING / PPM" as report key points; guessing would mis-design inspection sampling; must NOT be silently merged with PPM | None (blocked); integration boundary only: Production shows inspection-pending/sampling status; Quality owns the sampling discipline | Mis-scoped inspection-sampling feature or wrong report | Medium |

---

## 3. PROPOSED ASSUMPTIONS (ASM-PROD-*)

| ASM ID | Assumption | Traceable requirements | Note |
|---|---|---|---|
| ASM-PROD-001 | Pending/WIP/Available quantities are backend-derived read-only from posted operation events (single source of truth). | CR-PROD-001/007, CFL-PROD-006 | If CLAR-PROD-002 changes formula, recompute only in one place |
| ASM-PROD-002 | Rework is a traced transaction referencing original production entry + authorized quantity + NCR; never a bare radio. | CR-PROD-001, CFL-PROD-002 | Strong ERP recommendation; adopt unless overruled |
| ASM-PROD-003 | Production may proceed with partial material; over-consumption requires an approved Additional Material Request or deviation approval. | CR-PROD-001, CFL-PROD-004 | Matches CNC partial-issue reality |
| ASM-PROD-004 | Master Data (Machine/Tool/WorkCenter/Operation/Shift/Employee) is owned by the Master Data module; Production references read-only. | DOC 03-§2 | Prevents duplication |
| ASM-PROD-005 | BOM/Routing/Route Sheet/Process Flow owned by Engineering; Production consumes approved versions. | CR-PROD-001, DOC 03-§2 | Prevents duplication |
| ASM-PROD-006 | Every stock movement goes through the Inventory module as a controlled stock transaction; Production never writes stock balance directly. | CR-PROD-002/003, R-PROD-006 | System of record = Inventory |
| ASM-PROD-007 | OEE is one cross-functional engine (Availability × Performance × Quality); Production supplies data; Maintenance supplies downtime; Quality supplies rejects. | DEC-PROD-005 | Prevents duplicate OEE |
| ASM-PROD-008 | MRP/MPS/APS optimization engines are external (future module); Production Planning Layer supplies plans & actuals, not the optimization engine. | CFL-PROD-003 | Resource-deferred |
| ASM-PROD-009 | Document numbers: preview may repeat; reservation is permanent once Draft/Submitted; concurrency via server-side transactional control; numbers never reused. | DOC 07-§21 | Non-negotiable rule |
| ASM-PROD-010 | "Process Rate" is interpreted as Standard Production Rate (units/hour) pending CLAR-PROD-007. | CLAR-PROD-007 | Reversible if clarified |
| ASM-PROD-011 | Multiple-output Entry supports primary output + optional co/by-products per operation; single-output is default quick mode. | CFL-PROD-012 | Matches Zyger key points |
| ASM-PROD-014 | Production Order = planning/authorization level; Work Order = execution-level instance under a PO (same entity when only one level used). | TERM-PROD-001 (DOC 07 §02) | PROPOSED; reversible if customer distinguishes them |
| ASM-PROD-015 | **MSL = Minimum Stock Level** (CLAR-PROD-001, customer-confirmed). Item minimum-stock/reorder level owned by Inventory/Store; Production is integration-only (material-availability + shortage alert via BR-PROD-MATL-001). Production does not store/set minimum levels. | CLAR-PROD-001; ZYGER MSL key point (DOC 03-§5) | Confirmed by customer; if the business later wants min-stock maintained in Production, move ownership to Inventory config FRS |

---

## 4. APPROVED ARCHITECTURE DECISIONS (REPEATED FOR TRACEABILITY)

- DEC-PROD-001 — Hybrid Final-Part-Centric Production Execution Architecture (mandatory).
- DEC-PROD-002 — Bounded production domain (ownership rules).
- DEC-PROD-003 — Production Core + Planning Layer = full FRS; external modules = integration contracts.
- DEC-PROD-004 — Every stock movement via controlled transaction.
- DEC-PROD-005 — OEE single cross-functional engine.

---

## 5. FUTURE ENHANCEMENTS (DEFERRED)

| ID | Feature | Reason deferred | Future owner |
|---|---|---|---|
| FUT-PROD-001 | MRP optimization engine | Independent planning engine | MRP/Advanced Planning |
| FUT-PROD-002 | APS / capacity optimization | Optimization not in launch scope | Advanced Planning |
| FUT-PROD-003 | MPS optimization / full Sales-Forecast engine | Forecast engine external | Advanced Planning / Sales |
| FUT-PROD-004 | Deep PPAP workflow execution | Quality-owned | Quality |
| FUT-PROD-005 | MSL (Minimum Stock Level) deep flow (reorder workflow if any) | Reserved; base meaning resolved; any deeper reorder/buying workflow is Inventory/Store-owned | Inventory/Store (via CLAR-PROD-001 → ASM-PROD-015) |

---

## 6. REQUIREMENT BASELINE FOR FRS DEVELOPMENT (GATE)

This gate freezes the baseline used by DOCUMENT 07 and DOCUMENT 08.

### 6.1 Confirmed Requirements (CR)
- CR-PROD-001..007 (Production Entry, Conversion, Return, Log Sheet, Job Card/Subjob/Completion, Idle Time, Production Pending).

### 6.2 Reference Behaviour to Retain (REF)
- Route/operation data capture; quantity categories; material consumption grid; idle-time capture; machine/operator/shift; supervisor; entry date/number.

### 6.3 Reference Behaviour to Improve (REF → PROPOSED)
- Rework → traced transaction.
- Manual summaries → computed quantities.
- Single-op screen → hybrid final-part workspace (DEC-PROD-001).
- Time/rate ambiguity → DateTime + duration + explicit rate.
- Numbering → preview vs reservation + concurrency.

### 6.4 Zyger Requirements (ZYGER)
- All Production Core, Planning Layer, Reports, OEE/PPAP items as classified in DOC 03-§5.
  MSL = Minimum Stock Level (CLAR-PROD-001 RESOLVED) → Inventory/Store ownership, Production
  integration-only.

### 6.5 Proposed Design (PROPOSED)
- DEC-PROD-001..005; structured reject/scrap; deviation approval; cost snapshot; co/by-product outputs; controlled reasons; return disposition.

### 6.6 Clarification Pending
- CLAR-PROD-001 (MSL) — **RESOLVED** = Minimum Stock Level (ASM-PROD-015).
- CLAR-PROD-002..013 — open; design proceeds using ASM-PROD-* assumptions.

### 6.7 Future Enhancement
- FUT-PROD-001..005.

### 6.8 Approved Architecture Decisions
- DEC-PROD-001 (mandatory for DOC 07/08), DEC-PROD-002, DEC-PROD-003, DEC-PROD-004, DEC-PROD-005.

### 6.9 Assumptions Used for FRS
- ASM-PROD-001..015.

### 6.10 Risks Accepted for Current FRS
- R-PROD-001..008 (DOC 01), plus open-clarification risks above. All mitigated by DEC-PROD-* and ASM-PROD-*.

### 6.11 Requirements Excluded from Current Scope
- MRP/MPS/APS optimization engines (FUT-PROD-001..003), PPAP deep workflow (FUT-PROD-004),
  MSL deep reorder workflow — **see ASM-PROD-015** (base meaning resolved; deep flow is
  Inventory/Store-owned).
- Full designs for Engineering, Inventory, Quality, Maintenance, Costing, Master Data, MRP modules (integrated only).

---

**DOCUMENT 07 references this baseline.**

**END OF DOCUMENT 06**