# DOCUMENT_56 — P7 HUMAN APPROVAL DECISION PACK (FINAL)

| Field | Value |
|---|---|
| Document ID | DOCUMENT_56 |
| Title | Human/Business Approval Decision Pack — Final Decision Gate |
| Document Type | Decision preparation only — **READ-ONLY; NO decisions made here** |
| Module | Production (P7) |
| Status | **P7 = BLOCKED_BY_BUSINESS_DECISIONS** |
| Baseline Branch | `main` |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Staged Files at Baseline | 0 |
| Ahead / Behind `origin/main` | 2 / 0 |
| Decision count | 15 (14 required + ADR-PROD-005, audit-identified) |
| Contradictory records | 5 (ADR-PROD-001..005) |
| Capability A | `BLOCKED_BY_BUSINESS_DECISION` |
| Prerequisite | DOCUMENT_55 (Final Production Audit), DOCUMENT_53 (P7 Decision Pack) |

---

## 1. Purpose

Present every unresolved Production business/architecture decision to the business/architecture
owner in a directly answerable form. This document makes **no decisions**. Every recommendation is
labelled `ENGINEERING RECOMMENDATION — NOT APPROVAL`. Nothing becomes approved until the human owner
fills the approval fields (§11) and the approval is recorded per the evidence rules (§12).

## 2. Current Baseline

