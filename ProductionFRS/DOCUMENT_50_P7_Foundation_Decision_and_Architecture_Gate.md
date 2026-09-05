# DOCUMENT_50 — P7-FOUNDATION DECISION AND ARCHITECTURE GATE

| Field | Value |
|---|---|
| Document ID | DOCUMENT_50 |
| Title | Production Module P7-Foundation — Decision & Architecture Gate |
| Document Type | Decision / Architecture Gate (READ-ONLY — no code, no migration, no screens) |
| Module | Production (P7-Foundation) |
| Status | **PARTIALLY_READY** — analysis complete; approvals AWAITING USER / BUSINESS APPROVAL |
| Baseline Branch | `main` |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Staged Files at Baseline | 0 |
| Ahead / Behind `origin/main` | 2 / 0 |
| Author | Senior ERP Solution Architect / Senior Full-Stack Engineer |
| Predecessors | P7 Readiness Audit (8 candidates, PARTIALLY_READY); DOCUMENT_48 / DOCUMENT_49 |

---

## 1. Executive Summary

- P7-Foundation is a **DECISION / ARCHITECTURE GATE**, not an implementation phase. This document
  reconciles every blocking production decision, analyzes each open clarification and ADR against the
  committed architecture (HEAD `0781e1a`) and the authoritative FRS, drafts recommended options, and
  states **what must be approved before implementation can safely begin**.
- **Nothing in this document is approved.** Every decision status is `AWAITING USER / BUSINESS APPROVAL`
  unless an explicit approval exists in the source material. Recommendations are offered; decisions are
  **NOT** made here.
- The P7 audit verdict (`PARTIALLY_READY`) is retained and **no P7 candidate is promoted to
  READY_FOR_IMPLEMENTATION** — several capabilities are safe to complete only after the decisions in
  Sections 5–16 are approved.
- **Highest-priority approvals** before any P7 feature work:
  1. **CLAR-PROD-002** — rejected-split / release-granularity / batch-identity semantics (derivations
     already committed; business semantics open).
  2. **CLAR-PROD-003** — return disposition contract (fixes the D-C1 default-condition risk).
  3. **CLAR-PROD-011** — batch/lot identity model (blocks Batch Card and batch reconciliation).
  4. **CLAR-PROD-012** — quality-gate default + override policy.
  5. **ADR-PROD-001** and **ADR-PROD-002** — the two blocking architecture approvals.
- The phase **STOPS after this report**: no Batch Card, no Rejection/Scrap/Rework, no Quality gate, no
  Return validation, no reconciliation engine, no Consumption History, no Multiple-Output, no P8, no P9,
  no screens, no migrations, no commit, no push.

---

## 2. Baseline Verification

Verified immediately before and after this phase (read-only; repeated in §23):

