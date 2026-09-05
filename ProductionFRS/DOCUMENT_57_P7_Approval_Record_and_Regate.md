# DOCUMENT_57 — P7 APPROVAL RECORD & RE-GATE

| Field | Value |
|---|---|
| Document ID | DOCUMENT_57 |
| Title | P7 Human Approval Record and Decision-Gate Re-run |
| Document Type | Official approval-of-record + architecture re-gate (documentation only — **no implementation**) |
| Module | Production (P7) |
| Status | **DECISIONS APPROVED AND RECORDED — IMPLEMENTATION NOT AUTHORIZED** |
| Baseline Branch | `main` |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Staged Files | 0 |
| Ahead / Behind `origin/main` | 2 / 0 |
| Approver | Business / Architecture Owner |
| Approval Date | 2026-09-05 |
| Approval Instrument | Owner responses to DOCUMENT_56 §11 (Human Approval Form) |
| Recording Instruments | DECISION_REGISTER · CHANGELOG · DOCUMENT_51 §9 (ticked) — updated this phase |

---

## 1. Purpose

Record, once and for all, the human/business approvals of all 15 open Production decisions; resolve
the ADR contradiction chain; re-run the architecture decision gate; and state precisely what is now
authorized (nothing beyond recording) and what remains blocked until a separate implementation
authorization (nothing implemented here). This document performs **no** code, schema, numbering,
stock, Quality, costing, or workflow change.

## 2. Approval Source

The Business/Architecture Owner answered every item of DOCUMENT_56 §11 on 2026-09-05 with an explicit
**APPROVE**, adopted options, and reasons. All approvals reference "the documented … final decision
pack" (DOCUMENT_56) as the source of the adopted business rules. These responses are the **explicit
human authorization** required by DOCUMENT_56 §12 evidence rules.

## 3. Governance Confirmed

- **DECISION_REGISTER** = single approval-of-record (updated in §6 of this document's companion
  edits).
- **DOCUMENT_51 §9** = ticking instrument (all boxes now ticked).
- **DOCUMENT_17** = architecture decision content (approval now recorded, see addendum).
- **DOCUMENT_18** / **DOCUMENT_19** approval claims are reconciled by reference to DOCUMENT_57 (see
  addenda); their historical text is preserved.
- Agent/LLM output performed no approval; the approvals originate exclusively from the owner's
  responses recorded here.

## 4. Approval Record (all 15 decisions)

