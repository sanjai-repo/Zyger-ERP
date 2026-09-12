# DOCUMENT_51 — P7-FOUNDATION APPROVAL MATRIX

| Field | Value |
|---|---|
| Document ID | DOCUMENT_51 |
| Title | P7-Foundation — Approval Matrix & Decision Capture |
| Document Type | Approval checklist / Business-Decision Pack (DECISION CAPTURE ONLY — no code) |
| Module | Production (P7-Foundation) |
| Status | **APPROVALS PENDING — AWAITING USER / BUSINESS APPROVAL** (checklist open) |
| Baseline Branch | `main` |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Staged Files at Baseline | 0 |
| Ahead / Behind `origin/main` | 2 / 0 |
| Authoritative source | `DOCUMENT_50_P7_Foundation_Decision_and_Architecture_Gate.md` (PARTIALLY_READY) |
| Predecessors | P6, P6.2, P6.3, P6.4 (closed/green), P7 Readiness Audit, DOCUMENT_50 |

---

## 1. Executive Summary

- This phase converts DOCUMENT_50 into an **explicit approval checklist**. No decision in this document
  is approved; every item is `AWAITING USER / BUSINESS APPROVAL` unless a recorded approval is cited.
- **Purpose:** the business/architecture owner answers Section 9 (Final Approval Checklist). Once the
  checkboxes are ticked by the approvers, the corresponding candidates in Section 7 become
  implementable; nothing becomes implementable before that.
- **No implementation is authorized by this list.** The smallest safe implementation slice (Section 6)
  is identified but remains gated on the approved decisions.

---

## 2. Baseline Verification