- HEAD `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged); ahead 2 / behind 0; staged 0.
- Working tree: pre-existing in-flight Production work (backend `production/` package + untracked
  services/tests; frontend production screens) preserved. **Unmodified by this phase.**
- Backend `./gradlew test`: **BUILD SUCCESSFUL**. Frontend `typecheck` / `build`: **PASS**.
  Lint: 31 errors / 758 warnings (zero new). No commit, push, reset, clean, stash, rebase.

## 3. Current Production Readiness

- **`BLOCKED_BY_BUSINESS_DECISIONS`.** No business decision was fabricated, inferred, or silently
  approved. Five records are CONTRADICTORY; nine are NOT APPROVED; one is MISSING.
- Capability A = `BLOCKED_BY_BUSINESS_DECISION` (**NOT** `READY_FOR_IMPLEMENTATION`).

## 4. Governance Rules

1. **Single approval-of-record = `DECISION_REGISTER`.** Per its own Status & Change Control, any
   change to a decision/assumption must be requested, versioned in `CHANGELOG.md`, and reflected in
   the register. Recommendations (this doc, DOC_53, DOC_50) are **not** approval.
2. **Ticking instrument = `DOCUMENT_51` §9 Final Approval Checklist** (currently all `[ ]`).
3. **Architecture decision content = `DOCUMENT_17`** (currently self-declared `OPEN — AWAITING
   APPROVAL`; every ADR row `AWAITING APPROVAL`/`PENDING`).
4. **No cross-document "approved" claim qualifies as approval.** Conflicting claims force the
   `CONTRADICTORY — REQUIRES HUMAN RESOLUTION` classification.
5. **Evidence hierarchy:** levels 1–6 (explicit approval / authoritative requirement / approved ADR /
   committed system contract / relied-upon behavior / automated tests) establish contracts; levels
   7–8 (recommendation, engineering inference) do not.
6. **P6 Model B-a invariant is frozen** until an explicit business decision changes it:
   - Material Request ISSUE → reservation/allotment, `Effect = NONE`, no physical stock OUT.
   - Consumption POST → release the referenced reservation + perform exactly one physical Inventory
     OUT, atomically and idempotently.
   Do not modify `StockLedger`, `StockBalance`, `verifyStockAvailability`, or reservation semantics.
7. **Safe backlog already complete** (DOC_55 §28). This gate governs **new/capability** work only.
8. Registered-but-assumed items **outside this gate** (transparency):
   - CLAR-PROD-006 (idle reason catalogue) — registered resolution via CFL-PROD-005; option to
     reconfirm is optional.
   - CLAR-PROD-007 (process rate) — registered assumption ASM-PROD-010 (standard rate units/hour);
     reversible if clarified.
   - CLAR-PROD-013 (SAMPLING vs PPM) — Quality-owned (inspection-sampling discipline); Production
     boundary only (show inspection-pending/sampling status). Not a Production gate item.

## 5. Contradictory ADR Analysis

### 5.1 The records

| Record | Claim |
|---|---|
| **DOCUMENT_17** (ADR register, authoritative content) | Status `OPEN — AWAITING APPROVAL`. ADR-PROD-001/002 = `AWAITING APPROVAL — BLOCKING`; ADR-PROD-003/004/005 = `AWAITING APPROVAL` (`PENDING`). Final gate = recommendation `B — APPROVED WITH PRE-CODING ACTIONS` **contingent on approvals**; "No implementation starts automatically … awaits the advisory board's approval." |
| **DOCUMENT_18** (execution plan) | Header: "DOCUMENT_17 (ADR Gate — APPROVED)"; "Approved architecture: DOCUMENT_17 ADR-PROD-001..005 (D1..D5 approved)"; §23.7 "approvals already granted via DOCUMENT 17". (DOC_18 itself is `AWAITING APPROVAL (STOP GATE)`.) |
| **DOCUMENT_19** (P0 report) | §5: "All five ADRs … confirmed present, recorded, and **APPROVED**" — no approver/date/record. (DOC_19 itself is DRAFT with an unticked approval gate.) |
| **DECISION_REGISTER** | **Silent** — no ADR-PROD-* rows (only DEC-PROD-001..005; DEC-PROD-005 = PROPOSED). |
| **CHANGELOG** | No ADR approval entry (only CLAR-PROD-001/MSL amendment). |

### 5.2 Why they conflict

DOC_17 — the record that **is** the ADRs — declares them AWAITING/BLOCKING and explicitly stops
pending the advisory board. DOC_18 and DOC_19 assert "D1..D5 approved"/"already granted via
DOCUMENT 17", but DOC_17 makes no such grant; DOC_18 and DOC_19 both carry their own unticked
approval gates and no approver signature. The approval-of-record (DECISION_REGISTER) contains no
ADR rows at all. Therefore **no explicit human approval exists**; the "approval" claims are
derived/written statements, not business authorization.

### 5.3 Which record is authoritative

Per governance rule 1: **DECISION_REGISTER is the single approval-of-record** (must be updated when
real approval lands), with DOCUMENT_17 as the architectural **content**, and DOCUMENT_51 §9 as the
**ticking instrument**. Because the register is silent, the ADRs are unresolved.

### 5.4 Verdict

> **ADR-PROD-001..005 = `AWAITING HUMAN APPROVAL`** (classification while contradictory:
> `CONTRADICTORY — REQUIRES HUMAN RESOLUTION`). The human owner must (a) confirm the conflict
> resolution (authoritative record = DECISION_REGISTER + DOC_51 §9 ticking + DOC_17 content), then
> (b) render an explicit APPROVE / REJECT / MODIFY per ADR. All five ADRs share the identical
> contradiction pattern and are presented individually in §7.

## 6. Master Decision Matrix

Legend: **ENG-REC** = `ENGINEERING RECOMMENDATION — NOT APPROVAL` (never presented as an approved
business rule). **Status** values: CONTRADICTORY · NOT APPROVED · MISSING.

| # | ID | Decision | Current Status | Why Needed | Available Options | Recommended Option | Impact | Blocks |
|---|---|---|---|---|---|---|---|---|
| 1 | ADR-PROD-001 | Event-model architecture (additive migration; `prod_*` events authoritative; legacy `production_entry*` retained read-only) | CONTRADICTORY (DOC_17 AWAITING/BLOCKING vs DOC_18/19 APPROVED; register silent) | Target source of truth for all event, reconciliation and Capability A work; scope must be named (entries + outputs only; return/conversion outside the spine today) | O1 ADD (recommended); O2 retire (destructive); O3 parallel dual (rejected) | ENG-REC: **O1 ADOPT additive**; explicit scope: entries + outputs; cutover gated to P12 | Single source of truth; additive; backfill idempotent; legacy safe | **Capability A**, Quantity Reconciliation (event spine), all `prod_*` doc work |
| 2 | ADR-PROD-002 | Canonical Production Order on existing `work_order`; no `prod_order`; no renames | CONTRADICTORY (same pattern) | Settle PO/WO terminology + entity relationship (TERM-PROD-001 = PROPOSED) | O1 `work_order` as PO table (recommended); O2 new `prod_order`+migrate; O3 dual (rejected) | ENG-REC: **O1** — reuse committed lifecycle; least risk | One canonical model; naming-only docs; no data movement | Production Order extensions (composite/rework/short-close typing) |
| 3 | ADR-PROD-003 | First-class document register (CREATE NEW Rej/Scrap/Rework/Deviation/Stoppage/Consumption/Planning; EXTEND Entry/Conversion/Return/Idle/MREQ) | CONTRADICTORY (same pattern) | Governs the document architecture for all first-class docs and P7/P9 work | A approve register as-is (recommended); B per-document deviations | ENG-REC: **A** — consistent with committed code + DOC_50 §13 | Consistent first-class docs; build-time re-verification list recorded | First-class Rejection/Scrap/Rework, Consumption reporting |
| 4 | ADR-PROD-004 | Numbering REUSE (`DocNumberService` + `doc_sequence` + `numbering_config`) + production doc-type registration | CONTRADICTORY (same pattern) | Production doc types unregistered; plant/FY-aware config not wired; prefix gaps (CV/PC, BC, REJ) | O1 REUSE + register (recommended); O2 new engine (rejected) | ENG-REC: **O1** + seed registration; resolve CV/PC first | Consistent plant/FY numbering; BR-NUM-001 never-reuse | All first-class doc numbering (incl. Batch Card, Conversion) |
| 5 | ADR-PROD-005 | Inventory posting REUSE (`StockService` + `stock_ledger` + `posting_idempotency_key`); Production never writes balances | CONTRADICTORY (same pattern) | All Production stock movement must route the controlled engine; static ban on direct balance writes | O1 REUSE (recommended); O2 direct updates (rejected) | ENG-REC: **O1** | Correct ledger/balance; idempotent + audited | Every stock-movement candidate (Return, Conversion, Batch receipts) |
| 6 | CLAR-PROD-002 | Quantity/WIP reconciliation semantics (rejected split, release granularity, reconciliation grain, batch WIP, over/under-production) | NOT APPROVED (derivations committed; business semantics open) | Wrong WIP/Pending/postings if mis-chosen; drives G5/G10/G11/G35 | R1/R2/R3 split; G1/G2 release; op-level vs item-level grain | ENG-REC: **A** per DOC_53 4.1 (R1 split via first-class docs; G1 order-level release first; op-level grain; retain WIP formula; `pending = planned − completed`) | WIP/Pending/Release/postings semantics concentrated in one derivation point | **Capability A**, Quantity Reconciliation, posting semantics, Consumption reporting |
| 7 | CLAR-PROD-003 | Production Return disposition contract (enum, default, override, stock-status mapping) | NOT APPROVED (OPEN) | Committed `ProductionReturn.receive()` falls any unknown condition → `FREE` (live D-C1 risk, verified at `ProductionController.java` 826–828) | A strict enum GOOD/QC_HOLD/REJECTED/SCRAP/REWORK; unknown → error; only FREE/QC_HOLD to balances (recommended); B free-form / FREE fallback (unsafe) | ENG-REC: **A** | Closes D-C1; controlled returns; tracked dispositions | Production Return (any posting/validation change) + D-C1/D-C2 |
| 8 | D-C1 | Return condition → Inventory stock-status mapping (unknown ≠ FREE; SCRAP = controlled posting, not uncounted balance) | NOT APPROVED (proposal only; absent from register) | Live safety risk: unrecognized conditions credit FREE; SCRAP writes uncounted balance (`StockService` counts only FREE/QC_HOLD) | A boundary validation, countable statuses only (recommended); B keep FREE fallback (unsafe) | ENG-REC: **A** | Controlled returns only; no silent usable-stock inflation | Return crediting; safe return changes |
| 9 | D-C2 | Return bound validation ownership + origin linkage (`returnQty ≤ issued − consumed`; `originalIssueReference`) | NOT APPROVED (proposal only; absent from register) | No bound check or origin link in the return path today; long audit trail gap | A shared Production/Inventory contract + linkage (recommended); B Production-only; C Inventory-only | ENG-REC: **A** | Auditable single-source validation; dedupe via (docNo, docType) | Return validation/crediting and linkage |
| 10 | CLAR-PROD-005 | Subjob ↔ Route Operation cardinality (1:1 default vs N:1; sequence; frozen-on-post binding; exception workflow) | NOT APPROVED (OPEN) | `JobCardSubjob.routeOperationId/routeDetailId` is a data hook with no enforced cardinality; route divergence possible | A mandatory 1:1, authorized N:1, sequence-enforced, frozen-after-post (recommended); B free/unenforced | ENG-REC: **A** | Routing integrity + audit; exception/override doc required | Subjob/Route Operation enforcement, Job Card generation rule |
| 11 | CLAR-PROD-011 | Batch/lot policy (distinct dimensions; mandatory for batch/lot-controlled items; allocation rule; per-batch reconciliation) | NOT APPROVED (OPEN) | Batch-identity grain blocks Batch Card + batch reconciliation | A batch+lot distinct, allocation rule, per-batch WIP (recommended); B combined dimension only | ENG-REC: **A** | FR-PROD-BATCH-001 traceability; requires item controlled-flag | **Batch Card**, Batch reconciliation, per-batch WIP |
| 12 | Batch Card | Architecture: document vs master; number `BC-{P}-{FY}-{SEQ}`; lifecycle; links to Entry/JobCard/RouteOp/Inventory batch | **MISSING** (no decision record; only FR-PROD-BATCH-001 gap G12) | No approved basis for the Batch Card screen/BR/numbering | A document (execution + traceability; NUM-PROD-BATCH) (recommended); B master aggregate without doc number | ENG-REC: **A** | Matches FRS number-control model (§21.2 requires a document number) | Batch Card capability |
| 13 | CLAR-PROD-012 | Production Quality Gate (gate at op/subjob completion + entry post; override policy; who approves) | NOT APPROVED (OPEN) | No production quality gate exists today; gate + override must be owned before enforcement | A gate by default, joint Quality-Supervisor + Production-Supervisor / Plant Head override, one-time, audited, PPAP non-override (recommended); B no gate / standing single-role override | ENG-REC: **A** | Prevents advance past failed/held inspection; audit trail | Quality Gate capability |
| 14 | CLAR-PROD-008 | Conversion costing scope (Production records qty/loss only; Costing values) | NOT APPROVED (OPEN) | Valuation ownership split; conversion costing rules belong to Costing per CFL-PROD-008 | A Production qty/loss only, Costing values (recommended); B Production computes value (rejected) | ENG-REC: **A** | Correct costing ownership; no drift from rate rules | Product Conversion costing boundary |
| 15 | Conversion numbering (CV vs PC) | Authoritative prefix/registration for conversion documents | NOT APPROVED (discrepancy: FRS `CV-{P}-{FY}-{SEQ}` (DOC_07 §21.2) vs committed `next("product-conversion","PC")` — verified code) | Document numbering is a business-visible contract; no change allowed before choice | A adopt FRS `CV` + register; B keep committed `PC` as explicit choice; C other | ENG-REC: owner's explicit choice (A or B); **no default** | Number continuity/consistency with FRS; config seed + ADR-004 registration | Conversion numbering/registration work (ADR-PROD-004, conversions) |

## 7. Detailed Decision Questions

For each item: **Question**, **Options**, **Consequences**, **Engineering recommendation (NOT
approval)**, blank approval block. The safe bug-fix and hardening backlog (DOC_55 §28) is **already
complete and independent of these decisions**; nothing below re-litigates it.

### 7.1 ADR-PROD-001..005 — reconcile + decide (CONTRADICTORY)

The owner must, per ADR:
1. Confirm the resolution rule (§5.3: **DECISION_REGISTER = approval-of-record**, **DOC_51 §9 =
   ticking instrument**, **DOC_17 = content**) — or replace it explicitly.
2. Decide each ADR: **APPROVE / REJECT / MODIFY** (options from matrix rows 1–5; recommended Option
   O1/O1/A/A/O1 respectively, each `ENGINEERING RECOMMENDATION — NOT APPROVAL`).

Consequence of approval: the corresponding foundation (event model, canonical PO, document
classification, numbering reuse, inventory-posting reuse) becomes an **approved contract** and the
gated capabilities can be sequenced. Consequence of leaving contradictory: the capabilities stay
BLOCKED (Capability A foremost).

```
ADR-PROD-001: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:
[ ] Authoritative record confirmed: DECISION_REGISTER + DOC_51 §9 + DOC_17 (or replacement listed):