| Check | Expected | Actual | Match |
|---|---|---|---|
| Branch | `main` | `main` | ✅ |
| HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` | `0781e1a30ca881614a7b573904caf6481adcbdc9` | ✅ |
| Staged files | 0 | 0 | ✅ |
| Ahead (`origin/main...HEAD`) | 2 | `0 2` (left-right count → HEAD 2 ahead) | ✅ |
| Behind | 0 | 0 | ✅ |
| Pre-existing working-tree modifications | Not ours to clean/reset/absorb | Present (env/deploy/config files only) | ✅ unchanged |
| Untracked in-flight Production work | Protected, untouched | Present (`production/` package, `ProductionStockBoundary`, `InventoryIntegrationService`, …) | ✅ untouched |

**Documentation-context discrepancy reported (not resolved):** `DOCUMENT_18` header states
`DOCUMENT_17 (ADR Gate — APPROVED)` and "Approved architecture: DOCUMENT_17 ADR-PROD-001..005
(D1..D5 approved)", while `DOCUMENT_17` itself marks ADR-PROD-001/002 **BLOCKING — AWAITING APPROVAL**
and ADR-PROD-003/004/005 **AWAITING APPROVAL**. Per §19 of the phase brief ("do not invent
approvals"), this document treats **all ADR-PROD-001..005 as AWAITING USER / BUSINESS APPROVAL** and
records DOCUMENT_18's header as an unsubstantiated approval claim to be corrected by the approvers.

---

## 3. Source Traceability

All sources below were inspected (read-only). Nothing missing was silently substituted.

| Source | Check | Key content used |
|---|---|---|
| `ProductionFRS/DECISION_REGISTER.md` | ✅ present | DEC-PROD/ASM-PROD/TERM-PROD/CFL-PROD/NUM-PROD registry |
| `ProductionFRS/DOCUMENT_06_Clarifications_Assumptions.md` | ✅ present | CLAR-PROD-* register + ASM-PROD-* assumptions |
| `ProductionFRS/DOCUMENT_07_Production_Module_FRS.md` | ✅ present | FR-PROD-REJ/SCRAP/RETURN/BATCH-001, BR-PROD-QA-001, NUM-PROD-*, §14 quality gate, §21/§22/§23 |
| `ProductionFRS/DOCUMENT_10_Business_Rules_and_Logic.md` | ✅ present | QTY-RECONCILE, CONV/DISASM-RECONCILE, BR-PROD-INV-003, BR-PROD-MATL-001/003, BR-PROD-REJ/SCRAP-001, BR-NUM-001, BR-WF-001, SCRAP-AUTHORIZE |
| `ProductionFRS/DOCUMENT_15_Production_Development_Backlog.md` | ✅ present | BK-009 (subjob), BK-011 (quality gate), BK-018 (WIP view), BK-019 (return), BK-020 (rejection), BK-026/036 (conversion/costing) |
| `ProductionFRS/DOCUMENT_17_Production_Architecture_Decision_Record.md` | ✅ present | ADR-PROD-001..005 (AWAITING APPROVAL) |
| `ProductionFRS/DOCUMENT_18_Production_Implementation_Execution_Plan.md` | ✅ present | P0–P13 phases; §20 forbidden files (contradiction reported in §2) |
| `ProductionFRS/DOCUMENT_45_Production_Functional_Roadmap_and_Transaction_Dependency_Architecture.md` | ✅ present | Capability A/B/C/D dependency analysis; recommended next = Capability A |
| `ProductionFRS/DOCUMENT_45_Production_Module_Master_Functional_Architecture_and_Dropdown_Structure.md` | ✅ present | Navigation/dropdown structure incl. Batch Card Control, Rework/Rejection Management |
| `ProductionFRS/DOCUMENT_47_Production_Module_Completion_Decision_and_Implementation_Roadmap.md` | ✅ present | Gap matrix (G6/G10–G18/G33/G34/G36) with blocker mapping |
| `ProductionFRS/DOCUMENT_48_Production_Inventory_Integration_Architecture_Decisions.md` | ✅ present | ADR-001/002 (synchronous same-tx StockService delegation; outbox deferred) |
| `ProductionFRS/DOCUMENT_49_Production_Quantity_Reconciliation_and_WIP_Decision.md` | ✅ present | Authoritative WIP/derivation formula + OPEN remainder (CLAR-PROD-002) |
| `DOCUMENT_06` CLAR entries CLAR-PROD-002/003/005/008/011/012 | ✅ present | Full register read (§2 of DOC_06) |
| `DOCUMENT_17` ADR entries ADR-PROD-001..004 | ✅ present | Full records read |

No separate per-CLAR or per-ADR files exist beyond DOCUMENT_17 / DOCUMENT_06 (they are the registers).
All referenced documents **present** — none reported `NOT FOUND`.

---

## 4. Existing Architecture (committed at HEAD `0781e1a`)

### 4.1 Committed production domain (verified `git ls-files`)

- **Execution records:** `ProductionEntry` (+ `ProductionEntryMaterial`, `ProductionEntryOperator`,
  `ProductionEntryRejection`, `ProductionEntryRework`, `ProductionEntryBatch`,
  `ProductionEntryAuditLog`); `JobCard` / `JobCardSubjob`; `WorkOrder`; `RouteSheet` / `RouteOperation`.
- **Normalized projection (P3/P3.3, committed, flag-gated):** `ProdExecutionSession`,
  `ProdOperationEvent`, `ProdOutputEvent` (+ repos), `ProductionNormalizedEventService`,
  `ProductionInputAuthorityResolver`. Projection emits **no stock postings**; upsert idempotent by
  natural key (`findByEntryNumber` / `findByJobCardNumber`); session statuses OPEN / COMPLETED /
  CANCELLED / REVERSED; outputs OUT_ACCEPTED / OUT_REJECTED / OUT_REWORK / OUT_SCRAP with reasons.
- **Boundary docs (committed):** `ProductionReturn` (+ repo);
  `ProductConversion` / `ProductConversionInput` / `ProductConversionOutput` / `ProductConversionLoss`.
- **No committed `ProductionOrder` entity/service** — the canonical Production Order exists only in FRS
  (ADR-PROD-002). The untracked `production/` package contains `ProductionOrderController`/`Service`
  as `UNTRACKED DESIGN EVIDENCE ONLY` (not authoritative, not absorbed).
- **Controllers:** `ProductionController` (1166 lines) — job cards, subjobs, entries,
  `product-conversion` CRUD + actions (lines 637–730), `production-return` CRUD + actions
  (lines 732–801), log sheets. Posting path of `production_entry` (lines 336–434) emits **no stock
  postings** (only subjob roll-up + normalized projection + audit).

### 4.2 Committed inventory boundary

- All production stock writes route through `StockService`: conversions at `recordStockOut/In`
  (`CONVERSION_OUT`, `CONVERSION_IN`) and returns at `recordStockIn` (`RETURN_RECEIPT`). No production
  class writes `stock_ledger`/`stock_balance` directly (DEC-PROD-004 honored).
- **StockStatus semantics (committed, `StockService.balances()`):** only `FREE` and `QC_HOLD` rows are
  counted (free ↔ onHand/available; QC_HOLD ↔ qcHold). **Every other stockStatus — including
  `BLOCKED`, `SCRAP`, and any unrecognized value — is silently not counted** in `onHand`/`available`.
  `recordStockIn` defaults a blank `stockStatus` to `"FREE"`.
- Idempotency: ledger `existsByDocNoAndDocType` → silent no-op; `StockBalance` unique key
  `(item, location, batch, heat, stock_status)`.

### 4.3 Numbering

- Committed controllers call `DocNumberService.next("production-return", "PR")`,
  `next("product-conversion", "PC")`, `next("production-log-sheet", "PLS")`. **None** of
  `production-return` / `product-conversion` / `production-entry` / `production-log-sheet` /
  `batch-card` are present in `doc/DocTypes.java` (grep empty), i.e. these doc types are **not
  registered in the DocumentFacade numbering_config catalog**; they use direct `next()` with literal
  docType + prefix (plant/FY-aware `nextNumberFromConfig` not exercised for these).

### 4.4 Registered state-machine flows

- `WorkflowStateMachine` registers `product-conversion` and `production-return` transition maps, and
  `material-request` `ISSUED → {CLOSE, CANCEL}` (P6.4). The committed `ProductionController` return
  flow drives status via inline `switch` (submit/verify/receive/cancel) without `validateTransition`
  — statuses coincide for the normal path (DRAFT→SUBMITTED→VERIFIED→RECEIVED), out-of-band transitions
  are nominally reachable (noted earlier as GOOD PRACTICE / test-gap, not P7 defect).

### 4.5 Quality gate

- **No production posting quality-gate exists.** The only committed final-inspection gate is the
  sales-dispatch path (`DocumentFacade.enforceFinalInspectionGate`). Production op advancement /
  next-op routing is not gated in the committed code (BK-011 not implemented).

---

## 5. Decision Register — Reconciliation Matrix

Legend: `S` = Status · `R` = Reversibility · `A` = Approval source · `Impl-start` =
"can implementation safely start without approval?" (columns 2, 15, 17, 19 merged where compact).

**Blocking decision register (all `AWAITING USER / BUSINESS APPROVAL`):**

| # | Decision ID | 1. ID | 2. Current status | 3. Source | 4. Existing assumption | 5. Why it matters | 6. Modules affected | 7. DB impact | 8. API impact | 9. Frontend impact | 10. Inventory impact | 11. Quality impact | 12. Costing impact | 13. Planning impact | 14. Production impact | 17. Recommended architecture | 18. Approval required from | 19. Safe to start w/o approval? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | CLAR-PROD-002 | CLAR-PROD-002 | OPEN (derivations evidenced; business semantics open) | DOC_06 §2; DOC_49 §7; DOC_47 G5/G10/G11/G35 | ASM-PROD-001 (derived read-only); WIP formula already committed | Wrong ledger/WIP if split semantics differ | Production, Inventory (posting), Reporting | None (derivations exist) | Read-only query dependencies | WIP/Pending columns | Availability target only | — | — | Uses pending for release | WIP/Pending/Release model | Retain committed formula; extend per decision in §6 | Business / Production SME + Architect | **No** for WIP/posting impact; yes for read-only lists (DOC_47) |
| 2 | CLAR-PROD-003 | CLAR-PROD-003 | OPEN | DOC_06 §2; DOC_07 FR-PROD-RETURN-001; DOC_10 BR-PROD-INV-003; DOC_48 ADR-002 | Return credited per disposition (Good/QC-Hold/Rejected); override by supervisor | D-C1: unknown/rejected condition may credit FREE | Production, Inventory, Quality | StockAllotment/balance semantics | RETURN_RECEIPT contract | Return screen disposition | stockStatus mapping | Condition/QC hold ownership | Value on return | — | Return crediting | Strict disposition→stockStatus contract (§7) | Business / Inventory + Production SME | **No** (blocked by D-C1) |
| 3 | CLAR-PROD-005 | CLAR-PROD-005 | OPEN | DOC_06 §2; DOC_07 CR-PROD-005; DOC_15 BK-009; DOC_47 G34 | Subjob maps 1:1 to a route op by default; free only under authorization | Subjobs may diverge from approved routing | Production, Engineering | JobCardSubjob.routeOperationId already present | Subjob creation API | Job card/subjob UI | — | — | — | Uses route ops | Subjob⇄RouteOp enforcement | 1:1 default + authorized exception (§8) | Production/Planning owner + Architect | **No** for enforcement; yes for data-only reads |
| 4 | CLAR-PROD-011 | CLAR-PROD-011 | OPEN | DOC_06 §2; DOC_07 FR-PROD-BATCH-001; DOC_47 G12 | Batch+lot tracked; mandatory where item batch/lot-controlled | Batch Card + batch reconciliation depend on identity grain | Production, Inventory, Quality, Engineering | Batch identity across receipt/issue/output | Batch endpoints | Batch Card screen | Batch availability/allotment | Batch QC status | Batch cost | Batch/lot planning | Batch execution | Batch Card as execution+traceability doc (§9) | Business / Production + Inventory SME | **No** (blocker) |
| 5 | CLAR-PROD-012 | CLAR-PROD-012 | OPEN | DOC_06 §2; DOC_07 §14; DOC_10/BR-PROD-QA-001; DOC_47 G33 | Gate enforced by default; audited override (CFL-PROD-010) | Production could advance past failed/held inspection | Production, Quality | None (gate is validation) | Entry/op-action API | Override dialog | FG receipts only after pass | Inspection status consumption | — | Release gates | Op advancement | Default enforce; audited override (§10) | Quality + Production SME | **No** |
| 6 | ADR-PROD-001 | ADR-PROD-001 | AWAITING APPROVAL — BLOCKING | DOC_17 D1; DOC_18; DOC_45 | Additive migration; events authoritative; legacy retained read-only | Events are the target source of truth; backfill/dedup contract | Production (all) | prod_* tables (already created) | additive op-event APIs | Entry workspace | via StockService only | dispositions | events feed cost | reads events | Authoritative events | ADOPT additive migration; cutover gated P12 | Lead Architect + DB Owner + Tech Lead | **No** (architecture prerequisite) |
| 7 | ADR-PROD-002 | ADR-PROD-002 | AWAITING APPROVAL — BLOCKING | DOC_17 D2; TERM-PROD-001 | Canonical PO on existing `work_order` | Duplicate concept risk (WO vs PO vs prod_order) | Production, Planning | work_order discriminator (additive) | PO-named APIs | "Production Order" UI | — | — | — | PO planning/authorization | PO/WO lifecycle | Canonical PO on work_order (§12) | Lead Architect + Planning/Production owner | **No** |
| 8 | ADR-PROD-003 | ADR-PROD-003 | AWAITING APPROVAL | DOC_17 D3 | Per-document REUSE/EXTEND/REFACTOR/CREATE NEW | Consistency of new first-class docs w/ existing flows | Production, Quality, Inventory | new prod_* doc tables | additive endpoints | new screens | dispositions | NCR | value context | — | first-class docs | Register as-is; verify internal consistency (§13) | Lead Architect | No (follows D1/D2) |
| 9 | ADR-PROD-004 | ADR-PROD-004 | AWAITING APPROVAL | DOC_17 D4 | REUSE DocNumberService + doc_sequence + numbering_config | Numbering consistency (PR/PC/CV/BC) | Production | numbering_config seeds (additive) | number endpoints | server-assigned numbers | — | — | — | — | all docs | REUSE + register (§14) | Lead Architect | Partially (after doc-type registration) |
| 10 | ADR-PROD-005 | ADR-PROD-005 | AWAITING APPROVAL | DOC_17 D5; DOC_48 ADR-002 | REUSE StockService; no direct balance writes | Every movement through controlled engine | Production, Inventory | none | same | none | all postings | dispositions | — | — | all inventory moves | REUSE synchronous same-tx delegation (DOC_48) | Lead Architect | Yes (already the committed behavior) |
| 11 | CLAR-PROD-008 | CLAR-PROD-008 | OPEN (related) | DOC_06 §2; DOC_15 BK-026/036 | Costing values conversion; Production records qty/loss only | Cost allocation correctness | Costing, Production | none | conversion APIs | conversion UI | conversion stock intents | — | valuation | — | conversion/consumption | qty/loss by Production; value by Costing | Business / Costing | Yes for qty/loss flows |

> **Confirmation of status:** Columns 2 match the received instruction ("current status"). Every item is
> `AWAITING USER / BUSINESS APPROVAL`; no approval was found in the source material for any item above.
> The DOCUMENT_18 header claim of approved ADRs is the only contrary text and is treated as an error (§2).

---

## 6. CLAR-PROD-002 — Quantity / WIP / Reconciliation

**Authoritative formula (retained — NOT replaced; DOCUMENT_49 §6):**
`WIP = max(resolvedInput − (good + rejected + rework + scrap), 0)` with `resolvedInput` from
`ProductionInputAuthorityResolver`; `pending = planned − completed` (computed on demand);
`produced = good + rework + rejected`. All derivations committed; `pending_qty` persisted column on
`work_order` is **not actively maintained** (treat as computed).

### A. Rejected split semantics (OPEN)
`rejected` is a total on the entry; how it partitions into reworkable / scrap / hold is **undefined by
committed code**. Committed QTY-RECONCILE (DOC_10 §4) already defines the disposition targets:
`REWORKABLE → rework route (no ledger move); SCRAP → SCRAP txn; HOLD_MRB → quarantine/block`.
Options to approve:
- **R1 (recommended): bondage to disposition documents** — `rejected` is fully classified when its
  disposition records exist (reworkable→rework doc; scrap→scrap doc; hold→hold/quarantine); an
  unclassified remainder stays `rejected` and WIP shows it. Requires ADR-PROD-003 first-class docs.
- R2: static per-entry classification buckets (reworkable/scrap/hold columns) — simpler, but duplicates
  first-class docs and risks divergence.
- R3: deferred split — `rejected` remains a raw total (no partition) until P7 docs built. Lowest
  immediate value.

### B. Release granularity (OPEN)
`released = planned minus released deltas (if partial release)` is OPEN (DOC_49 row 2). Options:
- **G1 (recommended): document (order)-level release** — release is a status transition on the
  Production Order; quantities planned→released as one block; partial release not supported initially.
- G2: order-level release with line/operation partial release (matches `pending` release deltas) — more
  flexible, requires release-transaction tracking.
- G3: batch-level release — only meaningful after CLAR-PROD-011.

### C. Reconciliation granularity (OPEN)
Options: item-level · production-entry-level · subjob-level · operation-level · batch-level. Recommended:
**operation-level as the authoritative reconciliation grain** (matching the committed op-event model),
with entry-level roll-up and item-level views derived; batch-level only where the item is batch-controlled
(CLAR-PROD-011) and reconciled **per batch** at consumption/output.

### D. Overproduction / underproduction
- Overproduction: output total may exceed planned; **allowed only with an approved Additional-Material /
  deviation context** (ASM-PROD-003 / BR-PROD-MATL-001 style), otherwise `accepted > planned remainder`
  should be flagged. No committed rule exists — decision required on whether output totals bind to
  planned or may exceed with approved reason.
- Underproduction: remainder flows into `pending` (computed) and short-close disposition
  `{CANCEL, SCRAP, RETURN}` per BR-PROD-ORDER-004. Committed partial support only.

### E. Negative WIP
**Not valid.** Committed WIP formula floors at zero (`max(..., 0)`) — retained. Negative WIP is a
reconciliation error (over-consumption input vs output) and must be surfaced as a defect (per-processed
check), not stored.

```
CLAR-PROD-002 DECISION REQUIRED:
  A) approved split semantics (recommend R1)      — AWAITING USER / BUSINESS APPROVAL
  B) release granularity (recommend G1 first pass) — AWAITING USER / BUSINESS APPROVAL
  C) reconciliation grain (recommend operation)    — AWAITING USER / BUSINESS APPROVAL
  D) over/under-production binding rule            — AWAITING USER / BUSINESS APPROVAL
  E) negative WIP invalid (retain floor)           — AWAITING USER / BUSINESS APPROVAL