| Check | Command result | Match |
|---|---|---|
| Branch | `main` | ✅ |
| HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` | ✅ |
| Staged | 0 (`git diff --cached --stat` empty) | ✅ |
| Ahead / Behind | `git rev-list --left-right --count origin/main...HEAD` → `0  2` | ✅ (HEAD 2 ahead, 0 behind) |

Working tree: pre-existing env/deploy/config modifications and untracked in-flight Production work
present, **untouched** by this phase (confirmed in Section 8).

---

## 3. Master Approval Matrix

| ID | Decision | Current Status | Recommended Option | Alternatives | Affected Modules | Implementation Impact | Approval Required |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CLAR-PROD-002 | Quantity/WIP reconciliation: rejected split, release granularity, reconciliation grain, batch WIP, over/underproduction | OPEN (derivations committed; business semantics open) | R1 rejected-split via disposition docs; G1 order-level release first; operation-level grain; retained WIP formula | R2 static split buckets; R3 defer split; G2 partial release; G3 batch release | Production, Inventory, Reporting | WIP/Pending/Release derivations and posting semantics | Business / Production SME + Architect |
| CLAR-PROD-003 | Return disposition model | OPEN | Strict enum GOOD/QC_HOLD/REJECTED/SCRAP/REWORK; default QC_HOLD for controlled items; unsupported-condition rejection; audited override; NCR/rework linkage | Free-form condition; default GOOD always; no override | Production, Inventory, Quality | Return crediting contract; fixes D-C1 | Business / Inventory + Production SME |
| CLAR-PROD-005 | Subjob ↔ Route Operation cardinality | OPEN | Mandatory 1:1 validated; authorized N:1 exceptions; frozen-on-post route binding; sequence enforcement | Optional 1:1; free mapping; 1:N default | Production, Engineering, Planning | Subjob creation/enforcement and route binding | Production/Planning owner + Architect |
| CLAR-PROD-011 | Batch/Lot policy + Batch Card architecture | OPEN | Batch+lot distinct; mandatory for controlled items; Batch Card = document (execution+traceability); `BC-{P}-{FY}-{SEQ}`; link entry/job/route-op/inventory-batch | Combined dimension; master vs document; no batch card | Production, Inventory, Quality, Engineering | Batch identity at all movement points; Batch Card docs | Business / Production + Inventory SME |
| CLAR-PROD-012 | Quality-gate default + override | OPEN | Gate enforced at op completion; one-time joint-supervisor override at operation scope with audit; PPAP blocks non-overridable | No gate; supervisor-only override; reusable override | Production, Quality | Op advancement gating; FG receipts; override audit | Quality + Production SME |
| ADR-PROD-001 | Normalized operation-event architecture | AWAITING APPROVAL — BLOCKING | ADOPT additive migration; events authoritative; legacy retained read-only; cutover at P12 gate; explicit scope (entries vs also return/conversion) | O1 retire; O2 parallel dual (rejected) | Production (all) | Event writer/cutover, backfill, first-class docs | Lead Architect + DB Owner + Tech Lead |
| ADR-PROD-002 | Canonical Production Order terminology | AWAITING APPROVAL — BLOCKING | Canonical PO on existing `work_order` table; no `prod_order`; no renames now | New `prod_order` + migrate (higher risk); dual models (rejected) | Production, Planning | PO/WO/JobCard/Subjob lifecycle & naming | Lead Architect + Planning/Production owner |
| ADR-PROD-003 | First-class document register | AWAITING APPROVAL (non-blocking) | Rejection/Scrap/Rework = CREATE NEW; Return=EXTEND; Conversion=EXTEND; consistent with entry/inventory/quality/NCR | Per-doc variations | Production, Quality, Inventory | New `prod_*` doc tables + backfill design | Lead Architect |
| ADR-PROD-004 | DocNumberService reuse + numbering registration | AWAITING APPROVAL (non-blocking) | REUSE engine; register production doc types in numbering_config; resolve `PC` (impl) vs `CV` (FRS) explicitly | New numbering engine (rejected) | Production | Number registration, prefix decision, never-reuse | Lead Architect |
| CLAR-PROD-008 | Conversion costing scope | OPEN (related) | Production records qty/loss only; Costing values | Production values conversion | Costing, Production | Conversion valuation | Business / Costing |
| D-C1 | Unknown return condition must NOT become FREE | OPEN (defect candidate, NOT safe-bounded) | Boundary validation: unsupported condition → error; only FREE/QC_HOLD written to balances; scrap via controlled posting | Allow FREE fallback (UNSAFE — not a business rule) | Production, Inventory, Quality | Return filtering/crediting; ledger safety | Business / Inventory + Production SME |
| D-C2 | Return bound validation ownership + origin linkage | OPEN | Business bound (`returnQty ≤ allowable`) owned by Production; ledger credit by Inventory (shared contract); explicit link to entry/MREQ/consumption/allotment | Production-only; Inventory-only (weaker audit) | Production, Inventory | Return validation + traceability | Business / Inventory + Production SME |

> **Approval status:** Every row above is `AWAITING USER / BUSINESS APPROVAL`. No explicit existing
> approval was found in the source material for any row. The DOCUMENT_18 header claim that ADRs are
> "APPROVED" conflicts with DOCUMENT_17 statuses and is recorded as an unsubstantiated claim
> (DOCUMENT_50 §2); DOCUMENT_17's `AWAITING APPROVAL` is authoritative here.

---

## 4. Business Decision Pack

### 4.1 CLAR-PROD-002 — Quantity / WIP / Reconciliation

#### Business Question
How are quantities partitioned and reconciled across the production lifecycle — specifically the
rejected-split (reworkable vs scrap vs hold), release granularity, reconciliation grain, batch-level
reconciliation, and over/under-production handling?

#### Why It Matters
These semantics drive WIP, Pending, release, and the compensation of stock postings and reports. The
**derivations are already committed** — only the business choices below remain **human decisions**
(DOCUMENT_49 §7; DOCUMENT_50 §6).

#### Sub-decisions to approve (each an option pair)
- **Rejected split:** Option A — classify `rejected` into REWORKABLE / SCRAP / HOLD_MRB via first-class
  disposition documents (ties to ADR-PROD-003; doc-driven, never diverges). Option B — static per-entry
  split buckets. Recommended: **A** (DOCUMENT_50 R1).
- **Rework qty:** bounded by authorized quantity (BR-PROD-REWORK-001 / BR-PROD-ENTRY-002); re-input to a
  later operation; capture/report only in this decision.
- **Scrap qty:** requires authorization per tolerance (SCRAP-AUTHORIZE); reversal restricted after
  capitalization (BR-PROD-SCRAP-001); scrap posting is an Inventory-controlled SCRAP transaction — never
  an uncounted balance row.
- **WIP:** retain the authoritative committed formula
  `WIP = max(resolvedInput − (good + rejected + rework + scrap), 0)` (DOCUMENT_49 §6). **Negative WIP is
  not valid** — WIP floors at zero; negative is a reconciliation error. Do not introduce another formula.
- **Pending:** `pending = planned − completed`, computed on demand (not the unmaintained
  `work_order.pending_qty` column).
- **Release qty / granularity:** Option A — order-level release (whole planned block on release status).
  Option B — order-level + line/operation partial release. Recommended first pass: **A**, extend later.
- **Reconciliation granularity:** operation-level authoritative grain, entry-level roll-up, item-level
  derived.
- **Batch-level reconciliation:** only for batch/lot-controlled items, reconciled **per batch** at
  consumption/output (depends on CLAR-PROD-011).
- **Overproduction:** allowed only with approved Additional-Material / deviation context; otherwise
  `accepted > planned remainder` is flagged.
- **Underproduction:** remainder flows into Pending; short-close disposition
  {CANCEL, SCRAP, RETURN} per BR-PROD-ORDER-004.

#### Approval Status
```
CLAR-PROD-002 — AWAITING USER / BUSINESS APPROVAL (all sub-decisions above)
```

---

### 4.2 CLAR-PROD-003 — Production Return Disposition

#### Business Question
What condition/disposition may a Production Return carry, what does each disposition credit, and what is
the default and override policy? Specifically: the mapping of GOOD / QC_HOLD / REJECTED / SCRAP / REWORK
to inventory stock statuses.

#### Why It Matters
The committed `ProductionReturn.receive()` maps `condition → stockStatus`
(`SCRAP→SCRAP`, `REWORK|QC_HOLD→QC_HOLD`, **otherwise→FREE**). `StockService.balances()` counts **only
FREE and QC_HOLD**. Therefore `REJECTED`/unknown conditions are silently credited as **usable FREE
stock**, and `SCRAP` writes an **invisible** balance row. This is the D-C1 safety issue — it must be
explicitly decided, **not approved by default**.

#### Mapping to approve
| Disposition | Intended inventory credit | stockStatus (counted) |
| --- | --- | --- |
| GOOD (Good usable) | credited to available | `FREE` |
| QC_HOLD | held, not available | `QC_HOLD` |
| REJECTED | segregated, **never** FREE | `QC_HOLD` pending disposition (or controlled rejection posting) |
| SCRAP | disposal (scrap report/PPM) | **no** uncounted balance row; controlled scrap posting via Inventory |
| REWORK | held until rework disposition | `QC_HOLD` |

#### Decision items to approve
- **Default disposition:** for batch/lot-controlled items → `QC_HOLD`; otherwise → `GOOD`; **never an
  implicit FREE from an unknown value**.
- **Default permitted?** Yes, per the rule above, but only after the mapping is approved.
- **Mandatory selection:** `condition` is mandatory on any return that posts inventory.
- **Override authorization:** authorized supervisor/engineer + mandatory reason + audit
  (user/time); reverses/adjusts the ledger via Inventory-controlled reversal.
- **NCR requirement:** REJECTED/SCRAP require an NCR reference before posting (Quality-owned).
- **Rework requirement:** REWORK requires a rework route/entry reference (ASM-PROD-002).
- **Inventory stock-status mapping:** the only statuses written into `stock_balance` are `FREE` and
  `QC_HOLD`; unsupported conditions → validation error.

```
⚠ UNKNOWN CONDITION → FREE is an UNSAFE DEFAULT, NOT an approved business rule.
  Approval is required for the replacement contract in this section.
