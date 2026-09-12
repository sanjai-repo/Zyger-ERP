# DOCUMENT_55 — FINAL PRODUCTION AUDIT & APPROVAL READINESS

| Field | Value |
|---|---|
| Document ID | DOCUMENT_55 |
| Title | Final Production Audit and Approval Readiness |
| Document Type | Autonomous final-over-night audit + human decision preparation (READ-ONLY decisions; no business approval granted) |
| Module | Production |
| Status | **BLOCKED_BY_BUSINESS_DECISIONS** |
| Baseline Branch | `main` |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Staged Files at Baseline | 0 |
| Ahead / Behind `origin/main` | 2 / 0 |
| Final HEAD (post-audit) | `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged; NO COMMIT) |
| Final Staged | 0 |

---

## 1. Executive Summary

This final autonomous production audit independently verified the source code (not just the
prior reports), classified every finding against the evidence hierarchy, applied only objectively
safe fixes, ran the complete backend + frontend regression, and prepared a human/business
decision package. **No business decision was invented or approved.** All unresolved items remain
explicitly `NOT APPROVED` / `CONTRADICTORY` / `MISSING`, and the module stays
`BLOCKED_BY_BUSINESS_DECISIONS` until explicit human approval exists.

## 2. Baseline

- Branch `main`, HEAD `0781e1a30ca881614a7b573904caf6481adcbdc9`, ahead 2 / behind 0, staged 0.
- Pre-existing in-flight production work preserved (backend `production/` package + untracked
  services/tests; frontend production screens).

## 3. Documents Reviewed

DOC_07, DOC_15, DOC_17, DOC_18, DOC_19, DOC_45 (both), DOC_47, DOC_49, DOC_50, DOC_51,
DOC_52, DOC_53, DOC_54, DECISION_REGISTER, CHANGELOG. Reference repo docs inspected for the
FRS WIP formula and concurrency/numbering rules.

## 4. Source-of-Truth Hierarchy

Only levels 1–6 establish an implementation contract (explicit approval / authoritative
requirement / approved ADR / committed system contract / relied-upon behavior / automated tests).
Recommendations and engineering inference (levels 7–8) were never elevated to approval.

## 5. Production Architecture

Hybrid final-part-centric workspace over normalized operation-level events on `production_entry`
(legacy/compat retained) with a new isolated stub (`prod_operation_execution_event`, V6). MD
masters/P6 reservation semantics documented. Verified no `stock_balance` direct writes from
production.

## 6. Production Order

Canonical Production Order realized on `work_order` (single source of truth) via
`ProductionOrderService`, delegating to PlanningService/DocumentFacade. Numbering via
`DocNumberService` peek/next; lifecycle drive through `PlanningService.workOrderAction`.

## 7. Job Card

`ProductionJobCardService` manages statuses, subjobs, route-operation linkage, and the
inv-inventory-boundary receipt on completion. **Fixed (H4):** `jobCardAction` now `@Transactional`
so the FG stock receipt, job-card status save and auto-IPQC creation commit atomically; the
previously silent IPQC capture is now logged. Subjob cardinality (route-op ↔ subjob) remains a
**BLOCKED** CLAR-PROD-005 decision — not invented.

## 8. Production Entry

`ProductionEntryController` validate+persist+audit+normalized projection. Previously-added input
guard verified. **Fixed (F3):** reversal now mirrors reject/rework/scrap decrements on the subjob
(previously only `good` was reversed; defect is FAT-QUANTITY). **Fixed (F4):** `post` now rejects
an already-POSTED/REVERSED entry even without a header key (prevent silent double-count).
**Fixed (F5):** auto-derived good quantity now subtracts `scrap` (matches V-07 summed invariant).
**Fixed (G):** six swallowed audit/idempotency failures now log the cause.

## 9. Material Request

Model B-a P6 confirmed: ISSUE creates/reuses an APPROVED `stock-allotment` reservation with
`Effect.NONE` (no physical OUT); single physical OUT deferred to Consumption POST. **Fixed (H2):**
`reservationExists` now fails **closed** — a DB error propagates instead of returning `false`
(previously could create a duplicate reservation). Zero-issuable-issue rejection guard verified.

## 10. Consumption

**Fixed (F2):** multi-line POST now records one distinct physical OUT **per line** with per-line
idempotency keys (previously every line after the first was silently dropped by StockService's
`(docNo, docType)` dedupe). Reservation release preserved exactly-once. Consumption tests extended.

## 11. Return

`returnAction` semantics preserved. **Fixed (H5):** return stock receipt + status now commit in a
single `@Transactional` boundary.

## 12. Conversion

**Fixed (F1):** conversion OUT and IN now use distinct idempotency keys (`-OUT` / `-IN`);
previously the output IN was silently swallowed by the shared-docNo dedupe (output never entered
stock). **Fixed (H5):** `conversionAction` now `@Transactional` for both post and complete.

## 13. Log Sheet

**Fixed (K):** `addActivity`/`updateActivity` now reject an end time earlier than start time
(previously persisted a negative duration).

## 14. Idle Time

`IdleTimeEntry` create/get/update/delete reviewed; no objectively safe defect found.

## 15. Quantity / WIP

WIP = max(resolvedInput − (good+rejected+rework+scrap), 0) preserved (not changed).
Rejected/scrap/rework allocation semantics remain **BLOCKED** (CLAR-PROD-002). F3/F4/F5 fixes
protect quantity integrity (no double-count, no negative/over-allocated derived quantities).

## 16. Batch

Batch Card contract is **MISSING** (no decision artifact; only FR-PROD-BATCH-001 gap). No lifecycle
invented in this run.

## 17. Quality Boundary

No Quality Gate invented. **Fixed (H2b):** `QualityInspectionService.hasScar` now fails **closed**
(previously a DB error on the duplicate-SCAR check returned `false` → possible duplicate SCAR on
retry); the error is absorbed by `autoCreateScar`'s existing controlled boundary (log + skip), so
an RTV disposition still completes without creating a duplicate. CLAR-PROD-012 remains BLOCKED.

## 18. Inventory Boundary

Production never writes `stock_balance` directly; all stock movement flows through
`StockService` (ledger + balance), which was **not modified**. `verifyStockAvailability` untouched.

## 19. Numbering

`DocNumberService` peek (unsaved → repeatable preview / refresh-safe) and next (saved → permanent)
preserved. Production controller creation paths delegate to the authoritative number service. No
numbering redesign. Conversion CV-vs-PC **NOT APPROVED** — numbering policy deliberately unchanged.

## 20. Normalized Events

`prod*_event/session/backfill` read-only derived projection (flag-gated), idempotent by natural
key. Not activated/changed.

## 21. Backfill

Backfill infra exists but is **NOT activated**. Activation requires an operational/architecture
decision (as established in prior phases). P3.3/P3.4 not wire-able autonomously. **BLOCKED.**

## 22. Frontend

Double-submit guards verified on all 7 listed screens. **Safe fixes applied:**
- Remove Print/Download buttons on MaterialRequest + Consumption (no backend mapping — guaranteed 500).
- MaterialRequest: Cancel hidden for SUBMITTED/REJECTED; Edit restricted to DRAFT; added REOPEN for REJECTED (committed state machine allows DRAFT/APPROVED/ISSUED cancel; SUBMITTED→only APPROVE/REJECT; REJECTED→only REOPEN).
- ProductionOrder: Cancel hidden for RELEASED/IN_PROGRESS (committed `PlanningService.cancel` requires DRAFT/SUBMITTED/APPROVED).
- JobCard: main-card action handler now busy-guarded (subjob buttons already guarded).
- Conversion: save button permission-guard added (`busy || !can('production','Edit')`).

## 23. Backend

`GlobalExceptionHandler` maps IllegalArgumentException→400, IllegalStateException→409 (workflow),
BusinessRuleException→422, OptimisticLock→409. Verified all production endpoints map via correct
handler/service.

## 24. Database

6 additive migrations audited (V1–V6). No drop/truncate/delete. `posting_idempotency_key`
uses `idempotency_key` PK (unique). Production doc tables use single-column natural-key UNIQUEs
(`entry_number`, `return_number`, `conversion_number`+`doc_no`, `log_number`, `job_card_number`,
`wo_number`+`doc_no`). **Note:** the new stub event table (`prod_operation_execution_event`) has no
unique correlation key — flagged as a known stub-phase limitation (stub is isolated; documented,
owned by Phase-2 implementation, not production-critical legacy path).

## 25. Security

Controller class-level `@RequirePermission(PRODUCTION, *, VIEW)`. No unauthorized production
action/IDOR/status-transition leak introduced. **H3 (fixed):** stub controller no longer logs the
full DTO (operator/batch/items) — logs only safe identifiers.

## 26. Concurrency

Idempotency: header-based `X-Idempotency-Key` for POST + per-status transition guards. F4 guard
ensures re-POST without a header no longer double-counts. F2 per-line keys keep multi-line OUT
idempotent. H2a/H2b fail-closed reservation/SCAR guards prevent duplicate creation on DB failure
(DB unique + transactional rollback preserved).

## 27. Performance

`rollupService` is injected but unused (dead dependency, no harm); `@Async`+`@Transactional`
composition valid. No N+1 introduced. No objective perf regression found.

## 28. Safe Fixes

| # | Finding | File(s) | Classification |
|---|---|---|---|
| F1 | Conversion output IN swallowed (shared idempotency key) | `ProductionController` (conversion post/complete) | SAFE_BUG_FIX |
| F2 | Multi-line consumption posts only first line OUT | `ProductionConsumptionService.post` | SAFE_BUG_FIX |
| F3 | Reversal did not mirror reject/rework/scrap on subjob | `ProductionController` (reverse) | SAFE_BUG_FIX |
| F4 | Re-post (no header) double-counted subjob progress | `ProductionController` (post) | SAFE_BUG_FIX |
| F5 | Auto-derived good omitted scrap → valid saves failed V-07 | `ProductionController` (create) | SAFE_BUG_FIX |
| H2 | `reservationExists` failed open → duplicate reservation on DB error | `ProductionMaterialRequestService` | SAFE_BUG_FIX |
| H2b | Quality `hasScar` failed open → duplicate SCAR on DB error | `QualityInspectionService` | SAFE_BUG_FIX |
| H3 | Stub logs full PII DTO | `ProductionEntryController` | SAFE_HARDENING |
| H4 | Job-card complete stock/status/IPQC not atomic; IPQC failures silent | `ProductionJobCardService` | SAFE_HARDENING |
| H5 | Conversion/return stock+status not single-transaction | `ProductionController` | SAFE_HARDENING |
| G | Swallowed audit/idempotency exceptions (six sites) | `ProductionController` | SAFE_HARDENING |
| K | Negative log-sheet activity duration persisted | `ProductionController` | SAFE_HARDENING |
| 1–5 | Frontend guaranteed-500 prints + show-condition mismatches | MR/Consumption/Order screens | SAFE_BUG_FIX |
| 6 | Job-card menu double-fire | `JobCardScreen` | SAFE_HARDENING |
| 7 | Conversion save permission guard | `ProductConversionScreen` | SAFE_HARDENING |

## 29. Tests

- `ProductionConsumptionServiceTest` extended (multi-line distinct-out idempotency) — green.
- `ProductionMaterialRequestServiceTest` extended (H2 fail-closed on DB error) — green.
- `QualityInspectionServiceTest` extended (H2b auto-SCAR fail-closed) — green.
- Full backend `./gradlew test` → **BUILD SUCCESSFUL** (Testcontainers integration included).
- Frontend `npm run typecheck` → **PASS**; `npm run build` → **PASS** (only pre-existing
  chunk-size warnings); `npm run lint` → 31 errors / 758 warnings (zero new in touched screens).

## 30. Remaining Blockers (business decisions — NOT resolvable autonomously)

The 14 items below are the complete decision set. See DOC_53 §1/§2 and the Human Decisions list
(§31).

## 31. Human Decisions Required

See the comprehensive decision table below (§32).

## 32. Approval Matrix

| # | Decision | Status | Source | Question | Blocked |
|---|---|---|---|---|---|
| 1 | CLAR-PROD-002 (entry allocation / WIP semantics) | NOT APPROVED | DOC_06/48/49/DECISION_REGISTER §6 | Define rejected/scrap/rework allocation contract | YES |
| 2 | CLAR-PROD-003 (return disposition) | NOT APPROVED | DOC_06/48 | Define return condition/disposition policy | YES |
| 3 | CLAR-PROD-005 (subjob↔route-op cardinality) | NOT APPROVED | DOC_06/48 | Define cardinality | YES |
| 4 | CLAR-PROD-011 (entry MHR/rate vs costing) | NOT APPROVED | DOC_06/48 | Define ownership | YES |
| 5 | CLAR-PROD-012 (quality gate enforcement) | NOT APPROVED | DOC_06/48 | Define gate override policy | YES |
| 6 | CLAR-PROD-008 (conversion costing) | NOT APPROVED | DOC_06/48/47-G14 | Define conversion costing boundary | YES |
| 7 | Batch Card | MISSING | FR-PROD-BATCH-001 (gap G12) | Define batch identity/lifecycle | YES |
| 8 | ADR-PROD-001..004 | CONTRADICTORY | DOC_17 vs DOC_18/19; register silent | HUMAN RECONCILIATION REQUIRED | YES |
| 9 | D-C1 (return disposition) | NOT APPROVED | DOC_50 §15/DOC_51 §4.11 | sign-off | YES |
| 10 | D-C2 (return disposition) | NOT APPROVED | DOC_50 §16/DOC_51 §4.12 | sign-off | YES |
| 11 | Conversion numbering (CV vs PC) | NOT APPROVED | DOC_50 §14/DOC_51 §4.9 | numbering policy sign-off | YES |

**No approval field is treated as granted.**

## 33. Capability A Gate

Capability A (Multiple-Output Production Entry) requires ADR-PROD-001 (data model),
CLAR-PROD-002 (allocation contract), event compatibility, idempotency, transaction/audit/reversal
behavior. Those business decisions are **unresolved** → gate result
**`BLOCKED_BY_BUSINESS_DECISION`**. **(NOT `READY_FOR_IMPLEMENTATION`.)**

## 34. Production Readiness

**`BLOCKED_BY_BUSINESS_DECISIONS`** — see §30/§31. The 14 decision items remain pending human
approval. No fabricated approvals exist anywhere.

## 35. Git Safety

- HEAD unchanged: `0781e1a30ca881614a7b573904caf6481adcbdc9`
- Staged: 0. Ahead 2 / behind 0.
- NO COMMIT, NO PUSH, NO RESET/CLEAN/STASH; pre-existing in-flight production work preserved.
- The Production (legacy) production controller, the Quality service, and the in-flight
  production material/consumption services were each modified only for the objectively-safe fixes
  catalogued above. No unrelated rewrite.

## 36. Recommended Next Phase

Human/business approval sessions to resolve the 14 decision items (ADR reconciliation first).
Once approvals exist, un-blocked implementation can proceed through the existing gate process
(Doc_P3.4 operational control review, Capability A). This document and the codebase are left in a
clean, human-approval-ready state.