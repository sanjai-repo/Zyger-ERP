# DOCUMENT_53 — P7 HUMAN DECISION PACK

| Field | Value |
|---|---|
| Document ID | DOCUMENT_53 |
| Title | P7 — Human Decision Pack (approval-only preparation) |
| Document Type | Decision pack for human/business approval (READ-ONLY — no decisions made here) |
| Module | Production (P7) |
| Status | **P7 = BLOCKED_PENDING_HUMAN_DECISIONS** |
| Baseline Branch | `main` |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Staged Files at Baseline | 0 |
| Ahead / Behind `origin/main` | 2 / 0 |
| Authoritative sources reviewed | DOCUMENT_17, DOCUMENT_18, DOCUMENT_19, DOCUMENT_50, DOCUMENT_51, DOCUMENT_52, DECISION_REGISTER |
| Purpose | Present, answerable; **makes no decisions**. Recommended options are informational only and are NOT approval. |

---

## 0. Stop & Scope Rules

- **No implementation.** Nothing in this pack authorizes code, screens, migrations, API, workflow,
  StockService, SecurityConfig, application.yaml, or any module change.
- **No decisions are made by this document.** Every approval field is left **blank** for the human
  business/architecture owner.
- Recommendations are marked **informational only** — never treated as approval.
- Do not stage/commit/push/reset/clean/stash. Existing working-tree changes must remain untouched.

---

## 1. Section 9 — 14-Item Approval Matrix (exactly one status each)

| # | Item | Status | Reason |
| --- | --- | --- | --- |
| 1 | CLAR-PROD-002 | **NOT APPROVED** | OPEN in DOC_06/DOC_48/DOC_49/DECISION_REGISTER §6; DOC_51 §9 unticked |
| 2 | CLAR-PROD-003 | **NOT APPROVED** | OPEN (DOC_06/DOC_48); unticked |
| 3 | CLAR-PROD-005 | **NOT APPROVED** | OPEN (DOC_06/DOC_48); unticked |
| 4 | CLAR-PROD-011 | **NOT APPROVED** | OPEN (DOC_06/DOC_48); unticked |
| 5 | Batch Card | **MISSING** | No decision record exists for Batch Card architecture (doc-vs-master); only FR-PROD-BATCH-001 gap (G12); no approval artifact |
| 6 | CLAR-PROD-012 | **NOT APPROVED** | OPEN (DOC_06/DOC_48); unticked |
| 7 | ADR-PROD-001 | **CONTRADICTORY** | DOC_17 BLOCKING/AWAITING vs DOC_18/DOC_19 APPROVED; register silent |
| 8 | ADR-PROD-002 | **CONTRADICTORY** | DOC_17 BLOCKING/AWAITING vs DOC_18/DOC_19 APPROVED; register silent |
| 9 | ADR-PROD-003 | **CONTRADICTORY** | DOC_17 AWAITING+PENDING vs DOC_18/DOC_19 APPROVED; register silent |
| 10 | ADR-PROD-004 | **CONTRADICTORY** | DOC_17 AWAITING+PENDING vs DOC_18/DOC_19 APPROVED; register silent |
| 11 | D-C1 | **NOT APPROVED** | Proposal in DOC_50 §15 / DOC_51 §4.11; no sign-off; not in DECISION_REGISTER |
| 12 | D-C2 | **NOT APPROVED** | Proposal in DOC_50 §16 / DOC_51 §4.12; no sign-off; not in DECISION_REGISTER |
| 13 | CLAR-PROD-008 | **NOT APPROVED** | OPEN (DOC_06/DOC_48/DOC_47 G14); unticked |
| 14 | Conversion numbering (CV vs PC) | **NOT APPROVED** | Discrepancy DOC_50 §14 / DOC_51 §4.9; no decision record; unticked |

Nothing is "probably approved". Four items are CONTRADICTORY. Ten items are NOT APPROVED/MISSING.

---

## 2. ADR Contradiction Audit

Authority chain inspected: DOCUMENT_17 (ADR register) → DOCUMENT_18 (execution plan) →
DOCUMENT_19 (P0 report) → DECISION_REGISTER (authoritative decisions) → DOCUMENT_50/51/52 (P7 gates).

### 2.1 ADR-PROD-001 (D1 — normalized operation-event model)