ADR-PROD-002: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:

ADR-PROD-003: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:

ADR-PROD-004: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:

ADR-PROD-005: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:
```

### 7.2 CLAR-PROD-002 — Quantity / WIP (NOT APPROVED)

**Authoritative committed formula (already evidenced — preserve unless changed):**

```
produced       = good + rework + rejected        (output classification partitions produced)
WIP            = max(resolvedInput − (good + rejected + rework + scrap), 0)   [floor at 0; no negative WIP]
pending        = planned − completed             (computed on demand)
material       : reqQty → totalIssuedQty → consumedQty ; consumed ≤ available (V-19); returnQty ≤ issued − consumed
```

**Question to the business owner:** Do you **APPROVE or REJECT** the existing quantity contract
above, and how do you resolve its three open business semantics?

| Open semantic | Options |
|---|---|
| **Rejected split** — how `rejected` partitions into reworkable / scrap / hold | R1 first-class disposition documents (rec.) · R2 static per-entry buckets · R3 defer split |
| **Release granularity** — how `released` is tracked | G1 order-level first pass (rec.) · G2 order + line/operation partial release · G3 batch release |
| **Reconciliation grain** | operation-level (rec.) · item-level |
| **Batch WIP / batch-level reconciliation** | per-batch for batch/lot-controlled items only (rec.) · none |
| **Over-production** | allowed only with approved deviation / Additional Material (rec.) · disallowed |
| **Under-production** | flows to Pending (rec.) · other |
| **Partial consumption** | remain supported; over-consumption requires approved Additional-Material Request / deviation (rec.) |

Consequence of Option A-set: single reconciliation point, consistent with committed code and
QTY-RECONCILE; unlocks WIP/pending/posting semantics and Consumption reporting. Consequence of
Option B-set: extra split/release tracking that can diverge from first-class documents.

```
CLAR-PROD-002: APPROVE / REJECT / MODIFY
Decision:
Approved formula: [ ] produced=good+rework+rejected  [ ] WIP=max(resolvedInput−outputs,0)  [ ] pending=planned−completed
Approved open semantics (R1/R2/R3, G1/G2/G3, grain, batch WIP, over/under, partial):
Reason/Comment:
```

### 7.3 CLAR-PROD-003 + D-C1 — Return disposition & stock-status mapping (NOT APPROVED)

**Question:** Which disposition model governs Production Returns, and what is each disposition's
Inventory effect?

- **Option A (rec.):** strict enum {GOOD, QC_HOLD, REJECTED, SCRAP, REWORK}; default QC_HOLD for
  batch/lot-controlled items, GOOD otherwise; unsupported condition → validation error (never FREE);
  only FREE and QC_HOLD written to counted balances; SCRAP via controlled posting; NCR for
  REJECTED/SCRAP; rework-route reference for REWORK; audited override.
- **Option B:** free-form condition; default GOOD; FREE fallback retained.

Consequences: Option A closes D-C1 (unknown→FREE) and D-C1's SCRAP uncounted-balance issue, requires
Inventory boundary validation + Quality Q/HOLD/NCR ownership. Option B keeps the live risk that
non-conforming material silently becomes FREE usable stock (verified at `ProductionController.java`
826–828 and `StockService` counted-status logic 58–63).

```
CLAR-PROD-003: APPROVE / REJECT / MODIFY
Decision:
Approved disposition enum / default / override / stock-status mapping:
Reason/Comment:

D-C1: APPROVE / REJECT / MODIFY
Decision:
Approved mapping (unknown conditions, SCRAP treatment, countable statuses):
Reason/Comment:
```

### 7.4 D-C2 — Return bound validation + origin linkage (NOT APPROVED)

**Question:** Who validates return quantities against consumption, and what origin link is recorded?

- **Option A (rec.):** shared contract — Production validates `returnQty ≤ issued − consumed` against
  entry/consumption facts; Inventory credits via StockService; return linked to
  Entry/MREQ/Consumption/Allotment/PO/JobCard via `originalIssueReference` + explicit identifier;
  (docNo, docType) dedupe.
- **Option B:** Production-only validation; **Option C:** Inventory-only.

Consequences: A = auditable, single-source; B/C = incomplete validation or weaker audit.

```
D-C2: APPROVE / REJECT / MODIFY
Decision:
Approved validation owner + origin-linkage fields:
Reason/Comment:
```

### 7.5 CLAR-PROD-005 — Subjob ↔ Route Operation (NOT APPROVED)

**Question:** What is the permitted Subjob ↔ Route Operation relationship and its completion rules?

- **Option A (rec.):** mandatory validated 1:1; N:1 (multiple subjobs per route op) only under
  authorization; rework expressed as rework-route subjobs; skipped operations only with an authorized
  override; sequence enforced from `sequenceNo`/`routeDetailId`; route binding frozen once any entry
  is posted; changes via deviation/exception document.
- **Option B:** free/unenforced mapping (current state).

Consequences: A = routing integrity + audit, needs an exception/override workflow; B = divergence from
approved route sheets remains possible.

```
CLAR-PROD-005: APPROVE / REJECT / MODIFY
Decision:
Approved cardinality (1:1 / authorized N:1 / other) + sequence + freeze-on-post:
Reason/Comment:
```

### 7.6 CLAR-PROD-011 + Batch Card (NOT APPROVED / MISSING)

**Question (two linked choices):** (1) Is Lot a dimension distinct from Batch, where is batch/lot
identity mandatory, and which allocation rule applies? (2) Is the Batch Card a **document** or a
**master**?

- CLAR-011 Option A (rec.): batch and lot distinct where the business tracks both; heat number
  captured; identity mandatory at receipt/issue/consumption/output/rejection/rework/scrap/return/
  conversion **for batch/lot-controlled items only**; allocation rule = manual select / FIFO / FEFO;
  multi-batch consumption decomposed per batch; per-batch WIP/rejection/rework/scrap for controlled
  items.
- Batch Card Option A (rec.): **document** (execution + traceability), number `BC-{PLANT}-{FY}-{SEQ}`
  (NUM-PROD-BATCH), DocTypes + `numbering_config` registration, lifecycle (open/held/closed), audit
  trail, links to Production Entry / Job Card / Route Operation / Inventory batches; BC number =
  document number, physical batch number separate.

Unknown items that a decision does not answer remain **`REQUIRES BUSINESS DECISION`** (nothing
invented).

```
CLAR-PROD-011: APPROVE / REJECT / MODIFY
Decision:
Approved batch/lot dimensions + mandatory points + allocation rule:
Reason/Comment:

Batch Card: APPROVE / REJECT / MODIFY
Decision:
Approved architecture (document vs master) + number + lifecycle + links:
Reason/Comment:
```

### 7.7 CLAR-PROD-012 — Production Quality Gate (NOT APPROVED)

**Question:** Which Production transitions require Quality approval, and who may override a hold?

Responsibilities: **Quality** = inspection status / disposition (PENDING / PASS / FAIL / HELD);
**Production** = record output and any override request; **Inventory** = restricted dispositions per
CLAR-003 / D-C1.

- **Option A (rec.):** gate enforced by default at op/subjob completion and entry post (block
  next-op/completion/FG while inspection is PENDING/FAIL/HELD); override = Quality Supervisor **and**
  Production Supervisor jointly or Plant Head, one-time, operation-scoped, mandatory reason, audited;
  PPAP-blocked items non-overridable.
- **Option B:** no gate; or single-role standing override.

Consequence: A prevents advance past failed/held inspection and satisfies BR-PROD-QA-001; B weakens
it and can stall production.

```
CLAR-PROD-012: APPROVE / REJECT / MODIFY
Decision:
Approved gated transitions + override authority + audit requirements:
Reason/Comment:
```

### 7.8 CLAR-PROD-008 — Conversion costing scope (NOT APPROVED)

**Question:** Who values conversion cost/loss/scrap?

- **Option A (rec.):** Production records quantity + loss only; Costing computes conversion value
  (CFL-PROD-008).
- **Option B:** Production computes value (rejected — Costing owns rate rules).

Consequences: A = correct cost ownership, no value logic in Production; B = duplicated valuation and
drift from Costing rates.

```
CLAR-PROD-008: APPROVE / REJECT / MODIFY
Decision:
Approved costing boundary:
Reason/Comment:
```

### 7.9 Conversion numbering — CV vs PC (NOT APPROVED)

**Question:** Choose the authoritative conversion document-number prefix.

Fact: FRS (DOC_07 §21.2) specifies `CV-{PLANT}-{FY}-{SEQ}`; committed code uses
`next("product-conversion","PC")` (verified `ProductionController.java:684`). Document numbering is a
**business-visible contract** — changing it changes printed numbers on existing conversion
transactions (new numbers only; no re-numbering history).

```
CLAR-PROD-008 (Conversion Numbering) — choose ONE:
A. CV    B. PC    C. Other: ______

