# DOCUMENT_69 — P15 WORKFLOW GOVERNANCE REMEDIATION (F5 W1/W2/W3/W4/W6)

> **Chain:** DOCUMENT_67 (P14-R3, F5 `MEDIUM` open: WorkflowStateMachine governance) → DOCUMENT_68 (P14-R4, F5 explicitly excluded) → DOCUMENT_69 (this phase — F5 workflow-registration remediation, registration-only).
> **Mode:** The user directed "execute this all plans properly"; the only remaining decision-free engineering step in the roadmap is the F5 workflow-registration remediation. This phase implements the F5 **registration/governance** fix (W1–W4, W6) with **zero runtime behavior change** (no new `validateTransition` call sites, no inline-lifecycle edits). D-REV-01 (F3), D-NUM-01 (F4), and F14 (entry-lifecycle extraction) remain gated on business/architecture decisions and are NOT touched.
> **Final phase status:** `COMPLETED`.

## 1. Objective

Align every `WorkflowStateMachine` registration to the **real, implemented lifecycle** of the owning service (the DOCUMENT_67 §15 rule — "maps match the real intended lifecycle, not the other way round"), add the missing registrations for production documents that currently mutate status inline with **no** WSM map, and fix the ECR key mismatch — all **registration-only**: no enforced-doc transition was altered, no new enforcement call site was added, and no production/planning service was changed.

## 2. Baseline

- Git HEAD: `0781e1a30ca881614a7b573904caf6481adcbdc9` (unchanged across P14/R4 and this phase).
- Working tree: staged = 0; no git writes performed during this phase (verified `git status` before/after); no migrations, no DB changes.
- Constraint discipline (DOCUMENT_67 §15 + all phase authorizations re-affirmed): F3/D-REV-01, F4/D-NUM-01, F5 enforcement wiring, and F14 are NOT implemented; the five **enforced** doc types (`material-request`, `production-consumption`, `production-return`, `product-conversion`, `batch-card`) keep their exact original transition sets.

## 3. Approach — why registration-only is the safe remediation