```
ADR-PROD-001

DOCUMENT_17:
AWAITING APPROVAL — BLOCKING  (status field, D1 table); checklist row "D1 data model ADOPTED" = PENDING;
final gate note: "awaits the advisory board's approval of the gate ... and the blocking decisions (D1, D2)"

DOCUMENT_18:
"APPROVED" — header "Inputs: DOCUMENT_17 (ADR Gate — APPROVED)" / "Approved architecture: DOCUMENT_17
ADR-PROD-001..005 (D1..D5 approved)"; §23.7 "already granted via DOCUMENT 17"

DOCUMENT_19:
APPROVED — §5 "All five ADRs ... confirmed present, recorded, and APPROVED" (derived from DOCUMENT_18 §3;
DOCUMENT_19 itself is Status DRAFT with an unticked approval gate)

DECISION_REGISTER:
NO EXPLICIT APPROVAL RECORD — no ADR-PROD-* rows

Conflict:
DOCUMENT_17 AWAITING/BLOCKING/PENDING vs DOCUMENT_18 + DOCUMENT_19 APPROVED
Result:
CONTRADICTORY — HUMAN RECONCILIATION REQUIRED
```

### 2.2 ADR-PROD-002 (D2 — canonical Production Order on `work_order`)

```
ADR-PROD-002

DOCUMENT_17:
AWAITING APPROVAL — BLOCKING; checklist D2 = PENDING; gate awaits advisory board

DOCUMENT_18:
APPROVED (within "D1..D5 approved"); §1 "Canonical Production Order (D2/ADR-002)"

DOCUMENT_19:
APPROVED (§5; §4 records the D2 mapping as "already approved in DOCUMENT_18 §3")

DECISION_REGISTER:
NO EXPLICIT APPROVAL RECORD (TERM-PROD-001 = PROPOSED, reversible)

Conflict:
DOCUMENT_17 AWAITING/BLOCKING/PENDING vs DOCUMENT_18 + DOCUMENT_19 APPROVED
Result:
CONTRADICTORY — HUMAN RECONCILIATION REQUIRED
```

### 2.3 ADR-PROD-003 (D3 — first-class document register)

```
ADR-PROD-003

DOCUMENT_17:
AWAITING APPROVAL (non-blocking); checklist D3 = PENDING

DOCUMENT_18:
APPROVED (within "D1..D5 approved"; §1 "Document classification (D3/ADR-003)")

DOCUMENT_19:
APPROVED (§5 "Per-document classification register")

DECISION_REGISTER:
NO EXPLICIT APPROVAL RECORD

Conflict:
DOCUMENT_17 AWAITING/PENDING vs DOCUMENT_18 + DOCUMENT_19 APPROVED
Result:
CONTRADICTORY — HUMAN RECONCILIATION REQUIRED
```

### 2.4 ADR-PROD-004 (D4 — numbering REUSE + registration)

```
ADR-PROD-004

DOCUMENT_17:
AWAITING APPROVAL (non-blocking); checklist D4 = PENDING

DOCUMENT_18:
APPROVED (within "D1..D5 approved"; §1 "Numbering (D4/ADR-004): REUSE")

DOCUMENT_19:
APPROVED (§5 "REUSE DocNumberService + doc_sequence + numbering_config")

DECISION_REGISTER:
NO EXPLICIT APPROVAL RECORD (only NUM-PROD-REJ series row; no ADR row, no CV-vs-PC entry)

Conflict:
DOCUMENT_17 AWAITING/PENDING vs DOCUMENT_18 + DOCUMENT_19 APPROVED
Result:
CONTRADICTORY — HUMAN RECONCILIATION REQUIRED
```

> **Not classified.** ADR-PROD-005 has the same approval-chain pattern. The pack covers ADR-PROD-001..004
> per the phase brief; ADR-005 is noted for completeness and showed the identical contradiction source.

---

## 3. D-C1 / D-C2 / Conversion Numbering (CV vs PC) — Record Audit