Decision:
Reason/Comment:
```

## 8. Capability Dependency Map (Decision → Capability → Eligibility)

| Capability | Required decisions (approved) | Eligibility |
|---|---|---|
| **Multiple-Output Production Entry (Capability A)** | ADR-PROD-001, CLAR-PROD-002 (qty-recon / rejected split), CLAR-PROD-012 (gate at post) | **BLOCKED** (ADR-001 CONTRADICTORY + CLAR-002 NOT APPROVED; event spine MET but gated) |
| **Batch Card** | CLAR-PROD-011 + Batch Card decision + ADR-PROD-004 (BC numbering) | **BLOCKED** (decision record MISSING; CLAR-011 NOT APPROVED) |
| **Rejection / Scrap** (first-class) | ADR-PROD-003, CLAR-PROD-002 (split semantics) | **PARTIALLY READY** (capture committed on legacy path; first-class docs BLOCKED) |
| **Rework** (first-class traced) | ADR-PROD-003, CLAR-PROD-002 | **PARTIALLY READY** (child-row capture committed; first-class doc BLOCKED) |
| **Production Return** | CLAR-PROD-003 + D-C1 + D-C2 + ADR-PROD-005 | **PARTIALLY READY** (browse/workflow committed; any posting/validation change BLOCKED) |
| **Product Conversion** | CLAR-PROD-008, Conversion numbering (CV/PC), ADR-PROD-004 | **PARTIALLY READY** (quantity flow + F1 idempotency committed; costing boundary + numbering registration BLOCKED) |
| **Quantity Reconciliation** | CLAR-PROD-002 (+ ADR-PROD-001 for event spine) | **PARTIALLY READY** (WIP/pending derivations committed; business semantics BLOCKED) |
| **Quality Gate** | CLAR-PROD-012 (+ Quality inspection-status contract) | **BLOCKED** |
| **Subjob / Route Operation** | CLAR-PROD-005 | **PARTIALLY READY** (data hook committed; enforcement BLOCKED) |
| **Consumption reporting** | CLAR-PROD-002 (+ ADR-PROD-003 first-class consumption doc) | **PARTIALLY READY** (flow + per-line OUT committed; reporting/document semantics BLOCKED) |
| **Batch reconciliation** | CLAR-PROD-011 + Batch Card + ADR-PROD-001 | **BLOCKED** |
| Foundation (numbering reuse, canonical PO, controlled inventory posting, first-class doc register) | ADR-PROD-004, ADR-PROD-002, ADR-PROD-005, ADR-PROD-003 | **READY AFTER APPROVAL** (each of the 4 non-blocking ADRs is a single decision) |

No BLOCKED or PARTIALLY READY capability is implemented by this phase.

## 9. Business Impact

- **Financial:** CLAR-008 + CV/PC affect conversion value reporting and printed/co-visible numbering;
  CLAR-002 rejection/scrap semantics affect where rejected/scrapped value lands in WIP and ledgers.
- **Inventory accuracy:** without CLAR-003 + D-C1/D-C2, non-conforming returns can silently inflate
  FREE available stock (live today) and SCRAP can create uncounted balances; WIP/Pending derivations
  stay contractually undefined without CLAR-002.
- **Quality/compliance:** without CLAR-012 there is no production gate enforcement and no audited
  override; batch-controlled traceability (CLAR-011/Batch Card) is a documented FRS requirement that
  remains unimplemented.
- **Shop-floor control:** without CLAR-005, subjobs may diverge from the approved route sheet.
- **Cost of delay vs cost of wrong choice:** approving the engineering-recommended options (marked
  ENG-REC) carries minimal known downside and unblocks the largest capability set; rejecting or
  modifying any item only affects the capabilities that depend on it (matrix `Blocks` column).

## 10. Engineering Recommendation vs Approval

All `Recommended Option` / `ENG-REC` entries are **engineering recommendations only**. They carry the
status of a proposed option, not a decision. A recommendation becomes a business rule **only** after
the human owner fills the §11 form (or ticks DOC_51 §9), and the result is recorded per §12. Do not
cite any ENG-REC option as approved anywhere without that recorded evidence.

## 11. Human Approval Form

Complete the fields directly. A `DECISION:` of APPROVE/REJECT/MODIFY per item; `MODIFY` requires the
modification statement in Reason/Comment.

```text
ADR-PROD-001: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