| # | ID | Decision | Adopted rule (from DOC_56 approved options) |
|---|---|---|---|
| 1 | ADR-PROD-001 | Event-model architecture | **O1 ADOPT — additive migration.** `prod_*` normalized operation events authoritative source of truth; `production_entry*` retained as legacy/compatibility, not deleted, read-only after cutover; backfill idempotent; scope: **entries + outputs only** (return/conversion not in the event spine today); cutover gated to P12. |
| 2 | ADR-PROD-002 | Canonical Production Order | **O1.** Existing `work_order` is the canonical Production Order table; no `prod_order`; no duplicate entity; no renames; execution-level via Job Card per TERM-PROD-001. |
| 3 | ADR-PROD-003 | First-class document register | **A — approve the D3 register as-is** (Rejection/Scrap/Rework/Deviation/Stoppage/Consumption/Planning = CREATE NEW first-class docs; Entry/Conversion/Return/Idle/MREQ = EXTEND; Item-Change/Disassembly/NC new). |
| 4 | ADR-PROD-004 | Numbering reuse + registration | **O1 — REUSE** `DocNumberService` + `doc_sequence` + `numbering_config`; register all Production doc types (incl. `REJ`, `BC`, and conversion `CV` prefix); BR-NUM-001 never-reuse. |
| 5 | ADR-PROD-005 | Inventory posting reuse | **O1 — REUSE** `StockService` + `stock_ledger` + `posting_idempotency_key`; Production never writes `stock_balance` directly. |
| 6 | CLAR-PROD-002 | Quantity/WIP reconciliation | **Option A-set approved.** Retain committed WIP formula `WIP = max(resolvedInput − (good + rejected + rework + scrap), 0)`, negative WIP invalid; `produced = good + rework + rejected`; `pending = planned − completed` computed on demand; rejected split **R1** via first-class disposition documents; release **G1** order-level first pass; reconciliation grain **operation-level**; batch-level WIP/reconciliation **for batch/lot-controlled items only**; over-production only with approved deviation / Additional Material; under-production flows to Pending; partial consumption supported (over-consumption requires approved Additional-Material Request/deviation). |
| 7 | CLAR-PROD-003 | Return disposition | **A.** Strict enum {GOOD, QC_HOLD, REJECTED, SCRAP, REWORK}; default QC_HOLD for batch/lot-controlled items else GOOD; condition mandatory when posting; unsupported condition → validation error (never FREE); only FREE/QC_HOLD written to counted balances; SCRAP via controlled posting; NCR for REJECTED/SCRAP; REWORK carries a rework-route reference; audited override. |
| 8 | D-C1 | Return condition → stock-status mapping | **A.** Unknown disposition **must NOT** become FREE — validation error; only FREE/QC_HOLD to counted balances; SCRAP via controlled posting; segregated countable status only via a separate Inventory ADR. |
| 9 | D-C2 | Return bound validation + origin linkage | **A.** Shared contract — Production validates `returnQty ≤ issued − consumed` against entry/consumption facts; Inventory credits via StockService; origin linkage to Entry/MREQ/Consumption/Allotment/PO/JobCard via `originalIssueReference` + explicit identifier; `(docNo, docType)` dedupe. |
| 10 | CLAR-PROD-005 | Subjob ↔ Route Operation | **A.** Mandatory validated 1:1; N:1 only under authorization; rework as rework-route subjobs; skipped ops only with authorized override; sequence enforced from `sequenceNo`/`routeDetailId`; route binding **frozen once an entry is posted**; changes via deviation/exception document. |
| 11 | CLAR-PROD-011 | Batch/Lot policy | **A.** Batch and lot distinct dimensions where the business tracks both; heat number captured; identity mandatory at receipt/issue/consumption/output/rejection/rework/scrap/return/conversion for **batch/lot-controlled items only**; allocation rule = manual select / FIFO / FEFO (selected at design); multi-batch consumption decomposed per batch; batch-level WIP/rejection/rework/scrap for controlled items. |
| 12 | Batch Card | Architecture | **A — DOCUMENT.** Execution + traceability record; number `BC-{PLANT}-{FY}-{SEQ}` (NUM-PROD-BATCH); DocTypes + `numbering_config` registration (ADR-004); workflow/status open/held/closed; audit trail; links to Production Entry / Job Card / Route Operation / Inventory batches; BC number = document number; physical batch number separate. |
| 13 | CLAR-PROD-012 | Quality Gate | **A.** Gate enforced by default at operation/subjob completion and entry post (block next-op/completion/FG while inspection PENDING/FAIL/HELD); override = Quality Supervisor **and** Production Supervisor jointly or Plant Head; one-time; operation scope; mandatory reason; audited; PPAP-blocked items non-overridable. Production = record output + any override request; Quality = inspection status/disposition; Inventory = restricted dispositions per CLAR-003/D-C1. |
| 14 | CLAR-PROD-008 | Conversion costing | **A.** Production records quantity + loss only; **Costing computes conversion value** (CFL-PROD-008). No value logic in Production. |
| 15 | Conversion numbering | Prefix | **CV (FRS)** — `CV-{PLANT}-{FY}-{SEQ}` adopted as the authoritative Production Conversion document-numbering convention; new numbers only (no re-numbering of history); registration per ADR-PROD-004 at implementation time with a documented deviation/transition note explaining the change from the current committed `PC` prefix. |

## 5. ADR Contradiction Resolution

- DOCUMENT_17 (AWAITING/BLOCKING) vs DOCUMENT_18 (header/§23.7 "already granted") vs DOCUMENT_19 (§5
  "APPROVED") vs silent DECISION_REGISTER: **resolved by explicit human approval** recorded in this
  document on 2026-09-05.
- Resolution rule (approved by reference): DECISION_REGISTER is the approval-of-record; DOC_51 §9 is
  the ticking instrument; DOC_17 is the architecture content. All five ADR-PROD-001..005 = **APPROVED**.
- DOCUMENT_17/18/19 retain their historical text; an ADDENDUM in each references this record so the
  contradiction is transparent, not erased.

## 6. DECISION_REGISTER / CHANGELOG / DOC_51 §9 Updates

Completed this phase (companion edits):

- **DECISION_REGISTER**: §1 added ADR-PROD-001..005 rows (APPROVED, 2026-09-05); new §7 "P7 Business
  Decisions (Approved 2026-09-05)" lists CLAR-002/003/005/008/011/012, D-C1, D-C2, Batch Card, and
  Conversion numbering CV; §6 change-control text updated.