| Decision | Where defined | Merely proposed? | Explicitly approved? | DECISION_REGISTER | DOCUMENT_51 | Implementation depends on it? |
| --- | --- | --- | --- | --- | --- | --- |
| D-C1 (unknown return condition ≠ FREE) | DOCUMENT_50 §15; DOCUMENT_51 §4.11 | Yes (safe contract proposal, Option A) | **No** | **Absent** | Yes (§4.11 + §9 checkbox) | Yes — any Production Return post change (Candidate C) |
| D-C2 (return bound validation ownership + linkage) | DOCUMENT_50 §16; DOCUMENT_51 §4.12 | Yes (shared-contract proposal, Option A) | **No** | **Absent** | Yes (§4.12 + §9 checkbox) | Yes — Return crediting/validation (Candidate C) |
| Conversion numbering CV vs PC | DOCUMENT_50 §14; DOCUMENT_51 §4.9; FRS DOC_07 §21.2 (CV) vs committed code `PC` | Yes (discrepancy requires explicit choice) | **No** | **Absent** (NUM-PROD-CONV not in register) | Yes (§4.9 + §9 checkbox) | Yes — any numbering/registration work (ADR-PROD-004, Candidate B, conversions) |

Conclusion: none are approved; none are registered; all three are decision-only proposals in DOCUMENT_50/51.
No approval has been created.

---

## 4. Human Decision Pack

For each item: options, consequences, recommended option (informational only), and a blank approval
field for the human owner.

```
DECISION: __________________
APPROVED OPTION: __________________
APPROVED BY: __________________
DATE: __________________
```

### 4.1 CLAR-PROD-002 — Quantity / WIP / Reconciliation

- **Current status:** NOT APPROVED (OPEN).
- **Why required:** WIP/Pending/release derivations are already committed (DOCUMENT_49 formula) but the
  business semantics — rejected split, release granularity, reconciliation grain, batch-level WIP,
  over/under-production — are undefined. Wrong choices cause wrong WIP/pending/postings (DOC_50 §6).
- **Source evidence:** DOC_06 §2; DOCUMENT_49 §7; DOCUMENT_50 §6; DOCUMENT_51 §4.1.
- **Option A (recommended):** rejected split via first-class disposition documents (R1); order-level
  release first pass (G1); operation-level reconciliation grain; batch-level reconciliation for
  batch/lot-controlled items only; overproduction allowed only with approved deviation/Additional
  Material; underproduction flows to Pending; retain WIP formula `max(..., 0)`, negative WIP invalid;
  `pending = planned − completed` computed on demand.
- **Option B:** static per-entry split buckets (R2); order+line/operation partial release (G2); item-level
  grain.
- **Consequence of Option A:** single reconciliation point; fewer moving parts; consistent with committed
  code and QTY-RECONCILE; depends on ADR-PROD-003 first-class docs at P7.
- **Consequence of Option B:** more flexible release tracking but introduces parallel split buckets that
  can diverge from first-class docs; more release-transaction tracking.
- **Recommended option (informational): A.**
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.2 CLAR-PROD-003 — Production Return Disposition

- **Current status:** NOT APPROVED (OPEN).
- **Why required:** committed `ProductionReturn.receive()` maps any unrecognized condition to `FREE` and
  `SCRAP` to an uncounted balance — D-C1 risk. Disposition contract must be owned before any return
  change (DOC_50 §7).
- **Source evidence:** DOC_06 §2; DOC_10 BR-PROD-INV-003; DOC_50 §7; DOC_51 §4.2.
- **Option A (recommended):** strict enum {GOOD, QC_HOLD, REJECTED, SCRAP, REWORK}; default QC_HOLD for
  batch/lot-controlled, GOOD otherwise; mandatory condition when posting; unsupported value → validation
  error (never FREE); audited override; NCR for REJECTED/SCRAP; rework route reference for REWORK; only
  FREE/QC_HOLD written to balances; scrap via controlled posting.
- **Option B:** free-form condition; default GOOD; no override; FREE fallback retained.
- **Consequence of Option A:** closes D-C1; requires Inventory boundary validation + Quality Q/HOLD/NCR
  ownership + audited override.
- **Consequence of Option B:** D-C1 remains live; REJECTED/non-conforming material silently becomes usable
  FREE stock.
- **Recommended option (informational): A.**
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.3 CLAR-PROD-005 — Subjob ↔ Route Operation

- **Current status:** NOT APPROVED (OPEN).
- **Why required:** `JobCardSubjob.routeOperationId/routeDetailId` committed as a data hook with no
  enforced cardinality; subjobs can diverge from approved routing (DOC_50 §8).