ADR-PROD-002: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


ADR-PROD-003: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


ADR-PROD-004: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


ADR-PROD-005: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


CLAR-PROD-002: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


CLAR-PROD-003: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


D-C1: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


D-C2: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


CLAR-PROD-005: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


CLAR-PROD-011: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


Batch Card: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


CLAR-PROD-012: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


CLAR-PROD-008: APPROVE / REJECT / MODIFY
Decision:
Reason/Comment:


CLAR-PROD-008 — Conversion Numbering
Choose ONE:
A. CV
B. PC
C. Other: __________

Decision:
Reason/Comment:
```

## 12. Approval Evidence Rules

1. A decision may become **`APPROVED`** only when **explicit human/business authorization is
   recorded** (a filled, signed, and dated Decision/Reason block above, or a ticked `DOCUMENT_51`
   §9 row, or an equivalent named approver record).
2. The approval must then be **mirrored into `DECISION_REGISTER`** (the single approval-of-record)
   and **versioned in `CHANGELOG.md`**.
3. Until recorded, the status remains **`AWAITING HUMAN APPROVAL`** (with `NOT APPROVED`,
   `MISSING`, or `CONTRADICTORY — REQUIRES HUMAN RESOLUTION` as applicable).
4. **Contradictory records are never approved by choosing a side.** The human owner must first
   confirm the reconciliation rule (§5.3) and then render an explicit decision; the reconciliation
   itself is recorded.
5. Agent/LLM output, document headers, old recommendations, "proposed"/"should"/"recommended"
   language, implementation assumptions, and cross-document "approved" references are **never**
   valid evidence of approval.

## 13. Post-Approval Implementation Sequence (future plan — NOT performed now)

```text
STEP 1   Resolve ADR contradictions (owner confirms authority rule + APPROVE/REJECT/MODIFY each ADR).
STEP 2   Record approved decisions (fill §11 forms; note any MODIFY deltas).
STEP 3   Update DECISION_REGISTER (add ADR-PROD-001..005, CLAR-002/003/005/008/011/012,
         Batch Card, D-C1, D-C2, conversion-numbering rows; set STATUS) + CHANGELOG entry.
