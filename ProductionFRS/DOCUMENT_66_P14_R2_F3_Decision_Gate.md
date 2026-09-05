# DOCUMENT_66 — P14-R2 PRODUCTION ENTRY REVERSAL / FG INVENTORY DECISION GATE

> **Chain:** DOCUMENT_64 F3 (authoritative finding) → DOCUMENT_65 (P14-R1: F3 left untouched) → DOCUMENT_66 (this P14-R2 decision-gate report).
> **Mode:** P14-R2 — DECISION GATE only. **Nothing implemented.** Read-only investigation; the only deliverable is this document.
> **Headline:** **D-REV-01 REMAINS OPEN → `BUSINESS_DECISION_REQUIRED`.**

---

## 1. Objective

Verify whether the P14 F3 / D-REV-01 decision gate has already been resolved by an explicit recorded business approval, and if so report the evidence; if not, document exactly what decision is missing, what the current implementation and inventory behavior are, and what the consequences of each candidate option would be — **without selecting or implementing any option**.

Authorization constraints honored: no application code, migration, frontend, Inventory logic, Production logic, or schema changes; read-only inspection; no data alteration, no duplicate-data deletion, no historical-data repair; only `DOCUMENT_66` may be created.

## 2. P14 F3 Finding (verbatim reference)

Source: `ProductionFRS/DOCUMENT_64_P14_Production_Module_End_to_End_Integration_Audit.md` §22, §30 (F3), §33, §34.

> **F3 (HIGH · REVERSAL / INVENTORY):** "Production Entry reversal does not compensate the FG_RECEIPT credit."
> Evidence: `ProductionStockBoundary` FG receipt at job-card complete; `ProductionController` reverse block (~550–576) has no stock call.
> Consequence: reversing a POSTED production entry under an already-COMPLETED job card does not re-issue or compensate the FG_RECEIPT credit posted at job-card complete → inventory stays over-credited vs the reversed document.
> Status: `BLOCKED_BY_BUSINESS_DECISION`.

## 3. D-REV-01 Definition

**Question:** What should happen to FG Inventory when a Production Entry that has already resulted in FG receipt is reversed?

| Option | Rule |
|---|---|
| **A — Compensate FG Inventory** | Post a compensating FG credit reversal (recommended in DOCUMENT_64 §34; restores invoice/conservation symmetry). |
| **B — Leave FG Inventory unchanged** | No compensating movement; the deviation is carried on the reversal document only (keeps "job card complete = authoritative FG signal"). |
| **C — Forbid reversal after FG receipt** | Block reversal of entries whose parent job card has completed/CG'ed; no inventory impact, reduced correction capability. |

The authorization explicitly states: **Do NOT select one automatically.**

## 4. Authoritative Sources Reviewed

| Source | Result |
|---|---|
| `DOCUMENT_57_P7_Approval_Record_and_Regate.md` | Records the 15 P7 decisions (ADR-PROD-001..005, CLAR-PROD-002/003/005/008/011/012, D-C1, D-C2, Batch Card, CV numbering). **No F3 / D-REV-01 / FG-reversal-compensation decision.** |
| `DECISION_REGISTER.md` | §1 ADR-PROD-001..005 APPROVED (2026-09-05); §7 P7 approved decisions. **No D-REV-01 row anywhere; no FG-reversal row.** |
| `CHANGELOG.md` v1.1.0 | Approved decisions list. **No D-REV-01 / F3 entry.** |
| `DOCUMENT_64_P14_Production_Module_End_to_End_Integration_Audit.md` | F3 defined; §34 lists D-REV-01 as REQUIRED business decision with options A/B/C (A recommended); status OPEN. |
| `DOCUMENT_65_P14_R1_Safe_Remediation.md` | F3 `BLOCKED_BY_BUSINESS_DECISION`; D-REV-01 `NOT DECIDED`; explicitly NOT implemented. |
| `DOCUMENT_07_Production_Module_FRS.md` | Approved FRS baseline: reversal requires reason + reversal of inventory transactions in controlled order; BR-WF-001/BR-PROD-INV-002/BR-PROD-001. Design semantics for document reversal; **no D-REV-01 policy choice.** |
| `DOCUMENT_11_Workflow_Transaction_Design.md` §5.2 | Approved design: ordered reversal — "reverse stock transactions in reverse-chronological order (output−, consumption+, issue+, receipt−, scrap+restore if pre-capitalization)"; restricted when FG/SFG already consumed/sold. Design intent consistent with Option A but **not an explicit D-REV-01 approval decision.** |
| `DOCUMENT_19_P0_Architecture_Baseline_and_Safety_Report.md` | Baseline/architecture; **no reversal-FG decision.** |
| `DOCUMENT_15_Production_Development_Backlog.md`, `DOCUMENT_18_Production_Implementation_Execution_Plan.md` | No D-REV-01 / F3 compensation approval. |
| Search strings `D-REV-01`, `FG_RECEIPT`, `reversal`, `inventory compensation`, `FG receipt` | Every hit resolves to DOCUMENT_64 (OPEN) and DOCUMENT_65 (NOT DECIDED); no approval record. |