- **Source evidence:** DOC_06 §2; DOC_15 BK-009; DOC_47 G34; DOC_50 §8; DOC_51 §4.3.
- **Option A (recommended):** mandatory 1:1 validated; N:1 (multiple subjobs per route op) only under
  authorization; rework as rework-route subjobs; skipped ops only with authorized override; sequence
  enforced from `sequenceNo/routeDetailId`; route binding frozen once an entry is posted; changes via
  deviation/exception document.
- **Option B:** free/unenforced mapping.
- **Consequence of Option A:** routing integrity + audit; requires exception/override workflow.
- **Consequence of Option B:** continues current unenforced state; divergence from approved route sheets
  stays possible.
- **Recommended option (informational): A.**
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.4 CLAR-PROD-011 — Batch / Lot Policy & Batch Identity

- **Current status:** NOT APPROVED (OPEN).
- **Why required:** batch-identity grain blocks Batch Card + batch reconciliation; `ProductionEntryBatch`
  committed values are current implementation, not approved taxonomy (DOC_50 §9).
- **Source evidence:** DOC_06 §2; DOC_07 FR-PROD-BATCH-001; DOC_47 G12; DOC_50 §9; DOC_51 §4.4.
- **Option A (recommended):** batch and lot distinct where the business tracks both; heat number captured;
  batch identity mandatory at receipt/issue/consumption/output/rejection/rework/scrap/return/conversion
  for batch/lot-controlled items only; a batch-allocation rule selected (manual select / FIFO / FEFO);
  multi-batch consumption decomposed per batch; batch-level WIP/rejection/rework/scrap for controlled
  items.
- **Option B:** combined single batch dimension; no allocation rule; batch capture on entry only.
- **Consequence of Option A:** full FRS-compliant traceability and per-batch reconciliation; unlocks Batch
  Card; requires Item-master controlled flag + allocation rule selection.
- **Consequence of Option B:** simpler; does not satisfy FR-PROD-BATCH-001 fully.
- **Recommended option (informational): A.**
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.5 Batch Card — Architecture

- **Current status:** MISSING (no decision record).
- **Why required:** FR-PROD-BATCH-001/G12 has no approved architecture; decision doc-vs-master was never
  recorded (DOC_50 §9.4).
- **Source evidence:** DOC_07 FR-PROD-BATCH-001; DOC_47 G12; DOC_50 §9.4; DOC_51 §4.4.
- **Option A (recommended):** Batch Card = **document** (execution + traceability record), number
  `BC-{PLANT}-{FY}-{SEQ}` (NUM-PROD-BATCH), DocTypes + `numbering_config` registration, workflow +
  status (open/held/closed), audit trail, links to Production Entry / Job Card / Route Operation /
  Inventory batches. BC number = document number; physical batch number separate.
- **Option B:** Batch Card = master (physical batch identity aggregate) with no separate document number.
- **Consequence of Option A:** matches FRS document/approval/numbering model; requires the enabled-feature
  set above (ADR-PROD-004).
- **Consequence of Option B:** diverges from the number-control model; FRS §21.2 requires a document
  number.
- **Recommended option (informational): A.**
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.6 CLAR-PROD-012 — Quality Gate / Override Policy

- **Current status:** NOT APPROVED (OPEN).
- **Why required:** no production quality gate exists (only sales-dispatch); gate policy and override
  authorization must be owned (DOC_50 §10).
- **Source evidence:** DOC_06 §2; DOC_07 §14; DOC_10 BR-PROD-QA-001 / CFL-PROD-010; DOC_47 G33;
  DOC_50 §10; DOC_51 §4.5.
- **Option A (recommended):** gate enforced by default at op/subjob completion and entry post (block
  next-op/completion/FG while inspection PENDING/FAIL/HELD); override = Quality Supervisor AND Production
  Supervisor jointly or Plant Head, one-time, operation scope, mandatory reason, audited; PPAP blocks
  non-overridable.
- **Option B:** no gate; or single-role supervisory override, reusable/standing.
- **Consequence of Option A:** prevents advance past failed/held inspection; auditable; needs Quality
  inspection-status contract.
- **Consequence of Option B:** non-conforming parts can proceed; weakens FR-PROD-QA / BR-PROD-QA-001.
- **Recommended option (informational): A.**
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.7 ADR-PROD-001 — Normalized Operation-Event Architecture (CONTRADICTORY)