STEP 4   Re-run architecture gate (re-issue DOC_50/52-style gate with approvals ticked; correct
         DOC_18 header/§23.7 and DOC_19 §5 editorially to reference the recorded approvals).
STEP 5   Implement only the newly unblocked capability (smallest safe slice per DOC_50 §6;
         no multi-capability mega-change).
STEP 6   Run focused tests for the implemented capability.
STEP 7   Run full backend test suite (`./gradlew test`).
STEP 8   Run frontend `typecheck`, `build`, `lint` (no new findings).
STEP 9   Run regression audit (DOC_55 §28 baseline stays green).
STEP 10  Update ProductionFRS documentation (per-phase reports; DOC_56 → status superseded).
```

These steps are **not** executed by this phase; they are the plan the owner authorizes.

## 14. Explicit STOP Condition

This document **stops** after creation and verification.

- NO Capability A implementation.
- NO Batch Card implementation.
- NO Quality Gate implementation.
- NO Conversion-numbering change (CV/PC).
- NO Return-disposition change.
- NO WIP-rule change.
- NO Inventory-contract change (P6 Model B-a preserved).
- NO migrations.
- NO business decisions made.
- NO commit / push / stage / reset / clean / stash.

Await the human approval recorded via §11 (and mirrored per §12) before any of §13 is started.

---

*End of DOCUMENT_56 — P7 Human Approval Decision Pack. Nothing in this document is an approval.*