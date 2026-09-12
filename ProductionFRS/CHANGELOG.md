# Zyger ERP Production Module — FRS CHANGELOG

This file records the evolution of the Production Module FRS. Version 1.0 is the frozen
baseline (Approved for Development). All subsequent changes bump the version and are logged
here with rationale.

Format follows [Keep a Changelog](https://keepachangelog.com/) conventions. Each entry states
what changed, why, and which documents were affected.

---

## [1.1.0] — 2026-09-05 — P7 HUMAN APPROVALS RECORDED

**Status: DECISIONS APPROVED — AWAITING IMPLEMENTATION AUTHORIZATION**

### Added
- **DOCUMENT_57_P7_Approval_Record_and_Regate.md** — official approval-of-record (approver:
  Business/Architecture Owner, 2026-09-05) covering all 15 P7 decisions + architecture decision-gate
  re-run (gate PASS at decision level; implementation gate NOT open).

### Changed (recording only — no functional change)
- **DECISION_REGISTER.md** — added ADR-PROD-001..005 rows (§1, APPROVED); added §7 P7 Business
  Decisions (CLAR-PROD-002/003/005/008/011/012, D-C1, D-C2, Batch Card, Conversion numbering CV);
  added NUM-PROD-BATCH + NUM-PROD-CONV (CV) to §5; §6 change-control note bumped to 1.1.0.
- **DOCUMENT_51_P7_Foundation_Approval_Matrix.md** — §9 Final Approval Checklist boxes ticked `[x]`
  (all 15) with annotation referencing DOCUMENT_57; §10 git-safety note unchanged.
- **DOCUMENT_17 / DOCUMENT_18 / DOCUMENT_19** — additive ADDENDUM blocks referencing DOCUMENT_57;
  historical text preserved; the ADR approval-status contradiction is resolved by recorded approval
  rather than by rewriting history.

### Approved decisions (owner, 2026-09-05)
ADR-PROD-001..005 APPROVED (additive event model; canonical Production Order on `work_order`;
first-class document register; numbering + inventory-posting REUSE). CLAR-PROD-002 (WIP formula
retained + R1/G1 semantics) APPROVED; CLAR-PROD-003 + D-C1 + D-C2 (return disposition/shared
validation) APPROVED; CLAR-PROD-005 (subjob 1:1, frozen-on-post) APPROVED; CLAR-PROD-011 + Batch
Card (DOCUMENT, `BC-{PLANT}-{FY}-{SEQ}`) APPROVED; CLAR-PROD-012 (quality gate + override) APPROVED;
CLAR-PROD-008 (Costing values) APPROVED; Conversion numbering = **CV** APPROVED.

### Not authorized (unchanged)
No source code, no migration, no numbering behavior, no StockService/Inventory, no Quality,
no Production workflow, no conversion-prefix change, no return-disposition runtime change, and no
capability implementation. Implementation requires a separate explicit authorization.

---

## [1.0.0] — 2026-09-03 — FRS BASELINE (Approved for Development)

**Status: APPROVED FOR DEVELOPMENT**

The full Production FRS documentation package (DOCUMENTS 01–14) is frozen as the Version 1.0
baseline after the Final Quality Audit closure.

### Added
- Entire documentation package consolidated into `ProductionFRS/`:
  - DOCUMENTS 01–08 (requirement analysis, reference analysis, architecture, gap, conflict,
    clarifications/assumptions, core FRS, screen-wise spec).
  - **DOCUMENT 08A** — Final Quality Audit Closure Report (re-audit of DOCUMENTS 01–14).
  - **DOCUMENTS 09–14** — Field-wise requirements, business rules & logic, workflow &
    transaction design, database design, API specification, testing & traceability.
- `README.md` — package index, baseline facts, reading order.
- `DECISION_REGISTER.md` — consolidated register of DEC-PROD / ASM-PROD / TERM-PROD / CFL-PROD.
- `CHANGELOG.md` — this file.

### Changed
- Document file names normalized to the recommended short structure (see README index). Existing
  versions were **renamed, not re-versioned**; no content changed during the rename.

### Resolved (relative to initial audit DOC 08A)
- All 8 corrective groups from the initial audit implemented and verified **RESOLVED**:
  MRG-001, BR-GAP-001/002/003, FR-GAP-001/002, FLD-GAP-001..010, WF-GAP-001..006,
  NUM-PROD-REJ, TERM-PROD-001.
- Source classifications made explicit and immutable; ZYGER coverage closed at **67/67**
  (SAMPLING tracked via CLAR-PROD-013).

### Security & integrity
- Classifications CR / REF / ZYGER / PROPOSED / FUTURE preserved everywhere; no silent
  conversion.
- No application source, DB migration, or runtime code was modified; `ProductionFRS/` is the
  only touched set.

### Notes / conditions for Development
- **Blocking clarification:** **None.** CLAR-PROD-001 **RESOLVED** = **MSL (Minimum Stock
  Level)** — Inventory/Store reorder level; Production integration-only (ASM-PROD-015); verified
  against customer input, not guessed.
- **Open non-blocking (tracked):** CLAR-PROD-013 (SAMPLING vs PPM); INT-GAP-004 (maintenance
  hand-off contract consummated when Maintenance-module FRS is written).
- **Partial (additive, non-gating):** MRG-002/003 §5 label rows; explicit overproduction-
  exception BR refinement.

---

## [1.0.1] — 2026-09-03 — MSL clarification resolved (amendment to baseline)

**Status: APPROVED FOR DEVELOPMENT (amended)**

### Changed
- CLAR-PROD-001 resolved by customer: **MSL = Minimum Stock Level** (Inventory/Store reorder
  level). Ownership mapped to Inventory/Store; Production is integration-only (material
  availability / shortage alert via BR-PROD-MATL-001). No functionality was designed on a
  guessed meaning.
- Updated documents to reflect resolution: DOC 01 (R-PROD-007), DOC 03 (§5 row + §8 MSL bullet),
  DOC 04, DOC 05, DOC 06 (CLAR-PROD-001 → RESOLVED; added **ASM-PROD-015**; FUT-PROD-005; §6
  classification), DOC 08 (open-clarifications note), DOC 08A (sections 3,6,7,10,11), README,
  BASELINE, CHANGELOG, DECISION_REGISTER.
- DOC 08A re-scored: re-audit **9.99/10 ≈ 99.9%** (Audit 12 lifted 8→9 as no blocking
  clarification remains); implementation readiness **97/100**.

### Added
- **ASM-PROD-015** — MSL = Minimum Stock Level (customer-confirmed), Inventory/Store owner,
  Production integration-only.

### Removed
- The single blocking clarification. **There are now no blocking clarifications.**

---

## Unreleased (future)
- Versioned follow-ups for overproduction-exception BR and §5 label parity.
- Any deeper MSL reorder/buying workflow is owned by the Inventory/Store module FRS (not
  Production).
- Any change request after baseline → increments minor version and is logged here.

---

*Zyger ERP Production Module FRS · Baseline v1.0 · 2026-09-03*