- **CHANGELOG**: version `[1.1.0] — 2026-09-05 — P7 Human Approvals recorded`.
- **DOCUMENT_51 §9**: all checklist boxes ticked `[x]` with an annotation referencing this record.

## 7. Re-Gate (Architecture Decision Gate, re-run after approvals)

| Capability (DOC_56 §8) | Before approvals | After approvals (decision level) | Implementation eligibility |
|---|---|---|---|
| Foundation: numbering reuse / canonical PO / inventory reuse / doc register (ADR-002..005) | CONTRADICTORY | **APPROVED** | READY AFTER APPROVAL (eligible to sequence) |
| **Multiple-Output Production Entry (Capability A)** | BLOCKED (ADR-001 CONTRADICTORY + CLAR-002 NOT APPROVED) | Required decisions **APPROVED** (ADR-001, CLAR-002, CLAR-012) | **READY FOR SEQUENCING — implementation NOT yet authorized** |
| Batch Card | BLOCKED (MISSING + CLAR-011) | **APPROVED** (CLAR-011 + Batch Card DOCUMENT + ADR-004) | READY FOR SEQUENCING |
| Rejection / Scrap / Rework (first-class docs) | PARTIALLY READY | **APPROVED** (ADR-003 + CLAR-002) | READY FOR SEQUENCING |
| Production Return | PARTIALLY READY | **APPROVED** (CLAR-003 + D-C1 + D-C2) | READY FOR SEQUENCING |
| Product Conversion (costing + numbering) | PARTIALLY READY | **APPROVED** (CLAR-008 + CV) | READY FOR SEQUENCING |
| Quantity Reconciliation | PARTIALLY READY | **APPROVED** (CLAR-002) | READY FOR SEQUENCING |
| Quality Gate | BLOCKED | **APPROVED** (CLAR-012 + Quality contract requirement) | READY FOR SEQUENCING |
| Subjob / Route Operation | PARTIALLY READY | **APPROVED** (CLAR-005) | READY FOR SEQUENCING |
| Consumption reporting | PARTIALLY READY | **APPROVED** (CLAR-002 + ADR-003) | READY FOR SEQUENCING |
| Batch reconciliation | BLOCKED | **APPROVED** (CLAR-011 + Batch Card + ADR-001) | READY FOR SEQUENCING |

**Gate result: DECISION GATE = PASS** for all 15 decisions. **IMPLEMENTATION GATE = NOT OPEN** — no
capability is implemented or sequenced by this phase; beginning any capability requires a separate,
explicit implementation authorization plus a change plan, focused tests, full regression
(backend `./gradlew test`, frontend `typecheck`/`build`/`lint`), and per-phase approval per
DOCUMENT_18 P0–P13 discipline.

## 8. Production Readiness

- **Before:** `BLOCKED_BY_BUSINESS_DECISIONS`.
- **After (this record):** `DECISIONS_APPROVED — AWAITING IMPLEMENTATION AUTHORIZATION`.
  All business/architecture decisions are approved and recorded; no implementation may start until the
  owner separately authorizes the sequencing step (DOC_56 §13 STEP 5+) for a specific capability.

## 9. Explicitly Unchanged (this phase made NONE)

- NO source code (Java/TSX/TS/Docker/config) changed.
- NO database migration or schema change (`V6` event cascade untouched).
- NO numbering behavior changed (`PC` still the committed conversion prefix until an approved
  implementation changes it per §4 #15).
- NO Inventory / `StockService` / `stock_balance` / reservation semantics changed (P6 Model B-a
  invariant preserved).
- NO Quality behavior changed.
- NO Production workflow / WIP / return-disposition run-time behavior changed.

## 10. Git Safety

| Check | Command | Result |
|---|---|---|
| HEAD | `git rev-parse HEAD` | `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged) |
| Staged | `git diff --cached --stat` | 0 |
| Ahead/Behind | `git rev-list --left-right --count origin/main...HEAD` | `0  2` |
| New this phase | `ProductionFRS` documentation only | DOCUMENT_57 created; DECISION_REGISTER, CHANGELOG, DOC_51, DOC_17/18/19 addenda |

No commit, push, reset, clean, stash, rebase, or stage.

## 11. STOP

This phase **stops** here. All 15 decisions are recorded as APPROVED; the decision gate has re-run and
passed; the implementation gate remains closed. Await explicit implementation authorization for a
specific capability before sequencing DOC_56 §13 STEP 5+.

---

*End of DOCUMENT_57 — P7 Approval Record & Re-Gate. Approvals recorded; nothing implemented.*