```

---

## 7. CLAR-PROD-003 — Production Return Disposition

### 7.1 Existing behavior (committed, FACT)
`ProductionReturn.receive()` maps `condition` → `stockStatus`:
```
SCRAP -> "SCRAP"; REWORK | QC_HOLD -> "QC_HOLD"; otherwise -> "FREE"
```
`StockService.recordStockIn` defaults blank → `"FREE"`; `balances()` counts **only FREE and QC_HOLD**.
Consequences (the D-C1 risk): a return with condition `REJECTED`/`RMA`/unknown becomes **FREE available
stock**; condition `SCRAP` writes an **uncounted** balance row (invisible, not a scrap disposal).

### 7.2 Proposed authoritative disposition model (cross-module contract)
| Disposition | Meaning | stockStatus to write | Inventory effect | Owners |
|---|---|---|---|---|
| GOOD (Good usable) | returnable, usable | `FREE` | credited to available | Production records; Inventory credits |
| QC_HOLD | suspected; awaiting QC decision | `QC_HOLD` | counted in qcHold, **not available** | Production records; Quality disposition |
| REJECTED | non-conforming; may not return as usable | **NOT `FREE`** — map to `QC_HOLD` (segregated) pending disposition **or** a controlled rejection/scrap posting | segregated; not available | Production defines; Quality decides disposition; Inventory enforces |
| SCRAP | irrecovable | do **not** write an invisible `SCRAP` balance; use a controlled scrap posting path (SCRAP TXN semantics via Inventory) | disposal; feeds scrap report | Production + Inventory (SCRAP-AUTHORIZE) |
| REWORK | return for rework loop | `QC_HOLD` until rework disposition | held, not available | Production/Quality |

Contract rules (to be approved, not enacted):
1. **Mandatory disposition:** `condition` is required on any return that posts inventory.
2. **Default disposition:** if unspecified and the item is batch/lot-controlled → `QC_HOLD`; otherwise
   → `GOOD`; **never** an implicit `FREE` from an unknown value.
3. **Unsupported condition:** reject the receive (validation error listing the supported set) — do not
   fall through to `FREE`.
4. **Override** (GOOD↔QC_HOLD or disposition change after posting) requires authorized supervisor +
   mandatory reason + user/time/audit (mirrors ASM-PROD-009/BR-WF-001); overrides reverse/adjust the
   ledger via Inventory-controlled reversal.
5. **NCR requirement:** REJECTED/SCRAP dispositions require an NCR reference (Quality-owned) before
   posting — aligns FR-PROD-REJ-001.
6. **Rework-route requirement:** REWORK disposition requires a rework route/entry reference
   (ASM-PROD-002).
7. **Customer return implications:** any customer-returned-lot dimensions (lot, batch, source customer
   order) are captured as traceability attributes; no credit without disposition.
8. **Traceability:** return links to source issue / consumption / batch (see D-C2).
9. **stock-status mapping:** the supported output set is `FREE` / `QC_HOLD` (+ controlled
   scrap/rejection disposal path); unrecognized values are rejected at the boundary.
10. **Inventory ownership of correctness:** Inventory enforces the mapping; Production supplies the
    disposition fact; Quality owns disposition for REJECTED/HOLD.

```
CLAR-PROD-003 DECISION REQUIRED — AWAITING USER / BUSINESS APPROVAL
(options: strict enum {GOOD, QC_HOLD, REJECTED, SCRAP, REWORK} + default QC_HOLD for controlled items +
unsupported-condition rejection + audited override + NCR/rework linkage) — recommended per §7.2.
```

---

## 8. CLAR-PROD-005 — Subjob ↔ Route Operation

### 8.1 Committed evidence
`JobCardSubjob` (committed) carries `operationCode`, `operationDescription`, `sequenceNo`,
`machineCode`, `workCenterCode`, `routeDetailId`, `routeOperationId` (+ roll-up qty columns).
`RouteSheet` / `RouteOperation` committed. Relationship model is a **data hook** only — no enforcement
of any cardinality exists in `ProductionController` post path (subjobs are matched by
`operationCode.equalsIgnoreCase`).

### 8.2 Proposed model
- **Cardinality: 1:1 by default (validated), N:1 (multiple subjobs for one route operation) only under
  authorization** — one subjob represents exactly one route operation; multiple subjobs may represent the
  same operation only when split execution is authorized (e.g. rework/partial lots).
- **Rework operations:** represented as subjobs linked to a rework route/operation referencing an
  original entry (ASM-PROD-002 / BR-PROD-002) — not as duplicate sequence steps.
- **Skipped operations:** allowed only with authorized override + reason (BR-PROD-010 override pattern).
- **Sequence enforcement:** derive from `sequenceNo / routeDetailId`; enforce order at subjob
  completion (prerequisite-op gate).
- **Route change after execution start:** frozen to the originally assigned route operation for posted
  entries; changes require a deviation/exception document (FR-PROD-EXCP) and audit.
- **PO → Route relation:** Production Order (canonical, ADR-PROD-002) → Route Sheet (Engineering,
  read-only) → Job Card → subjob(bound route op) — matches DOC_07 §03 chain.

```
CLAR-PROD-005 DECISION REQUIRED — AWAITING USER / BUSINESS APPROVAL
(options: mandatory 1:1 / optional 1:1 / 1:N with authorization / free) — recommended 1:1-validated with
authorized N:1 exceptions and frozen-on-post route binding (§8.2).
```

---

## 9. CLAR-PROD-011 — Batch / Lot Dimensions

### 9.1 Vocabulary
| Concept | Proposed meaning | Notes |
|---|---|---|
| Batch | a produced/purchased quantity unit sharing identity (batch_number) | graph grain for movements |
| Lot | supplier/customer-facing dimension, optionally distinct from production batch | only if business tracks both |
| Heat number | metallurgical identifier captured at receipt/output | existing `heatNo` column in StockService |
| Supplier / customer batch | reference metadata on receipt/sales context | traceability attributes |
| Batch number generation | when batch is created by production independent of DocNumberService (physical identity) or internal `BN-...`; BC numbering is the document number, not the physical batch number | separate concerns |

### 9.2 Mandatory scope
Batch identity **required** at: receipt, issue, consumption, production output, rejection, rework,
scrap, return, conversion **for batch/lot-controlled items only**; optional otherwise. This is the
`batch_type` decision (below). Controlled-item flag lives in Item master (Inventory/Engineering-owned).

### 9.3 `ProductionEntryBatch.batchType` analysis
Committed values `OUTPUT` (default) / `INPUT` / proposed extensions `REJECT` / `REWORK` / `SCRAP`.
These are **current implementation values on a per-entry batch child**, not yet an authoritative
business taxonomy. Recommended: keep the per-entry child as the **execution batch capture**; treat
`OUTPUT/INPUT` as authoritative concepts and add `REJECT/REWORK/SCRAP` **only** if disposition docs
(ADR-PROD-003) attach batch identity — otherwise derive batch context from disposition documents rather
than duplicating values on the child.

### 9.4 Batch Card (`BC-{PLANT}-{FY}-{SEQ}`)
- **Architecture (recommended): Batch Card = execution + traceability record (a document), not a master.**
  It is the shop-floor aggregation of a physical batch's movements (creation, issue, consumption,
  output, scrap, receipt) with status open/held/closed per FR-PROD-BATCH-001.
- **Numbering:** `NUM-PROD-BATCH` per DOC_07 §21.2 — registration required via ADR-PROD-004 (direct
  `next()` is insufficient for plant/FY scope).
- **Requires:**
  - DocTypes registration + `numbering_config` seed (ADR-PROD-004);
  - workflow + status (open/held/closed) modeled on BR-WF-001;
  - audit trail (AuditEntityListener / doc_status_history);
  - links to Production Entry, Job Card, Route Operation, and **Inventory batches** (StockBalance
    batch identity).
- `BC-{PLANT}-{FY}-{SEQ}` is the **document** number; the physical batch number is a separate identity.

```
CLAR-PROD-011 DECISION REQUIRED — AWAITING USER / BUSINESS APPROVAL
(options: distinct line vs combined; mandatory scope = controlled items only; batch card = document vs
master; batchType taxonomy) — recommended §9.1–§9.4.
```

---

## 10. CLAR-PROD-012 — Quality Gate / Override

### 10.1 Registered facts
- `BR-PROD-QA-001` (DOC_07 §14): an operation with required inspection cannot advance to the next
  operation until inspection accepts; override allowed only with authorization + audit.
- `CFL-PROD-010` (DECISION_REGISTER): gate enforced by default; authorized override records
  reason/user/time/audit.
- Note: `ASM-PROD-012` is **Reserved (not assigned)** in DECISION_REGISTER yet referenced in DOC_07 —
  an inconsistency to be corrected by the approvers (recommend assigning ASM-PROD-012 when the policy is
  approved).
- Committed code: **no production gate** today (only the sales-dispatch gate). BK-011 unimplemented.

### 10.2 Proposed policy (decision options)
- **Default behavior:** block operation advancement (next-op, completion, FG receipt) while the required
  inspection for the operation is `PENDING` / `FAIL` / `HELD`. Gate is evaluated at op/subjob
  completion and at Production Entry post.
- **Override:** allowed only with: authorized role (Quality Supervisor **and** Production Supervisor
  jointly, or Plant Head), mandatory reason, user + timestamp (audit persisted). **One-time, per
  affected unit** (applies to the specific operation/entry, not reusable, not global). Override scope =
  **operation-level** quantity/document under override, not the whole order, not a standing batch.
- **Ownership:** shared contract — **Production** supplies the gate evaluation point and holds the
  override UI; **Quality** owns inspection result authority, PPAP block, NCR; the **contract** defines
  statuses consumed (Inspection Status PENDING/PASS/FAIL/HELD + reference + NCR) per DOC_07 §14.
- Override must not override PPAP-mandatory blocks (PPAP block is Quality-authoritative).

```
CLAR-PROD-012 DECISION REQUIRED — AWAITING USER / BUSINESS APPROVAL
(recommended: default-enforced gate at op completion + one-time audited joint-supervisor override at
operation scope; PPAP blocks non-overridable).
```

---

## 11. ADR-PROD-001 — Normalized Operation Event Model

### 11.1 Readiness review against committed code (FACT)
| Aspect | State |
|---|---|
| Problem | wide-row `production_entry*` cannot host first-class Rej/Scrap/Rework or op axis |
| Current architecture | `production_entry*` (authoritative writes) + read-only normalized projection |
| Proposed architecture | `prod_*` events authoritative; legacy retained read-only; additive backfill |
| Event ownership | Production writes; projection derives sessions/events |
| Source events | `production_entry` posts / subjob updates (committed in `productionEntryAction.post`) |
| Normalized events | `prod_execution_session` / `prod_operation_event` / `prod_output_event` (committed) |
| Idempotency | natural-key upsert (`findByEntryNumber`, `findByJobCardNumber`) + idempotency-key guard on post (committed) |
| Ordering | operation events ordered per session; sequence from route `sequenceNo` (no cross-op enforcement yet) |
| Transaction boundary | projection runs in the same TX as the entry post (`@Transactional` action) |
| Replay behavior | re-emission idempotent by natural key; no stock postings |
| Historical backfill | **deferred to P12 gate** (DOC_18) — no backfill yet |
| Migration compatibility | additive; legacy retained; reconciliation `Σ(new) == Σ(old)` gate |
| Reporting impact | roll-ups derive from events; dashboards continue on legacy reads during transition |
| Rollback strategy | feature-flagged writer; legacy writer default-active until P12 gate |

### 11.2 Unresolved technical risks (identify only — do not resolve)
1. **Authoritative cutover undone:** events are derived from legacy writes; making events the *writer*
   target is P12-gated and not yet present.
2. **Backfill design absent:** D1 field-map / idempotent INSERT…SELECT not yet delivered (DOC_17 §X-3).
3. **Cross-operation ordering/sequence gate** not enforced (needs CLAR-PROD-005).
4. **`ProductionReturn` / `ProductConversion` are NOT in the event spine** — ADR-PROD-001 covers
   entries only; conversion/return must be reconciled against the event model before approval or the
   scope must be made explicit.

**ADR-PROD-001 readiness:** direction sound and partially implemented; **approval is still required** and
should name the exact scope (entries only vs entries+return+conversion) and confirm the cutover/backfill
gate.

---

## 12. ADR-PROD-002 — Production Order Terminology

Canonical model (recommended) and entity map:

| Business term | Canonical term | Parent–child | Lifecycle owner | Numbering | API naming | UI naming | DB naming | Reporting naming |
|---|---|---|---|---|---|---|---|---|
| Production Order | **Production Order** | root (planning/authorization) | Production (Planning owner) | `PO-` (NUM-PROD-ORDER) | `production/orders` | Production Order | `work_order` (+ discriminator) | Production Order |
| Work Order (execution instance) | Work Order / Job | child of PO | Production | `WO-` (if distinct) / via JO | `production/work-orders` | Work Order / Job | `job_card` / `work_order` (execution) | Work Order |
| Job Card | Job Card | child of PO / WO | Production | `JC-` (NUM-PROD-JOBCARD) | `production/job-cards` | Job Card | `job_card` / `prod_job_card` | Job Card |
| Subjob | Subjob | child of Job Card, bound to Route Op | Production | internal | under job-card | Subjob | `job_card_subjob` | Subjob |
| Route Sheet | Route Sheet | read-only Engineering ref | Engineering | internal | engineering API | Route Sheet | `route_sheet` / `route_operation` | Route Sheet |
| Production Entry | Production Entry | operation execution parent | Production | `PE-` (NUM-PROD-ENTRY) | `production/entries` | Production Entry | `production_entry` / `prod_operation_event` | Production Entry |
| Prod. Execution Session | Session | derived from entry/op | Production | — | read-only | — | `prod_execution_session` | Session |

- **Canonical term:** Production Order. Aliases: Work Order (legacy), prod_order (never implemented);
  per DOC_17 D2 O1 → **`work_order` stays the table**. **No rename of code or migration in this phase.**
- ADR-PROD-002 remains **AWAITING USER / BUSINESS APPROVAL** (as does D2's discriminator design).

---

## 13. ADR-PROD-003 — First-Class Document Register Consistency

Cross-check of the D3 register (DOC_17) against committed reality:
- **Rejection / Scrap / Rework = CREATE NEW** — consistent: committed `production_entry_rejection` /
  `production_entry_rework` are child rows (clean backfill source); `prod_rejection*`/`prod_scrap*`/
  `prod_rework_event` are not yet present. Remaining consistency to confirm at implementation: batch
  identity on these docs (CLAR-PROD-011), NCR linkage (Quality), scrap disposition posting via
  Inventory (BR-PROD-SCRAP-001), rework cap (BR-PROD-REWORK-001 / BR-PROD-ENTRY-002).
- **Production Return = EXTEND** — consistent: `production_return` committed; extension = disposition
  contract (CLAR-PROD-003) + binding (D-C2).
- **Conversion = EXTEND/REFACTOR** — consistent: `product_conversion*` committed; extension =
  qty/loss-only + Costing valuation (CLAR-PROD-008), numbering consistency (§14).
- **Material Request / Consumption = CREATE NEW** — consistent with P6 handling (`material-request` doc
  flow committed via stock-allotment; consumption posted via StockService).
- **NC/Deviation/Stoppage/ItemChange/Disassembly = CREATE NEW** — not present; future.

Register is internally consistent; only the block listed above must be re-verified at build time.
ADR-PROD-003 remains AWAITING approval (non-blocking, follows D1/D2).

---

## 14. ADR-PROD-004 — Numbering Consistency

| Doc | FRS format (DOC_07 §21.2) | Committed prefix | Registration status |
|---|---|---|---|
| Production Return | `PR-{PLANT}-{FY}-{SEQ}` | `PR` (via `next("production-return","PR")`) | docType **not** in `DocTypes`/`numbering_config` |
| Product Conversion | `CV-{PLANT}-{FY}-{SEQ}` | `PC` (via `next("product-conversion","PC")`) | **prefix mismatch (`PC` vs `CV`)** + type not registered |
| Material Request | `PM-{PLANT}-{FY}-{SEQ}` | P6 material-request flow | type not registered (DocNumberService path) |
| Material Consumption | (—) | via production-consumption posting | type not registered |
| Batch Card | `BC-{PLANT}-{FY}-{SEQ}` | none | not implemented; must register (CLAR-PROD-011) |
| Rejection | `REJ-{PLANT}-{FY}-{SEQ}` | none | first-class doc not implemented |

- **Findings:** numbering engine reuse is right (ADR-PROD-004 O1 sound), but **production doc types are
  not registered** in the configurable catalog; `next()` direct call bypasses plant/FY-aware
  `nextNumberFromConfig`. The `PC` vs `CV` prefix deviation must be resolved (config seed choice).
- **Recommended:** register all production docTypes via numbering_config seeds (additive); prefer the
  FRS `CV` default or an explicit business choice; keep BR-NUM-001 (never reused). **No numbering change
  in this phase.**

---

## 15. Return Safety — D-C1 (unknown/disposition condition → FREE)

**Design-level analysis only.**
- **Problem (committed):** `ProductionReturn.receive()` falls through to `"FREE"` for any condition not
  `SCRAP`/`REWORK`/`QC_HOLD` (`REJECTED`, `RMA`, typo, null-with-qty); and `SCRAP` writes an invisible
  (uncounted) balance status. `StockService` only understands `FREE`/`QC_HOLD` as counted.
- **Safe contract (recommended, awaiting approval):**
  1. Supported disposition enum at the boundary (`GOOD`, `QC_HOLD`, `REJECTED`, `SCRAP`, `REWORK`) —
     validate on `save`/`receive`; **unknown value → validation error, not FREE**.
  2. Use only the two inventory-counted statuses for balances: `FREE` (GOOD) and `QC_HOLD`
     (REJECTED/QC_HOLD/REWORK pending decision). Do **not** write `SCRAP`/arbitrary statuses into
     `stock_balance`.
  3. Scrap disposition handled as a controlled scrap posting (Inventory-owned), never as an uncounted
     balance row.
  4. If a countable "REJECTED (segregated)" is required, extend the Inventory contract explicitly
     (new status with defined counting semantics) via a **separate ADR** — not a production shortcut.
- **Risk of not deciding:** returns of non-conforming material silently inflate available stock
  (D-C1 live today behind the committed default).

## 16. Return Safety — D-C2 (no bound check / no linkage)

**Design-level analysis only.**
- **Problem (committed):** `createReturn`/`receive` do not enforce `returnQty ≤ issuedQty − consumedQty`
  and record no link to the originating issue/allotment.
- **Validation ownership:** the **business bound** (`returnQty ≤ issued − consumed`) belongs to
  **Production** (it holds issue/consumption facts); the **ledger credit** belongs to **Inventory**
  (StockService). Recommended: Production validates the bound against `ProductionEntryMaterial` +
  `ProductionConsumption` (`returnQty ≤ issued − consumed` mirrors the committed material-return rule),
  then delegates the IN movement to Inventory — **both** sides, contractual.
- **Linkage contract (recommended):** a Production Return links to (where applicable) the **Production
  Entry / Material Request / Material Consumption / Stock Allotment / Production Order / Job Card** via
  `originalIssueReference` (already on `production_return`) plus an explicit allotment/consumption
  identifier, so dedupe and audit are single-source.
- **Not implemented here.** Any enforcement waits for CLAR-PROD-003 + this contract approval.

---

## 17. P7 Candidate Reclassification (post-foundation analysis)

Exactly one classification per candidate. **No promotion to READY.**

| Candidate | P7 audit classification | Post-foundation classification | Rationale / blocker |
|---|---|---|---|
| A — Consumption History | FUTURE_ROADMAP | **FUTURE_ROADMAP** | sources committed; report-only; needs CLAR-PROD-002 final formula + costing EP-11 (BK-036); not blocked by ambiguity → roadmap |
| B — Batch Card | BLOCKED_BY_CLARIFICATION | **BLOCKED_BY_CLARIFICATION** | CLAR-PROD-011 (identity grain) + ADR-PROD-004 registration; no allocation rule |
| C — Return Disposition | IMPLEMENTED_WITH_LIMITATION | **IMPLEMENTED_WITH_LIMITATION** | browse/workflow committed; any change blocked by CLAR-PROD-003 + D-C1/D-C2 contract |
| D — Quantity Reconciliation | PARTIALLY_IMPLEMENTED | **PARTIALLY_IMPLEMENTED** | derivations committed; split semantics / release / batch identity OPEN (CLAR-PROD-002/011) |
| E — Subjob ↔ Route Operation | IMPLEMENTED_WITH_LIMITATION | **IMPLEMENTED_WITH_LIMITATION** | mapping hook committed; enforcement/reconciliation feature absent (CLAR-PROD-005) |
| F — Quality Gate / Override | FUTURE_ROADMAP | **FUTURE_ROADMAP** | decision registered; no production gate; if prioritized early it becomes BLOCKED_BY_EXTERNAL_MODULE (Quality) — but as scoped it is roadmap |
| G — Rejection/Scrap | FUTURE_ROADMAP | **FUTURE_ROADMAP** | capture committed; disposition docs + NCR + scrap posting future; Quality boundary required |
| H — Batch-Identity Reconciliation | BLOCKED_BY_CLARIFICATION | **BLOCKED_BY_CLARIFICATION** | batch identity grain (CLAR-PROD-011) + release granularity (CLAR-PROD-002) |

---

## 18. Dependency Graph

```
P7-Foundation                     ┌── recommended next design phase (DOC_45 §8/§21)
    │                             │   (output completeness before defect docs)
    +-- CLAR-PROD-002             │
    +-- CLAR-PROD-003             ▼
    +-- CLAR-PROD-005      Capability A — Multiple-Output Production Entry
    +-- CLAR-PROD-011               │
    +-- CLAR-PROD-012               ▼
    +-- ADR-PROD-001         P7 Rejection / Scrap / Rework
    +-- ADR-PROD-002               │
    +-- Return safety contract     ▼
    +-- Batch identity contract   P8 Idle / Stoppage
    +-- Quantity reconciliation    │
        contract                   ▼
    +-- Quality gate contract     P9 Return / Conversion
                                  (STOP after DOC_50; no implementation)