**Search conclusion:** D-REV-01 appears ONLY in DOCUMENT_64 (defined, open, recommended-but-not-approved) and DOCUMENT_65 (NOT DECIDED). No decision register, changelog, approval record, or FRS contract records an approved A/B/C choice.

## 5. Approval Evidence

Applying the decision-authority priority (§3 of authorization):

| Priority tier | Search target | Finding |
|---|---|---|
| 1. Explicit recorded business approval | DECISION_REGISTER.md, CHANGELOG.md, DOCUMENT_57, all ProductionFRS docs | **NONE found.** |
| 2. DECISION_REGISTER | Adr list (DEC-PROD / ADR-PROD / P7 rows) | No D-REV-01 entry. |
| 3. Approved P7 decision record | DOCUMENT_57 | No reversal/FG compensation decision; P7 decisions are ADR/CLAR/D-C1/D-C2/Batch/CV numbering only. |
| 4. Explicit approved FRS/FRD contract | DOC_07, DOC_11 | Design semantics (controlled ordered reversal, receipt−) exist, but no **explicit D-REV-01 policy decision.** |
| 5. Technical inference | DOCUMENT_64 §34 (A recommended) | Audit **recommendation**, explicitly flagged as REQUIRED business decision — must NOT override missing approval. |

**Result: no explicit approval → D-REV-01 REMAINS OPEN.**

## 6. Current Implementation

Verified read-only in `zyger-erp-backend`:

- `ProductionController` `reverse` case (ProductionController.java:480–602): guard `if (!"POSTED".equals(status) && !"COMPLETED".equals(status)) throw "Only POSTED entries can be reversed."` (482). Creates a negated mirror `ProductionEntry` (`PE-REV`, entryType `"Reversal Entry"`, good/rework/reject/scrap/process negated, reversedFromEntryId, isReversal=true, status POSTED, qualityStatus REVERSED). Mirrors additional outputs as negated rows. Adjusts affected subjob completed/reject/rework/scrap quantities. Sets original to REVERSED, saves both, writes REVERSE audit log, then `normalizedEvents.project(savedRev, EventKind.REVERSE, …)` (projection only — no StockService).
- `ProductionStockBoundary.recordJobCardCompleteGood` (ProductionStockBoundary.java:42–47): single job — `stockService.recordStockIn(jobCardNumber, "job-card-complete", "FG_RECEIPT", partCode, "STORE", null, null, totalGood, LocalDate.now(), user, "FREE")`.
- `ProductionJobCardService` `complete` action (ProductionJobCardService.java:299–370): validates all subjobs complete; `totalGood = Σ subjob.completedQuantity`; if `totalGood > 0 && partCode != null` → `inventory.recordJobCardCompleteGood(...)` (365–366); also creates IPQC.
- `InventoryIntegrationService`: constants `PROD_JOB_CARD_COMPLETE = "job-card-complete"`, `TX_FG_RECEIPT = "FG_RECEIPT"` (line 144); conversion consumption/receipt, generic stock-in/out/adjustment. Used by the job-card complete path and (its mirror) — **not** by reverse.
- `StockService.recordStockIn/Out` (StockService.java:142–203): idempotency guard `ledger.existsByDocNoAndDocType(docNo, docType)` (152, 186) now reinforced at DB level by `uq_stock_ledger_doc_no_doc_type` (migration `V13`, P14-R1).
- `WorkflowStateMachine` (WorkflowStateMachine.java:48–52): `production-entry` transition map still `DRAFT/SUBMITTED/APPROVED` — **no POST/REVERSE entries**. The reverse flow does not call `validateTransition` for REVERSE; reversal eligibility is enforced inline by the controller guard only (no job-card / FG-receipt check).