`WorkflowStateMachine.validateTransition` is **call-on-demand**; today it is invoked only by the five enforced services (DOCUMENT_67 W5) and `MasterDataController.getAllowedActions` (read-only). Because no caller reads the maps for the aligned types, **changing and adding maps cannot alter runtime behavior** — it only makes the governance table truthful and makes any future `validateTransition` adoption (F14's checkpoint, per DOCUMENT_67 F14 row "W5–W6 (F5 remediation sequence)") safe. Wiring enforcement into job-card/subjob/work-order/disposition paths was deliberately **not** done: that would change runtime semantics and risk regression, which is the F14-extraction phase's job — not this one.

## 4. Findings W1–W6 — resolution status

| ID | Finding (DOCUMENT_67) | This-phase status |
|---|---|---|
| W1 | `production-entry` map dead AND inconsistent (no `POSTED`/`REVERSE`/`REJECTED`/`CANCELLED` terminals, no QC sub-states) | REMEDIATED (map mirrors `ProductionController` inline switch) |
| W2 | `job-card`, `subjob`, `work-order` registrations exist but do not match real transitions and are never enforced | REMEDIATED (maps aligned to real service switches; enforcement still delegated — documented) |
| W3 | Missing registrations: log-sheet, idle-time, rejection/scrap/rework docs, quality gate | REMEDIATED (6 new registrations added) |
| W4 | ECR registered as `ecr` while numbering key is `engineering-change` | REMEDIATED (canonical `engineering-change` registered; `ecr` realigned as identical legacy alias) |
| W5 | Five enforced doc types correctly governed | UNCHANGED (by design — no transition altered) |
| W6 | `production-entry` has neither terminal `REVERSED` nor QC sub-states → WSM adoption would reject the real lifecycle | REMEDIATED (terminal `REVERSED`/`REJECTED`/`CANCELLED` + `QUALITY_PASS`/`QUALITY_FAIL`/`QUALITY_HOLD` on active states) |

## 5. Changes — `WorkflowStateMachine.java`

Single file changed: `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/WorkflowStateMachine.java`.

### 5.1 Aligned maps (real-lifecycle mirror; registration-only)

- **`work-order`** (real source: `PlanningService.action()` switch, lines 396–502):
  added `DRAFT→APPROVE`, `DRAFT`/`SUBMITTED→CANCEL`, `REJECTED→SUBMIT`, `RELEASED`/`IN_PROCESS`/`ON_HOLD→SHORT_CLOSE`, `ON_HOLD→START`, and terminal `CANCELLED`; removed the illegal `RELEASED/IN_PROCESS/ON_HOLD→CANCEL` and `RELEASED→CLOSE` that the real code never allows.
- **`job-card`** (real source: `ProductionJobCardService.jobCardAction()`): initial state corrected from subjob-style `PENDING` to real `DRAFT` (`approve→APPROVED`); added `CANCELLED` terminal and the real hold actions (`HOLD`, `QUALITY_HOLD`, `PRODUCTION_HOLD`, `RELEASE_HOLD`, `RESUME`); `ON_HOLD→RESUME,CANCEL` (real code has no `RELEASE` from `ON_HOLD`).
- **`subjob`** (real source: `ProductionJobCardService.subjobAction()`): added `QUALITY_HOLD`/`PRODUCTION_HOLD`→`RELEASE_HOLD`, `ON_HOLD→RESUME,CANCEL`, `IN_PROGRESS→RESUME`; `COMPLETED` remains a service-level terminal (post/reverse drive it internally via `ProductionController`).
- **`production-entry`** (real source: `ProductionController` switch, lines 387–608):
  - `DRAFT→{SUBMIT,CANCEL}`, `SUBMITTED→{APPROVE,REJECT,CANCEL}`, `APPROVED→{POST}`, `POSTED→{REVERSE}`, `COMPLETED→{REVERSE}` (reverse is legal from `POSTED`/`COMPLETED` per line 481), plus QC sub-state actions on every active state.
  - Terminals: `REJECTED`, `CANCELLED`, `REVERSED` — all `∅` (the entry lifecycle has no reopen; reversal creates a new mirror entry rather than un-setting the original).

### 5.2 New registrations (additive; unknown-type pre-state was a silent no-op)

- **`production-log-sheet`** — `DRAFT→{VERIFY,CANCEL}`, `VERIFIED→{CLOSE,CANCEL}`, `CLOSED`/`CANCELLED` terminal (real source: `ProductionController.logSheetAction`, delete restricted to `DRAFT`).
- **`idle-time-entry`** — `DRAFT→{VERIFY,CANCEL}`, `VERIFIED→{CANCEL}`, `CANCELLED` terminal (`ProductionController.idleTimeAction`).
- **`rejection-document`**, **`scrap-document`**, **`rework-document`** — identical disposition lifecycles from `ProductionDispositionService.guardTransition`: `DRAFT→{SUBMIT,CANCEL}`, `SUBMITTED→{APPROVE,CANCEL}`, `APPROVED→{POST,CANCEL}`, `POSTED→{CLOSE,REVERSE}`, `CLOSED`/`REVERSED`/`CANCELLED` terminal.
- **`quality-gate-override`** — `PENDING→{QUALITY_SIGN,PRODUCTION_SIGN,PLANT_HEAD_SIGN}`, `APPROVED→{APPLY}`, `APPLIED` terminal (one-time; real source: `ProductionQualityGateService` + `ProductionGateOverride` constants). No numbering key exists for this doc, so key matches the abstraction, not a numbering key.

### 5.3 ECR key alignment (W4)

- Canonical registration **`engineering-change`** added (matches the numbering key used at `PlanningMasterController:530` and the frame `engineering-change` in `ScreenSeedService`), reflecting the real lifecycle actions `submit-ecr`, `approve-ecr`, `reject-ecr`, `implement`, `close` (`PlanningMasterController.engineeringChangeAction`, lines 557–607):
  `DRAFT→{SUBMIT_ECR}`, `SUBMITTED→{APPROVE_ECR,REJECT_ECR,APPROVE,REJECT}`, `APPROVED→{IMPLEMENT}`, `IMPLEMENTED→{CLOSE}`, `REJECTED`/`CLOSED` terminal.
- Legacy **`ecr`** realigned to the identical lifecycle (retained as an alias; no consumer removal — additive).

### 5.4 Intentionally unchanged

The five enforced doc types — `material-request`, `production-consumption`, `production-return`, `product-conversion`, `batch-card` — and `dispatch-plan` (consistent with its owning flow, unused by any enforcer per W4) keep their exact original transition sets. No `validateTransition` caller was added or removed; the inline switches in `ProductionController`, `ProductionJobCardService`, `ProductionDispositionService`, `PlanningService`, `PlanningMasterController`, and `ProductionQualityGateService` were not modified.

## 6. Tests

- `WorkflowStateMachineTest.java` extended (6 → 16 tests):
  - `production-entry`: full submit/approve/post/reverse/reject/cancel + QC sub-states + terminal `REVERSED`/`REJECTED`/`CANCELLED` (W1/W6).
  - `work-order`, `job-card`, `subjob`: aligned-lifecycle assertions incl. negative cases that the old map got wrong (`RELEASED→CANCEL` false, `ON_HOLD→RELEASE` false, `COMPLETED→CANCEL` false) (W2).
  - `production-log-sheet`, `idle-time-entry`, `rejection/scrap/rework-document`, `quality-gate-override`: new-registration coverage (W3).
  - `engineering-change` + `ecr`: identical lifecycle + canonical/alias equivalence (W4).
  - **`EnforcedTypesUnchanged`**: regression guard that the five enforced doc types still allow their exact original transitions — proving **no behavior change** (W5).
- Full backend suite: `./gradlew test` → **BUILD SUCCESSFUL**, 86 test classes, **481 tests, 0 failures, 0 errors, 0 skipped** (up from 467 via the 10 new WSM tests; P14-R4 IT additions included).
- Frontend: `npm run typecheck` clean; `npm run build` success (no frontend artifact change — kanban action config is local to `JobCardKanban.tsx`, verified to not consume `getAllowedActions`).

## 7. Effects and risk

- **Runtime behavior:** none. `validateTransition` is call-on-demand and this phase added no call sites; the aligned/new maps are read only by the read-only `getAllowedActions` endpoint (frontend does not consume it for these types — verified `JobCardKanban.tsx` uses a hardcoded local config).
- **Governance:** the WSM table now documents the truth, so the future F14 extraction (which will integrate `validateTransition`) will not reject the real lifecycle (the W6 blocker).
- **DB/schema/migrations:** none. **Secrets/keys:** none.
- **Git:** no writes performed; HEAD unchanged; staged = 0.

## 8. Remaining status (unchanged gates)

| Item | Status | Blocker |
|---|---|---|
| F3 / D-REV-01 | BUSINESS_DECISION_REQUIRED | business choice A/B/C (DOCUMENT_66 §34/§35, DOCUMENT_64 F3) — gates compensation of job-card-complete `FG_RECEIPT`; not implemented |
| F4 / D-NUM-01 | BUSINESS_DECISION_REQUIRED | business choice on JCF/PLS/ITE/FY-format numbering migration (DOCUMENT_64 F4); not implemented |
| F5 enforcement wiring | OPEN (registrations remediated) | depends on D-REV-01/F3; F14 owns `validateTransition` integration |
| F14 entry-lifecycle extraction | BLOCKED | F5/F3 coupled (DOCUMENT_67 F14 row) |
| F15 / maintenance | EXTERNAL | Ownership outside Production (DOCUMENT_67) |

## 9. Next authorized step

The roadmap's decision-free engineering work is now exhausted. Per the phase discipline that every phase requires explicit authorization and STOP gates, the **next single action is a human decision**: choose **D-REV-01 Option A/B/C** in the register so F3 (compensation semantics) can be implemented, which in turn unblocks F5 enforcement wiring and F14 extraction under a new phase authorization.

## 10. Change manifest

- `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/WorkflowStateMachine.java` — maps realigned (work-order, job-card, subjob, production-entry), 6 registrations added (production-log-sheet, idle-time-entry, rejection-document, scrap-document, rework-document, quality-gate-override), canonical `engineering-change` added + `ecr` realigned.
- `zyger-erp-backend/src/test/java/in/zygertechnology/zygererp/service/WorkflowStateMachineTest.java` — extended 6 → 16 tests.

## 11. Verification evidence

- `./gradlew test --tests "...WorkflowStateMachineTest"` → BUILD SUCCESSFUL.
- `./gradlew test` (full suite) → BUILD SUCCESSFUL; 481 tests / 0 failures / 0 errors / 0 skipped.
- `npm run typecheck` → clean; `npm run build` → success.
- `git rev-parse HEAD` → `0781e1a30ca881614a7b573904caf6481adcbdc9`; `git status` staged = 0.

## 12. Sign-off

Reviewed and accepted — P15 workflow-governance remediation `COMPLETED`. The remainder of the Production roadmap is decision-gated (D-REV-01, D-NUM-01) and awaits business owner direction.