```
DOCUMENT_17: AWAITING APPROVAL — BLOCKING (checklist PENDING)
DOCUMENT_18: APPROVED (header "D1..D5 approved"; §23.7 "already granted via DOCUMENT 17")
DOCUMENT_19: APPROVED (§5)
DECISION_REGISTER: NO EXPLICIT APPROVAL RECORD
Result: CONTRADICTORY — HUMAN RECONCILIATION REQUIRED
```

- **Why required:** the event model is the target source of truth for P4+ work and Capability A; its
  approval state must be settled and its scope (entries only vs also return/conversion) named
  (DOC_50 §11).
- **Option A (recommended):** ADOPT additive migration; `prod_*` events authoritative; legacy retained
  read-only; cutover gated to P12; explicit scope entries + outputs (return/conversion NOT in spine
  today).
- **Option B:** O1 retire legacy (rejected — destructive); O2 parallel dual without mapping (rejected —
  two sources of truth).
- **Consequence of Option A:** single source of truth; additive; backfill idempotent; scope must be
  explicit.
- **Consequence of Option B:** data loss risk or duplicate source-of-truth violation.
- **Recommended option (informational): A.**
- Approval field (owner) — also **reconcile DOC_18/DOC_19 vs DOC_17**:
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.8 ADR-PROD-002 — Canonical Production Order (CONTRADICTORY)

```
DOCUMENT_17: AWAITING APPROVAL — BLOCKING (checklist PENDING)
DOCUMENT_18: APPROVED (header "D1..D5 approved"; §1 D2/ADR-002)
DOCUMENT_19: APPROVED (§5; §4 mapping "already approved in DOCUMENT_18 §3")
DECISION_REGISTER: NO EXPLICIT APPROVAL RECORD (TERM-PROD-001 = PROPOSED)
Result: CONTRADICTORY — HUMAN RECONCILIATION REQUIRED
```

- **Why required:** canonical Production Order on existing `work_order`; no `prod_order`; no renames —
  terminology and entity relationship must be settled (DOC_50 §12).
- **Option A (recommended):** canonical Production Order on `work_order` (O1); Work Order = execution
  instance; no duplicate entity; no renames in this phase.
- **Option B:** new `prod_order` model + migrate `work_order` (higher risk); O3 dual (rejected).
- **Consequence of Option A:** reuses committed lifecycle; least risk; naming docs only.
- **Consequence of Option B:** migration risk, duplicate-concept risk.
- **Recommended option (informational): A.**
- Approval field (owner) — also **reconcile DOC_18/DOC_19 vs DOC_17**:
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.9 ADR-PROD-003 — First-Class Document Register (CONTRADICTORY)

```
DOCUMENT_17: AWAITING APPROVAL (non-blocking; checklist PENDING)
DOCUMENT_18: APPROVED (within "D1..D5 approved")
DOCUMENT_19: APPROVED (§5)
DECISION_REGISTER: NO EXPLICIT APPROVAL RECORD
Result: CONTRADICTORY — HUMAN RECONCILIATION REQUIRED
```

- **Why required:** CREATE NEW for Rejection/Scrap/Rework/Deviation/Stoppage/Consumption/Planning;
  EXTEND for Entry/Conversion/Return/Idle/MREQ — the register governs all future P7+P9 docs
  (DOC_50 §13).
- **Option A (recommended):** approve the D3 register as-is (consistent with committed code and
  DOC_50 §13 cross-check).
- **Option B:** per-document variations deviating from the register.
- **Consequence of Option A:** consistent first-class docs; build-time re-verification list already
  recorded.
- **Consequence of Option B:** fragmentation + divergence from D3.
- **Recommended option (informational): A.**
- Approval field (owner) — also **reconcile DOC_18/DOC_19 vs DOC_17**:
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.10 ADR-PROD-004 — Numbering REUSE + Registration (CONTRADICTORY)

```
DOCUMENT_17: AWAITING APPROVAL (non-blocking; checklist PENDING)
DOCUMENT_18: APPROVED (within "D1..D5 approved")
DOCUMENT_19: APPROVED (§5)
DECISION_REGISTER: NO EXPLICIT APPROVAL RECORD (NUM-PROD-REJ only; no NUM-PROD-CONV/CV-PC)
Result: CONTRADICTORY — HUMAN RECONCILIATION REQUIRED
```

- **Why required:** production doc types are not registered in `DocTypes`/`numbering_config`; direct
  `next()` calls bypass plant/FY-aware config; conversion prefix mismatch PC vs CV (DOC_50 §14).