```

#### Approval Status
```
CLAR-PROD-003 — AWAITING USER / BUSINESS APPROVAL
```

---

### 4.3 CLAR-PROD-005 — Subjob ↔ Route Operation

#### Business Question
What is the authoritative relationship between Production Order, Work Order, Job Card, Subjob, Route
Sheet, and Route Operation — specifically the subjob↔route-operation cardinality?

#### Why It Matters
The relationship already has committed fields (`JobCardSubjob.routeOperationId`,
`routeDetailId`, `operationCode`) but **no enforced cardinality**; unaudited divergence from approved
routing is possible.

#### Decision items to approve
- **Cardinality:** Option A — mandatory 1:1 validated (one subjob = exactly one route operation), with
  authorized N:1 exceptions (multiple subjobs for the same operation). Option B — free.
  Recommended: **A**.
- **Mandatory vs optional mapping:** mapping required on subjob creation; optional only for ad-hoc
  operations under authorization.
- **Duplicate operation handling:** multiple subjobs for one operation only under authorization (split
  execution / partial lots).
- **Rework operations:** represented as subjobs bound to a rework route/operation referencing an original
  entry (ASM-PROD-002); not duplicate sequence steps.
- **Skipped operations:** allowed only with authorized override + reason (BR-PROD-010 pattern).
- **Operation sequence enforcement:** derive from `sequenceNo` / `routeDetailId`; prerequisite-op gate at
  subjob completion.
- **Change restrictions after execution starts:** route binding **frozen** once an entry is posted for the
  subjob; changes require a deviation/exception document and audit (FR-PROD-EXCP).

#### Approval Status
```
CLAR-PROD-005 — AWAITING USER / BUSINESS APPROVAL
```

---

### 4.4 CLAR-PROD-011 — Batch / Lot Policy & Batch Card

#### Business Question
What is a batch/lot, where is batch identity mandatory, whether batch and lot are distinct dimensions,
and what is the Batch Card architecture (`BC-{PLANT}-{FY}-{SEQ}`)?

#### Why It Matters
Blocks Batch Card (B) and batch-identity reconciliation (H), and affects batch-level WIP, rejection,
rework, scrap, and multi-batch consumption/allocation.

#### Approval must explicitly cover
- **Raw-material batch / WIP batch / FG batch / rejected batch / rework batch / scrap batch:** each point
  carries batch identity **where the item is batch/lot-controlled** (Item master flag).
- **Heat number:** captured at receipt/output (`heatNo` already exists in StockService signature).
- **Supplier batch / customer batch:** traceability attributes (metadata), not independent balances.
- **Batch traceability:** movements by batch/lot at issue, consumption, output, rejection, rework, scrap,
  return, conversion (mandatory for controlled items).
- **Mandatory batch points:** receipt, issue, consumption, output, rejection, rework, scrap, return,
  conversion — for controlled items only; optional otherwise.
- **Batch allocation:** authoritative allocation rule for multi-batch consumption (e.g.,
  RM-001 A=60/B=40, consume 70) — **no rule exists today**; an allocation strategy (manual select /
  FIFO / FEFO) must be chosen.
- **Multi-batch consumption:** single consumption OUT may span one selected batch; cross-batch partial
  consumption requires line-level batch decomposition.
- **Batch-level WIP / rejection / rework / scrap:** reconcile per batch where controlled.

#### Batch Card decision
```
Is Batch Card a:
A. document
B. master
C. execution record
D. traceability record
E. other
```
Recommended (DOCUMENT_50 §9.4): **A — document** (execution + traceability record). If approved as a
document, `BC-{PLANT}-{FY}-{SEQ}` (NUM-PROD-BATCH) and the following enabled features must be approved:
- DocTypes registration (+ `numbering_config` seed under ADR-PROD-004); workflow + status
  (open/held/closed, BR-WF-001); audit trail; numbering (never-reuse, BR-NUM-001);
- Links to: Production Entry, Job Card, Route Operation, and **Inventory batches** (StockBalance batch
  identity). Note: the BC number is the **document** number; the physical batch number is separate.

#### Approval Status
```
CLAR-PROD-011 — AWAITING USER / BUSINESS APPROVAL
```

---

### 4.5 CLAR-PROD-012 — Quality Gate / Override

#### Business Question
Must Production posting require a passed quality gate, and what is the override policy?

#### Why It Matters
No production quality gate exists today (only the sales-dispatch gate). BR-PROD-QA-001 / CFL-PROD-010
prescribe default enforcement + audited override; `ASM-PROD-012` is reserved in the register but
referenced by DOC_07 — this must be resolved at approval.

#### Approval items
- **Quality gate default:** block operation advancement (next-op, completion, FG receipt) while required
  inspection is PENDING / FAIL / HELD. Gate evaluated at subjob completion and Production Entry post.
- **Override — if allowed:** authorized job = Quality Supervisor **and** Production Supervisor (joint) or
  Plant Head; mandatory reason; Quality approval required where disposition is REJECTED/HOLD; Production
  approval alone is insufficient for disposition; audit record (user + timestamp persisted); **one-time**
  (not reusable), per affected unit; quantity scope = the operation's quantity under override; operation
  scope; batch scope = the specific batch (only if CLAR-PROD-011 defines batch); Production Order scope =
  **never whole-order override**. PPAP-mandatory blocks are **non-overridable** (Quality-authoritative).
- **Ownership:** shared contract — Production owns the gate evaluation point and override UI; Quality owns
  inspection status/NCR/PPAP authority.

#### Approval Status
```
CLAR-PROD-012 — AWAITING USER / BUSINESS APPROVAL
```

---

### 4.6 ADR-PROD-001 — Normalized Operation-Event Architecture

#### Business Question
Approve the normalized operation-event model as the authoritative execution target with additive
non-destructive migration, legacy `production_entry*` retained read-only, and a gated cutover.

#### Points of approval
- Source events: `production_entry` posts / subjob updates (committed). Normalized events:
  `prod_execution_session` / `prod_operation_event` / `prod_output_event` (committed, flag-gated, no stock
  postings). Event ownership: Production writes; projection derives.
- Ordering: within-session ordering exists; cross-operation sequence enforcement depends on CLAR-PROD-005.
- Idempotency: natural-key upsert (`findByEntryNumber`/`findByJobCardNumber`) + post idempotency key.
- Transaction boundary: same TX as the entry post; atomicity. Replay: idempotent re-emission; no stock
  postings.
- Backfill: one-time additive INSERT…SELECT, idempotent, reconciliation `Σ(new) == Σ(old)`, deferred to
  P12 gate. Migration: additive only; no drops. Reporting: roll-ups derive from events; dashboards read
  legacy during transition. Rollback: feature-flagged writer; legacy writer default-active.

#### Explicit scope to confirm at approval
`prod_*` spine covers **Production Entry (+ outputs)** only, or also **Production Return /
Product Conversion**; the latter are NOT in the event spine today.

#### Approval Status
```
ADR-PROD-001 — AWAITING USER / BUSINESS APPROVAL (BLOCKING)
```

---

### 4.7 ADR-PROD-002 — Canonical Terminology

#### Business Question
Approve the canonical domain terminology and entity relationships below (no code rename).

| Term | Canonical | Parent–child | Lifecycle owner | Numbering | API | UI | DB | Reporting |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Production Order | **Production Order** | root (planning/authorization) | Production (Planning) | `PO-` | `production/orders` | Production Order | `work_order` (discriminator) | Production Order |
| Work Order (execution) | Work Order / Job | child of PO | Production | `WO-`/via JC | `production/work-orders` | Work Order / Job | `job_card`/`work_order` | Work Order |
| Job Card | Job Card | child of PO/WO | Production | `JC-` | `production/job-cards` | Job Card | `job_card`/`prod_job_card` | Job Card |
| Subjob | Subjob | child of Job Card, bound to Route Op | Production | internal | under job-card | Subjob | `job_card_subjob` | Subjob |
| Route Sheet | Route Sheet | Engineering read-only ref | Engineering | internal | engineering API | Route Sheet | `route_sheet`/`route_operation` | Route Sheet |
| Production Entry | Production Entry | operation execution parent | Production | `PE-` | `production/entries` | Production Entry | `production_entry`/`prod_operation_event` | Production Entry |
| Prod. Execution Session | Session | derived from entry/op | Production | — | read-only | — | `prod_execution_session` | Session |

#### Approval items
API/UI/database/reporting terminology as above; canonical term = Production Order; alias Work Order
(legacy only); **no `prod_order` table**, **no duplicate entity**; numbering per DOC_07 §21.2. No rename
in this phase — approval only.

#### Approval Status
```
ADR-PROD-002 — AWAITING USER / BUSINESS APPROVAL (BLOCKING)
```

---

### 4.8 ADR-PROD-003 — First-Class Document Register (validation)

#### Business Question
Confirm the approved architecture remains `Rejection = CREATE NEW`, `Scrap = CREATE NEW`,
`Rework = CREATE NEW` and is consistent with Production / Inventory / Quality / NCR extremes.

#### Consistency check
- Production: rejection/scrap/rework move out of `production_entry_*` child rows into first-class
  number-controlled documents — consistent and non-destructive (backfill source intact).
- Inventory: dispositions post **intents only**; scrap via controlled SCRAP post (never an uncounted
  balance); reversal restricted post-capitalization (BR-PROD-SCRAP-001).
- Quality: scrap/HOLD_MRB disposition ownership; NCR linkage mandatory (FR-PROD-REJ-001); PPAP blocks.
- NCR/Rework/Scrap extremes: rejected classification drives the branch (REWORKABLE→rework route,
  SCRAP→scrap, HOLD_MRB→quarantine) per QTY-RECONCILE. Consistent — confirm and close.

#### Approval Status
```
ADR-PROD-003 — AWAITING USER / BUSINESS APPROVAL (confirm) — non-blocking
```

---

### 4.9 ADR-PROD-004 — Numbering (DocNumberService reuse) + CV/PC

#### Business Question
Confirm reuse of `DocNumberService`/`doc_sequence`/`numbering_config` for all production documents and
resolve the prefix discrepancy between committed code and the FRS.

#### Decision items
- **Reuse:** approve ADOPT O1 (REUSE); no new numbering engine; BR-NUM-001 (never-reused, server-side,
  per plant/company/division/FY/type).
- **Discrepancy requiring explicit decision:**
```
FRS conversion prefix: CV   (DOC_07 §21.2 NUM-PROD-CONV `CV-{PLANT}-{FY}-{SEQ}`)
Current conversion implementation: PC (committed `DocNumberService.next("product-conversion","PC")`)
```
Do **not** change the prefix in this phase — the owner must pick `CV` (FRS default) or keep `PC`
(explicit business choice) and record it.
- **Numbering requirements per doc:** Production Return `PR-{P}-{FY}-{SEQ}` (committed matches);
  Product Conversion (CV/PC decision above); Material Request `PM-{P}-{FY}-{SEQ}` (register);
  Production Consumption (register a dedicated sequence); Batch Card `BC-{P}-{FY}-{SEQ}` (register, once
  CLAR-PROD-011 approves Batch Card). All require `numbering_config`/DocTypes registration (currently not
  registered for these doc types).

#### Approval Status
```
ADR-PROD-004 — AWAITING USER / BUSINESS APPROVAL (including the CV vs PC decision) — non-blocking
```

---

### 4.10 CLAR-PROD-008 — Conversion Costing

#### Business Question
Who values conversion cost/loss/scrap and what does Production record?

#### Why It Matters
Cost allocation correctness for conversion and consumed material (BK-026, BK-036).

#### Options
Option A — Production records **qty/loss only**; Costing values (recommended; matches CFL-PROD-008 /
DOC_07 FR-PROD-CONV-001). Option B — Production computes value (rejected: Costing owns rate rules).

#### Approval Status
```
CLAR-PROD-008 — AWAITING USER / BUSINESS APPROVAL
```

---

### 4.11 D-C1 — Unknown Return Condition Safety

#### Business Question
What happens when a Production Return carries an unsupported/unknown `condition`? Approval is required
that it must **NOT** silently become FREE inventory.

#### Options
Option A (recommended): boundary validation — supported enum only; unknown → validation error; only
`FREE`/`QC_HOLD` written to `stock_balance`; scrap via controlled posting. Option B: allow FREE fallback
(UNSAFE — cannot be treated as an approved business rule).

#### Approval Status
```
D-C1 — AWAITING USER / BUSINESS APPROVAL (approve Option A; withhold Option B)
```

---

### 4.12 D-C2 — Return Bound Validation Ownership + Linkage

#### Business Question
Where does `returnQty ≤ allowable return quantity` validation live, and to what must a return link?

#### Options
- **Ownership:** Option A (recommended) — **Shared contract**: Production validates the business bound
  (`returnQty ≤ issued − consumed` using committed entry/consumption facts); Inventory owns the ledger
  credit via StockService. Option B — Production-only; Option C — Inventory-only (weaker audit).
- **Required origin linkage:** Production Return links to (as applicable) Production Entry, Material
  Request, Material Consumption, Stock Allotment, Production Order, Job Card via
  `originalIssueReference` + explicit allotment/consumption identifier, so deduction and audit are
  single-source (dedupe by `(docNo, docType)`).

#### Approval Status
```
D-C2 — AWAITING USER / BUSINESS APPROVAL
```

---

## 5. P7 Implementation Gate — Decision → Candidate Dependency

| Decision | B | C | D | E | F | G | H |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| CLAR-PROD-002 | X | - | X | - | - | X | X |
| CLAR-PROD-003 | - | X | - | - | - | - | - |
| CLAR-PROD-005 | - | - | - | X | - | X | - |
| CLAR-PROD-011 | X | - | X | - | - | X | X |
| CLAR-PROD-012 | - | - | - | - | X | - | - |
| ADR-PROD-001 | - | - | - | - | - | X | - |
| ADR-PROD-002 | - | - | - | - | - | - | - |

Additional gate inputs (outside the 7-row core): ADR-PROD-003/004 and CLAR-PROD-008 apply broadly; D-C1 +
D-C2 gate **C**; ADR-PROD-004 (numbering CV/PC + registration) gates **B** and numbering-critical work.

Candidate becomes implementable after approval:
- **B** ← CLAR-PROD-011 + ADR-PROD-004 numbering (and batch-level reconciliation per CLAR-PROD-002).
- **C** ← CLAR-PROD-003 + D-C1 + D-C2.
- **D** ← CLAR-PROD-002 + CLAR-PROD-011.
- **E** ← CLAR-PROD-005.
- **F** ← CLAR-PROD-012 (+ Quality inspection-status contract).
- **G** ← CLAR-PROD-002 + CLAR-PROD-005 + CLAR-PROD-011 + ADR-PROD-001 + ADR-PROD-003 (+ Quality
  disposition boundary).
- **H** ← CLAR-PROD-002 + CLAR-PROD-011.

---

## 6. Smallest Safe Implementation Slice

Priority order (from DOCUMENT_50/DOCUMENT_45 evidence) — **listed only, NOT authorized**:

1. **Capability A — Multiple-Output Production Entry** (recommended next design; lowest coupling,
   extends committed core `ProductionNormalizedEventService.putOutput`/`ProdOutputEvent`; behind flag; no
   inventory posting).
2. P7 — Rejection / Scrap / Rework (first-class authorized docs; disposition boundary to Quality;
   requires CLAR-PROD-002/005/011 + ADR-PROD-001/003).
3. P8 — Idle / Stoppage (structurally independent; parallel design allowed).
4. P9 — Return / Conversion (most coupled: Inventory + Quality + Costing; gated on CLAR-PROD-003/D-C1/
   D-C2).

**Gate truth:** Capability A must not begin until **ADR-PROD-001** (scope: allow extending the committed
projection) and **CLAR-PROD-002** (WIP across multiple outputs) are approved. Its slice = extend
`putOutput` output multiplicity (weight, destination stage), additive DTO/endpoint, behind flag, tests as
in Section 7-gate. **Nothing is authorized by this document.**

---

## 7. Test Gate (per future implementation slice — no tests now)

For each approved slice, the following test types are required at implementation time:
- Unit tests; integration tests; Testcontainers tests (ledger/balance assertions, as in
  `P6InventoryIntegrityIntegrationTest`); authorization tests (override/disposition roles);
  idempotency tests (repeat postings, `(docNo, docType)` dedupe, natural-key replays);
  transaction rollback tests (gated postings roll back atomically); concurrency tests (numbering
  reservation, concurrent subjob/entry posts); cross-module contract tests (Production↔Inventory↔Quality
  boundaries); frontend validation tests (unsupported condition rejection, override dialogs);
  regression tests (legacy `production_entry` read path, stock engine unchanged).

No production feature, screen, migration, or test was created or modified by this phase.

---

## 8. Final Status

| Candidate | Current State | Required Decisions | Ready? | Reason |
| --- | --- | --- | --- | --- |
| A — Consumption History | FUTURE_ROADMAP | CLAR-PROD-002 (final formula), reporting/costing (EP-11) | No | report-only; needs decision + costing boundary |
| B — Batch Card | BLOCKED_BY_CLARIFICATION | CLAR-PROD-011; ADR-PROD-004 (numbering); CLAR-PROD-002 (batch reconcil.) | No | identity grain + registration undecided |
| C — Return Disposition | IMPLEMENTED_WITH_LIMITATION | CLAR-PROD-003; D-C1; D-C2 | No | disposition contract + safety contract pending |
| D — Quantity Reconciliation | PARTIALLY_IMPLEMENTED | CLAR-PROD-002; CLAR-PROD-011 | No | derivations committed; semantics open |
| E — Subjob ↔ Route Operation | IMPLEMENTED_WITH_LIMITATION | CLAR-PROD-005 | No | mapping hook committed; cardinality unapproved |
| F — Quality Gate / Override | FUTURE_ROADMAP | CLAR-PROD-012 + Quality contract | No | no gate today; policy + external module |
| G — Rejection/Scrap/Rework | FUTURE_ROADMAP | CLAR-PROD-002/005/011; ADR-PROD-001/003; Quality boundary | No | capture committed; disposition docs + NCR future |
| H — Batch-Identity Reconciliation | BLOCKED_BY_CLARIFICATION | CLAR-PROD-002; CLAR-PROD-011 | No | batch/lot grain + release granularity open |
| Capability A — Multiple-Output Entry | PARTIALLY_READY (design-ready only) | ADR-PROD-001; CLAR-PROD-002 | No | design documented (DOCUMENT_45); approvals required |

No candidate is READY_FOR_IMPLEMENTATION. Every candidate remains gated on at least one approval.

---

## 9. Final Approval Checklist

Business/architecture owner — tick each box to grant the decision. **No box is pre-checked.**

> **TICKED 2026-09-05 by the Business/Architecture Owner.** All boxes granted via DOCUMENT_56 §11
> responses; recorded as the official approval-of-record in
> `DOCUMENT_57_P7_Approval_Record_and_Regate.md` and mirrored into `DECISION_REGISTER` (§1, §5–§7)
> and `CHANGELOG` ([1.1.0]). 13 of 13 boxes approved. Conversion-numbering choice = **CV (FRS)**.
> These ticks authorize the recorded decisions only — **not** implementation (see DOC_51 §9 close-out
> and DOC_57 §7/§11).

```
[x] Approve CLAR-PROD-002  (rejected split R1; release granularity G1; operation-level grain;
                             batch-level reconciliation for controlled items; over/under-production rule;
                             WIP formula retained; negative WIP invalid)