## 7. Current Inventory Behavior

- A Production Entry **POST does NOT create FG inventory** for the entry itself. `ProductionController` post path, `ProductionEntryValidationService`/`ProductionQualityGateService` and related services make no `StockService`/`ProductionStockBoundary` FG call. (Conversion-type postings use `InventoryIntegrationService.consumeConversionInput/receiveConversionOutput` and are a separate conversion screen flow, keyed to the conversion document, not to the job-card complete FG_RECEIPT.)
- The **FG inventory credit happens at job-card COMPLETE**, aggregated across all subjobs (`totalGood = Σ completedQuantity`), via `recordJobCardCompleteGood`.
- Live dataset (per DOCUMENT_33/40/64): exactly 1 production_entry `PE/2026-27/00001` (CATEGORY_B, QUARANTINED, `process_qty = NULL`); zero reversal rows (`is_reversal` NULL); no FG_RECEIPT-ledger postings from the production path reviewed. No live rows are affected by this read-only gate.

## 8. FG Receipt Behavior

- **Doc identity of the FG credit:** `docNo = jobCardNumber`, `docType = "job-card-complete"` (PROD_JOB_CARD_COMPLETE), `txType = "FG_RECEIPT"` (TX_FG_RECEIPT), `itemCode = partCode`, `location = "STORE"`, `stockStatus = "FREE"`, `qty = totalGood` (Σ subjob completedQuantity at closure), `txDate = today`, idempotency key `(docNo, docType)`.
- **Independence:** the credit is keyed by `jobCardNumber` and posted once per card closure. It is **not scoped to any single production entry**.
- **Reversal of a single entry therefore cannot re-key or subtract this credit today** — the reverse block makes no `StockService` call at all (see §9).

## 9. Reversal Behavior

- Eligibility guard: entry status must be `POSTED` or `COMPLETED` (controller line 481–483). **No parent-job-card state check, no FG_receipt-posted check** → an entry CAN be reversed after its job card has been COMPLETED and after the FG_RECEIPT credit was posted.
- The reversal creates the negated mirror entry and adjusts subjob quantities, but issues **no stock movement** (no IN, no OUT). It uses `normalizedEvents.project(…, REVERSE…)` which updates the projection only.
- Consequence (F3): the FG_RECEIPT credit at card-complete is left standing; reversing an entry that contributed to that credit leaves FG inventory over-credited relative to the corrected document set.
- Absent a decision, this asymmetric behavior remains in force.

## 10. Data Impact

Scope of this gate: **no data touched, examined or altered** (read-only). The live DB state described in §7 is unaffected.

If a business decision is approved later (post-authorization), the impact scope depends on the chosen option:
- **A** inserts a compensating row (keyed distinctly — it cannot reuse `(jobCardNumber, "job-card-complete", FG_RECEIPT)` or the `existsByDocNoAndDocType` guard and the V13 unique index would block it; a dedicated key such as `PE-REV` + a reversal docType is required). No paid-back historical duplicates exist to remove (none were created).
- **B** has zero data impact (deviation carried on reversal doc only).
- **C** has pre-implementation impact only (reject new reversal attempts after card complete).

No historical-data repair or duplicate deletion is sanctioned by this authorization; any such work must come as a separate explicit instruction.

## 11. Decision Matrix

| Option | Description | Dedicated entry in a decision source? | Approved? |
|---|---|---|---|
| **A — Compensate** | Post compensating FG credit reversal on entry reversal under COMPLETED job card | DOCUMENT_64 §34 (recommended audit remedy) | **NOT APPROVED** — no business approval recorded |
| **B — Leave unchanged** | Deviation carried on reversal doc only; FG signal stays card-complete-authoritative | DOCUMENT_64 §34 (listed) | **NOT APPROVED** — no business approval recorded |
| **C — Forbid reversal** | Block reversal when parent job card completed / FG received | DOCUMENT_64 §34 (listed) | **NOT APPROVED** — no business approval recorded |