- **Option A (recommended):** REUSE `DocNumberService` + `doc_sequence` + `numbering_config`; register all
  production doc types via seeds; BR-NUM-001 never-reuse; resolve CV/PC explicitly.
- **Option B:** new numbering engine (rejected — duplication).
- **Consequence of Option A:** consistent plant/FY numbering; requires seed rows + prefix decision.
- **Consequence of Option B:** duplicate engine, violates numbered-doc model.
- **Recommended option (informational): A** (with the conversion-number decision in 4.14).
- Approval field (owner) — also **reconcile DOC_18/DOC_19 vs DOC_17**:
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.11 D-C1 — Unknown Return Condition must NOT become FREE

- **Current status:** NOT APPROVED (proposal only; not in DECISION_REGISTER).
- **Why required:** live safety risk — unrecognized return conditions credit FREE; SCRAP writes an
  uncounted balance (DOC_50 §15).
- **Option A (recommended):** boundary validation — supported enum only; unknown → validation error; only
  FREE/QC_HOLD to balances; scrap via controlled posting; countable segregated status only via a separate
  Inventory ADR.
- **Option B:** keep FREE fallback (unsafe).
- **Consequence of Option A:** closes D-C1; controlled returns only; needs CR validation at boundary.
- **Consequence of Option B:** non-conforming material silently inflates available stock.
- **Recommended option (informational): A.**
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.12 D-C2 — Return Bound Validation Ownership + Linkage

- **Current status:** NOT APPROVED (proposal only; not in DECISION_REGISTER).
- **Why required:** `createReturn`/`receive` enforce no `returnQty ≤ issued − consumed` and record no
  origin link (DOC_50 §16).
- **Option A (recommended):** shared contract — Production validates the business bound against
  entry/consumption facts; Inventory credits via StockService; return links to Entry/MREQ/Consumption/
  Allotment/PO/JobCard via `originalIssueReference` + explicit identifier; `(docNo, docType)` dedupe.
- **Option B:** Production-only; **Option C:** Inventory-only (weaker audit).
- **Consequence of Option A:** auditable, single-source; both modules contractual.
- **Consequence of Option B/C:** incomplete validation or weaker audit trail.
- **Recommended option (informational): A.**
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.13 CLAR-PROD-008 — Conversion Costing Scope

- **Current status:** NOT APPROVED (OPEN).
- **Why required:** who values conversion cost/loss/scrap; Production records quantity only (DOC_50 §related).
- **Option A (recommended):** Production records qty/loss only; Costing values (CFL-PROD-008).
- **Option B:** Production computes value (rejected — Costing owns rate rules).
- **Consequence of Option A:** correct cost ownership; no value logic in Production.
- **Consequence of Option B:** duplicated valuation logic; drift from Costing rates.
- **Recommended option (informational): A.**
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

### 4.14 Conversion Numbering — CV vs PC

- **Current status:** NOT APPROVED (discrepancy open).
- **Why required:** FRS NUM-PROD-CONV = `CV-{PLANT}-{FY}-{SEQ}`; committed code uses
  `DocNumberService.next("product-conversion","PC")`. An explicit choice is required; no change may occur
  before it (DOC_50 §14; DOC_51 §4.9).
- **Option A:** adopt FRS `CV` prefix (NUMPROD-CONV compliance) + register in numbering_config.
- **Option B:** keep current `PC` prefix as the explicit business choice.
- **Consequence of Option A:** FRS-aligned; requires config seed + no historical impact (new numbers only).
- **Consequence of Option B:** zero backend change; documented deviation from FRS §21.2.
- **Recommended option (informational):** A or B — **owner's explicit choice required**; no default.
- Approval field (owner):
  ```
  DECISION: __________________
  APPROVED OPTION: __________________
  APPROVED BY: __________________
  DATE: __________________
  ```

---

## 5. Capability A — Dependency Map (Multiple-Output Production Entry)

| Required before Capability A | State | Gate |
| --- | --- | --- |
| ADR-PROD-001 approved | **CONTRADICTORY — unresolved** | BLOCKED |
| CLAR-PROD-002 approved | **NOT APPROVED — unresolved** | BLOCKED |
| Quantity reconciliation contract defined | PARTIAL (WIP formula committed DOC_49; CLAR-002 business semantics open) | BLOCKED until CLAR-002 |
| Normalized event compatibility | MET (committed `prod_execution_session`/`prod_operation_event`/`prod_output_event`, flag-gated) | OK |
| Idempotency contract | MET (natural-key upsert + posting idempotency key) | OK |
| Transaction behavior | MET (projection in same TX as entry post) | OK |