[x] Approve CLAR-PROD-003  (strict disposition enum; default QC_HOLD for controlled items / GOOD otherwise;
                             mandatory condition; audited override; NCR + rework linkage;
                             stock-status mapping FREE/QC_HOLD only; UNKNOWN→FREE REJECTED)
[x] Approve CLAR-PROD-005  (mandatory 1:1 subjob↔route-op; authorized N:1 exceptions; rework as rework-route
                             subjobs; skipped ops under authorization; sequence enforcement; frozen-on-post)
[x] Approve CLAR-PROD-011  (batch+lot policy; mandatory batch points for controlled items; multi-batch
                             allocation rule; batch-level WIP/rejection/rework/scrap;
                             Batch Card = DOCUMENT with BC-{PLANT}-{FY}-{SEQ} + DocTypes/workflow/status/
                             audit/numbering/entry/job-card/route-op/inventory-batch linkage)
[x] Approve CLAR-PROD-012  (gate enforced by default at op completion; override = joint Quality+Production
                             supervisor or Plant Head, one-time, operation scope, mandatory reason, audited;
                             PPAP non-overridable)

[x] Approve ADR-PROD-001   (normalized event architecture; additive migration; legacy retained read-only;
                             event scope entries vs also return/conversion; P12 cutover gate)