No candidate option has a recorded approval; no conflicting approvals exist either (no record for or against any option).

## 12. Contradictions (none blocking)

No two authoritative records approve different F3 choices (there is no approval at all). One alignment note: DOC_11 §5.2's ordered-reversal design includes "receipt− in reverse-chronological order" (consistent with Option A) and restricts reversal after FG consumption/sale — this is design modeling, not an explicit D-REV-01 business decision; it cannot be treated as approval under priority tier 4 because F3 explicitly required a dedicated decision (DOCUMENT_64 §34).

<!-- APPEND-2 -->

## 13. Required Business Decision

A human-decision choice of exactly one of:

- **A — Compensate FG inventory** on entry reversal under COMPLETED job cards,
- **B — Leave FG inventory unchanged** (deviation carried on reversal doc),
- **C — Forbid reversal after FG receipt**.

Until one of these is explicitly recorded (DECISION_REGISTER entry and/or changelog), F3 stays `BLOCKED_BY_BUSINESS_DECISION` and the current asymmetry (entry reversal without FG compensation after card-complete FG credit) remains in force. The gate must be closed by a business authority, not by technical inference.

## 14. Recommended Implementation After Approval (sketch ONLY — no code here)

To be executed as a separate, explicitly authorized implementation task, matching DOCUMENT_64 §34:

- **If A is chosen:** on a successful entry reversal whose parent job card has completed (job-card status COMPLETED and/or an `FG_RECEIPT` ledger row exists for `(jobCardNumber, "job-card-complete")`), post a compensating `FG_RECEIPT`-reverse movement for the entry's good quantity under a distinct identity key that passes the `existsByDocNoAndDocType`/V13 unique-guard (e.g., docNo = reversal `PE-REV` entryNumber, docType = `"production-entry-reversal"`, txType OUT of FG in STORE/FREE), inside the same transaction as the reversal; reissue from the SAME STORE/FREE bucket. Add a `PREVENT duplicate` idempotency key check. Optionally add a `validateTransition` REVERSE edge to `WorkflowStateMachine`(line 48–52) plus parent-card/FG-state guards.
- **If B is chosen:** no inventory code; document the deviation on the reversal doc (metadata) and add a read-side note in the audit trail.
- **If C is chosen:** add a job-card-state guard in the reverse path (block when parent job card COMPLETED or an FG_RECEIPT exists), plus a clear domain error; no inventory movement.

These outlines do not change anything in the running system.

## 15. Safety Conditions

Check | Where verified | Status
|---|---|---|
| No code / migration / frontend / schema change made | `git status` + code reads | **SATISFIED**
| No inventory logic path changed | reverse block read (no stock call) | **SATISFIED**
| No data deleted/altered (incl. no dedupe deletion, no historical repair) | read-only session | **SATISFIED**
| No new stock status / no new document type created | only this markdown added | **SATISFIED**
| No implicit business decision assumed | §13 documents OPEN | **SATISFIED**
| D-REV-01 explicitly approved before any F3 implementation | none found → STOP | **NOT MET (blocking)** |
| No F4/F5/P15 started | gate halted | **SATISFIED**

## 16. Final Verdict

**D-REV-01 REMAINS OPEN — no explicit recorded business approval resolves P14 F3.**

**Final P14-R2 status: `BUSINESS_DECISION_REQUIRED`.**

Next required action (human): record the D-REV-01 decision (A/B/C) and issue a new implementation authorization; only then may F3 be implemented.

---

### Git safety snapshot (before → after)

- Before: HEAD `0781e1a30ca881614a7b573904caf6481adcbdc9`, staged 0, pre-existing worktree diff (130 entries) intact.
- After: single new file added `ProductionFRS/DOCUMENT_66_P14_R2_F3_Decision_Gate.md`; staged 0; HEAD unchanged.

---
**END OF DOCUMENT 66**