**Result: `CAPABILITY_A = BLOCKED`** — at least two required decisions (ADR-PROD-001, CLAR-PROD-002) are
unresolved (one CONTRADICTORY, one NOT APPROVED). No re-gate and no implementation.

---

## 6. Recommended Authoritative Approval Source

**Recommended authoritative approval source (recommendation only — not applied):**
`DECISION_REGISTER` **as the single approval-of-record**, with **DOCUMENT_51 Approval Matrix §9** as the
ticking instrument granting each decision, and DOCUMENT_17 as the architecture decision content.

Documents to be **corrected after human approval** (purely editorial correction — not done in this phase):
1. **DOCUMENT_18** header (§1 "D1..D5 approved") + §23.7 — replace "already granted" claim with actual
   recorded approval reference.
2. **DOCUMENT_19** §5 ("ADRs APPROVED") + §4 — align status with the register once approval exists.
3. **DOCUMENT_17** FINAL GATE — reconcile "B — APPROVED WITH PRE-CODING ACTIONS" label with the
   AWAITING/PENDING checklist; align the gate outcome wording.
4. **DECISION_REGISTER** — add rows for ADR-PROD-001..005, D-C1, D-C2, conversion numbering (CV/PC),
   Batch Card architecture; correct the "remaining open clarifications" list (§6) to include CLAR-PROD-003/
   005/011/012/008.
5. **DOCUMENT_18/45/47** phase-numbering unification (noted DOC_50 §18; informational).
6. **ASM-PROD-012** reserved-but-referenced inconsistency resolution (assign at CLAR-PROD-012 approval).

None of these corrections are performed now.

---

## 7. Exact Human Decisions Required

1. Approve CLAR-PROD-002 (A–E semantics).
2. Approve CLAR-PROD-003 (return disposition contract).
3. Approve CLAR-PROD-005 (subjob↔route-op cardinality).
4. Approve CLAR-PROD-011 (batch/lot policy).
5. Approve Batch Card architecture (doc vs master + numbering + links).
6. Approve CLAR-PROD-012 (quality-gate default + override).
7. Reconcile + approve ADR-PROD-001 (event architecture + scope).
8. Reconcile + approve ADR-PROD-002 (canonical PO terminology).
9. Reconcile + approve ADR-PROD-003 (first-class doc register).
10. Reconcile + approve ADR-PROD-004 (numbering REUSE + registration).
11. Approve D-C1 contract (Option A).
12. Approve D-C2 contract (shared ownership + linkage).
13. Approve CLAR-PROD-008 (costing scope).
14. Choose conversion numbering CV vs PC.

Each is recorded via the approval field in Section 4 and/or by ticking DOCUMENT_51 §9. Nothing is approved
until the human owner fills them.

---

## 8. Git Safety

| Check | Command | Result |
| --- | --- | --- |
| Working tree | `git status --short` | Only pre-existing modifications/untracked work; untouched by this phase |
| Staged | `git diff --cached --stat` | 0 |
| HEAD | `git rev-parse HEAD` | `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged) |
| Ahead/Behind | `git rev-list --left-right --count origin/main...HEAD` | `0  2` |

No commit, push, reset, clean, stash, or amend. No Java/TS/TSX/DDL/config change. Only artifact created:
`ProductionFRS/DOCUMENT_53_P7_Human_Decision_Pack.md`.

---

## 9. Final Status

**P7 = BLOCKED_PENDING_HUMAN_DECISIONS**

- 4 of 14 decisions are CONTRADICTORY (ADR-PROD-001..004); 9 NOT APPROVED; 1 MISSING (Batch Card).
- D-C1 / D-C2 / CV-PC have no approval and no register record.
- Capability A is BLOCKED (ADR-PROD-001 CONTRADICTORY, CLAR-PROD-002 NOT APPROVED).
- No implementation. No decisions made by this document.

---

## 10. Stop

**STOP COMPLETELY.** Await the human/business owner's explicit decisions (Section 4 approval fields and/or
DOCUMENT_51 §9). Do not implement Capability A, do not re-gate, do not modify production code, and do not
resolve the documented contradictions yourself.