[x] Approve ADR-PROD-002   (canonical Production Order on work_order; terminology map; no prod_order;
                             no renames)

[x] Confirm ADR-PROD-003   (Rejection/Scrap/Rework = CREATE NEW documents; consistency with Production,
                             Inventory, Quality, NCR)
[x] Confirm ADR-PROD-004   (DocNumberService reuse; number_config registration for all production docs)
[x] Approve conversion numbering CV vs current PC   (choose CV (FRS) OR keep PC (explicit choice))

[x] Approve return D-C1 contract  (unknown condition must NOT become FREE; only FREE/QC_HOLD to balances;
                             scrap via controlled posting)
[x] Approve return D-C2 ownership/linkage  (shared contract: Production validates returnQty ≤ allowable;
                             Inventory credits; origin linkage to entry/MREQ/consumption/allotment/order/job-card)
[x] Approve CLAR-PROD-008  (conversion: Production records qty/loss; Costing values)
```

After approval, plan the smallest safe slice (Section 6) with an approved change plan and the Section 7
test gate. Nothing here authorizes implementation.

---

## 10. Git Safety

Final verification (read-only, completed):

| Check | Command | Result |
| --- | --- | --- |
| Working tree | `git status --short` | Only pre-existing modifications (env/deploy/config); unchanged by this phase |
| Staged | `git diff --cached --stat` | 0 |
| HEAD | `git rev-parse HEAD` | `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged) |
| Ahead/Behind | `git rev-list --left-right --count origin/main...HEAD` | `0  2` |

No commit, no push, no reset, no clean, no stash. No Java/TS/TSX/DDL/config change. Only new artifact:
`ProductionFRS/DOCUMENT_51_P7_Foundation_Approval_Matrix.md`. Untracked in-flight Production work and
pre-existing local modifications untouched.

---

## 11. Final Stop

**STOP — decision capture complete.** No implementation, no screens, no migrations, no Inventory/Quality
changes, no business decisions resolved by this document. Wait for the Section 9 checklist to be answered
by the business/architecture owner before any P7 feature is designed or implemented.