```

**Contradiction/consistency notes (reported, not resolved):**
1. DOCUMENT_18 strictly orders P5→P6→P7→P8→P9 and gates Return/Conversion to P9.
2. DOCUMENT_45 recommends **Capability A (Multiple-Output) as the next design** before P7
   Rejection/Scrap/Rework — consistent with P5 output completeness and with the user-supplied graph
   (Capability A between Foundation and P7).
3. DOCUMENT_47 uses its own G6/G10–G18/G33/G34/G36 matrix with *different* planned-phase numbers
   (e.g. consumption-history and batch-card "P7", quality-gate-override "P9"). This reflects gap-legacy
   numbering, not a contradiction of DOC_18's phase names, but the three documents should be unified at
   implementation start.
4. There is **no dedicated P7-Foundation "decision" phase** in DOC_18/DOC_45's numbering — this gate is
   an additive decision/architecture artifact, to be inserted before any P7 feature work.

---

## 19. Test Readiness (audit only — no tests written)

| Decision area | Existing tests (committed) | Missing tests required |
|---|---|---|
| Quantity/WIP (CLAR-002) | `ProductionNormalizedEventServiceTest`, `ProductionNormalizedEventProjectionIntegrationTest`, `ProductionInputAuthorityResolverTest`, `P6InventoryIntegrityIntegrationTest`, `ProductionBackfill*` suite | rejected-split classification; over/underproduction binding; per-batch WIP reconciliation; release-granularity |
| Return disposition (CLAR-003) | `InventoryIntegrationServiceTest` (RETURN_RECEIPT touch); none on `ProductionReturn.receive` | disposition→stockStatus mapping incl. **unknown condition rejection**; override audit; D-C1/D-C2 guard tests |
| Subjob↔RouteOp (CLAR-005) | `ProductionJobCardServiceTest` | cardinality enforcement; sequence gate; post-frozen route binding; skip/override |
| Batch/lot (CLAR-011) | none | batch identity at receipt/issue/consumption/output; controlled-item mandatory scope; BC document lifecycle; per-batch allotment allocation rule |
| Quality gate (CLAR-012) | none in production (sales-dc gate untested for prod) | gate blocks next-op on PENDING/FAIL/HELD; one-time override audit; PPAP non-override |
| ADR-001 events | `ProductionNormalizedEventProjectionIntegrationTest` | cutover/dual-write; backfill idempotency; reconciliation drift=0 |
| ADR-002 terminology | `ProductionOrderServiceTest` (untracked evidence only) | PO as canonical type incl. composite/rework/short-close on `work_order` |
| Numbering (CLAR-008/ADR-004) | `DocNumberServiceProductionSeedTest` | numbering_config registration; `PC` vs `CV`; BC/PM/REJ prefixes; never-reuse |
| Cross-module contracts | static code-review rule (no stock_balance writes) | integration contract tests: same-tx atomicity; `(docNo,docType)` dedupe; reversal order |

**Test-infra requirements:** Testcontainers integration for ledger/balance assertions (as used in
`P6InventoryIntegrityIntegrationTest`); concurrency/idempotency tests for numbering and posting; rollback
tests for gated postings; authorization tests for override/disposition. All deferred to implementation
phases.

---

## 20. Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | D-C1 default (unknown→FREE) live today | CLAR-PROD-003 + D-C1 contract approval before any return-change; boundary validation |
| 2 | Wrong WIP/pending if CLAR-002 split differs | Retain committed formula; single recompute point (ASM-PROD-001) |
| 3 | Batch Card built before identity grain | Gate B/H on CLAR-PROD-011 |
| 4 | Quality gate built without Quality contract | Gate F on CLAR-PROD-012 + Quality inspection-status API |
| 5 | Dual source-of-truth (events vs legacy) at cutover | ADR-001 scope + P12 drift=0 gate; feature flags |
| 6 | Terminology drift (WO vs PO) | ADR-PROD-002 canonical map; no renames in this phase |
| 7 | Numbering deviations (PC vs CV; unregistered types) | ADR-PROD-004 seeds + consistency check |
| 8 | DOC_18 "approved" header misleading | Approvers to correct the record (§2) |
| 9 | Untracked in-flight Production code mistaken for architecture | Strictly UNTRACKED DESIGN EVIDENCE; never absorbed |
| 10 | Premature implementation | STOP gate; PARTIALLY_READY verdict; no auto-start |

---

## 21. Recommended Decision Sequence

1. **Approve CLAR-PROD-002 (A–E)** — unlocks WIP/pending/release semantics and the reconciliation
   contract.
2. **Approve CLAR-PROD-003 + Return safety D-C1/D-C2** — closes the live D-C1 risk and defines the
   return contract.
3. **Approve ADR-PROD-001 and ADR-PROD-002** (blocking architecture) — with explicit scope on the event
   model (entries only vs also return/conversion) and PO discriminator design.
4. **Approve ADR-PROD-003 / ADR-PROD-004 / ADR-PROD-005** (non-blocking, same gate) — first-class docs,
   numbering registration, inventory reuse.
5. **Approve CLAR-PROD-011** — unblocks Batch Card + batch reconciliation design.
6. **Approve CLAR-PROD-005 and CLAR-PROD-012** — subjob binding and quality-gate policy.
7. **Design Capability A (Multiple-Output)** per DOC_45, then **design P7 features** (B, G, H) per the
   dependency graph.
8. Correct the DOC_18 approval claim and unify DOC_18/DOC_45/DOC_47 phase numbering.

All steps are approvals/designs only — **no implementation** until §22.

---

## 22. Implementation Gate

Implementation of any P7 feature may begin **only after**:
- [ ] Explicit approval of CLAR-PROD-002, CLAR-PROD-003, CLAR-PROD-005, CLAR-PROD-011, CLAR-PROD-012
      (each recorded in DECISION_REGISTER with status APPROVED);
- [ ] Explicit approval of ADR-PROD-001 and ADR-PROD-002 (blocking), and ADR-PROD-003/004/005;
- [ ] Sign-off of the D-C1/D-C2 return contract (§15/§16);
- [ ] DOC_18 header approval claim corrected (§2/§21.8);
- [ ] Candidate reclassified READY_FOR_IMPLEMENTATION with an approved change plan;
- [ ] The P12 migration/backfill gate endorsed for ADR-001 cutover (deferred phase).

Until these are approved: recommended actions are **documentation and decision only**. No JS/TSX/Java/DDL
changes, no StockService/SecurityConfig/application.yaml/deployment changes.

---

## 23. Git Safety

Final verification (read-only):

| Check | Command | Result |
|---|---|---|
| Working tree | `git status --short` | Only pre-existing env/deploy config modifications (unchanged by this phase) |
| Staged | `git diff --cached --stat` | 0 staged |
| HEAD | `git rev-parse HEAD` | `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged) |
| Ahead/behind | `git rev-list --left-right --count origin/main...HEAD` | `0  2` (HEAD 2 ahead, 0 behind) |

- No commit, no push, no reset, no clean, no stash.
- No Java/TS/TSX/DDL/config/deployment file modified or created.
- The only new artifact is this document: `ProductionFRS/DOCUMENT_50_P7_Foundation_Decision_and_Architecture_Gate.md`.
- Pre-existing local modifications and untracked in-flight Production work were **not** touched.

---

## 24. Final Verdict

**P7-FOUNDATION = PARTIALLY_READY**

- The decision/architecture analysis is **complete** and recommendation-grade.
- Implementation **cannot safely begin** until the §22 gates are approved: CLAR-PROD-002/003/005/011/012,
  ADR-PROD-001/002 (blocking), ADR-PROD-003/004/005, and the D-C1/D-C2 return contract.
- No P7 candidate is promoted to READY_FOR_IMPLEMENTATION. Live risk D-C1 (unknown condition → FREE)
  and the unregistered production numbering are the two items to close first after approval.

**STOP — P7-Foundation closes here. No implementation performed. Await USER / BUSINESS approval of the
decisions above before any P7 feature work is designed or started.**